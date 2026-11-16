import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PlatformId } from "./platforms";

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "partial" | "failed";
export type TargetStatus = "pending" | "published" | "failed";

export type Account = {
  id: string;
  platform: PlatformId;
  label: string;
  handle: string;
  createdAt: string;
};

export type Target = {
  id: string;
  accountId: string;
  platform: PlatformId;
  accountLabel: string;
  status: TargetStatus;
  externalUrl: string | null;
  error: string | null;
  publishedAt: string | null;
};

export type Post = {
  id: string;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  createdAt: string;
  campaign: string | null;
  targets: Target[];
};

export type Brand = { name: string; description: string; audience: string; tone: string };

export function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

const globalForDb = globalThis as unknown as { __asyDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (globalForDb.__asyDb) return globalForDb.__asyDb;
  mkdirSync(dataDir(), { recursive: true });
  const conn = new DatabaseSync(path.join(dataDir(), "asy.db"));
  conn.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      label TEXT NOT NULL,
      handle TEXT NOT NULL,
      credentials TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      scheduled_at TEXT,
      claimed_at TEXT,
      campaign TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS posts_due ON posts (status, scheduled_at);
    CREATE TABLE IF NOT EXISTS post_targets (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      external_url TEXT,
      error TEXT,
      published_at TEXT,
      UNIQUE (post_id, account_id)
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  globalForDb.__asyDb = conn;
  return conn;
}

type Row = Record<string, string | null>;

/** Runs fn inside a transaction, rolling back if it throws. */
export function transaction<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}

// ---- accounts ----

const toAccount = (r: Row): Account => ({
  id: r.id!,
  platform: r.platform as PlatformId,
  label: r.label!,
  handle: r.handle!,
  createdAt: r.created_at!,
});

export function listAccounts(): Account[] {
  return (db().prepare("SELECT * FROM accounts ORDER BY created_at").all() as Row[]).map(toAccount);
}

export function getAccountCredentials(id: string): string | null {
  const row = db().prepare("SELECT credentials FROM accounts WHERE id = ?").get(id) as Row | undefined;
  return row?.credentials ?? null;
}

export function insertAccount(a: { platform: PlatformId; label: string; handle: string; credentials: string }): string {
  const id = randomUUID();
  db()
    .prepare("INSERT INTO accounts (id, platform, label, handle, credentials, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, a.platform, a.label, a.handle, a.credentials, new Date().toISOString());
  return id;
}

export function deleteAccount(id: string): void {
  db().prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

// ---- posts ----

function attachTargets(rows: Row[]): Post[] {
  if (!rows.length) return [];
  const marks = rows.map(() => "?").join(",");
  const targets = db()
    .prepare(
      `SELECT t.*, a.platform, a.label FROM post_targets t JOIN accounts a ON a.id = t.account_id
       WHERE t.post_id IN (${marks}) ORDER BY a.created_at`,
    )
    .all(...rows.map((r) => r.id)) as Row[];
  const byPost = new Map<string, Target[]>();
  for (const t of targets) {
    const list = byPost.get(t.post_id!) ?? [];
    list.push({
      id: t.id!,
      accountId: t.account_id!,
      platform: t.platform as PlatformId,
      accountLabel: t.label!,
      status: t.status as TargetStatus,
      externalUrl: t.external_url,
      error: t.error,
      publishedAt: t.published_at,
    });
    byPost.set(t.post_id!, list);
  }
  return rows.map((r) => ({
    id: r.id!,
    content: r.content!,
    status: r.status as PostStatus,
    scheduledAt: r.scheduled_at,
    createdAt: r.created_at!,
    campaign: r.campaign,
    targets: byPost.get(r.id!) ?? [],
  }));
}

export function listPosts(opts: { statuses?: PostStatus[]; limit?: number; order?: "upcoming" | "recent" } = {}): Post[] {
  const where = opts.statuses?.length ? `WHERE status IN (${opts.statuses.map(() => "?").join(",")})` : "";
  const order =
    opts.order === "upcoming" ? "scheduled_at IS NULL, scheduled_at ASC" : "COALESCE(scheduled_at, created_at) DESC";
  const rows = db()
    .prepare(`SELECT * FROM posts ${where} ORDER BY ${order} LIMIT ?`)
    .all(...(opts.statuses ?? []), opts.limit ?? 200) as Row[];
  return attachTargets(rows);
}

export function getPost(id: string): Post | null {
  const row = db().prepare("SELECT * FROM posts WHERE id = ?").get(id) as Row | undefined;
  return row ? attachTargets([row])[0] : null;
}

export function countPostsByStatus(): Record<PostStatus, number> {
  const counts: Record<PostStatus, number> = { draft: 0, scheduled: 0, publishing: 0, published: 0, partial: 0, failed: 0 };
  for (const r of db().prepare("SELECT status, COUNT(*) AS n FROM posts GROUP BY status").all() as Record<string, unknown>[]) {
    counts[r.status as PostStatus] = Number(r.n);
  }
  return counts;
}

export type PostInput = {
  content: string;
  status: "draft" | "scheduled";
  scheduledAt: string | null;
  accountIds: string[];
  campaign?: string | null;
};

function setTargets(postId: string, accountIds: string[]): void {
  const conn = db();
  conn.prepare("DELETE FROM post_targets WHERE post_id = ?").run(postId);
  const insert = conn.prepare("INSERT INTO post_targets (id, post_id, account_id) VALUES (?, ?, ?)");
  for (const accountId of new Set(accountIds)) insert.run(randomUUID(), postId, accountId);
}

export function createPost(input: PostInput): string {
  return transaction(() => {
    const id = randomUUID();
    db()
      .prepare("INSERT INTO posts (id, content, status, scheduled_at, campaign, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, input.content, input.status, input.scheduledAt, input.campaign ?? null, new Date().toISOString());
    setTargets(id, input.accountIds);
    return id;
  });
}

/** Updates a post that has not started publishing. Returns false if it no longer can be edited. */
export function updatePost(id: string, input: PostInput): boolean {
  return transaction(() => {
    const res = db()
      .prepare(
        "UPDATE posts SET content = ?, status = ?, scheduled_at = ? WHERE id = ? AND status IN ('draft', 'scheduled')",
      )
      .run(input.content, input.status, input.scheduledAt, id);
    if (!res.changes) return false;
    setTargets(id, input.accountIds);
    return true;
  });
}

export function setPostStatus(id: string, status: PostStatus, from: PostStatus[], scheduledAt?: string | null): boolean {
  const marks = from.map(() => "?").join(",");
  const res =
    scheduledAt === undefined
      ? db().prepare(`UPDATE posts SET status = ? WHERE id = ? AND status IN (${marks})`).run(status, id, ...from)
      : db()
          .prepare(`UPDATE posts SET status = ?, scheduled_at = ? WHERE id = ? AND status IN (${marks})`)
          .run(status, scheduledAt, id, ...from);
  return Number(res.changes) > 0;
}

export function deletePost(id: string): void {
  db().prepare("DELETE FROM posts WHERE id = ? AND status != 'publishing'").run(id);
}

// ---- settings ----

const EMPTY_BRAND: Brand = { name: "", description: "", audience: "", tone: "" };

export function getBrand(): Brand {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'brand'").get() as Row | undefined;
  return row?.value ? { ...EMPTY_BRAND, ...(JSON.parse(row.value) as Partial<Brand>) } : EMPTY_BRAND;
}

export function saveBrand(brand: Brand): void {
  db()
    .prepare("INSERT INTO settings (key, value) VALUES ('brand', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify(brand));
}
