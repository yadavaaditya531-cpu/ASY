import { decryptJson } from "./crypto";
import { db, getAccountCredentials, getPost, type PostStatus } from "./db";
import { PUBLISHERS } from "./publishers";

const STALE_AFTER_MS = 10 * 60_000;

const state = globalThis as unknown as { __asyPublishing?: Promise<number> };

/**
 * Publishes every scheduled post whose time has come. Safe to call from several places
 * (the in-process timer, the cron endpoint, "post now"): posts are claimed atomically,
 * so each one is picked up exactly once.
 */
export function publishDue(): Promise<number> {
  // Within one process, callers share a single run, then go again to catch anything queued meanwhile.
  const run = (state.__asyPublishing ?? Promise.resolve(0)).catch(() => 0).then(runOnce);
  state.__asyPublishing = run;
  return run;
}

async function runOnce(): Promise<number> {
  const conn = db();
  const now = new Date();

  // A post left in "publishing" means the process died mid-run. We cannot know whether the
  // network received it, so mark the unfinished targets failed and let a person decide to retry.
  const stale = conn
    .prepare("SELECT id FROM posts WHERE status = 'publishing' AND claimed_at < ?")
    .all(new Date(now.getTime() - STALE_AFTER_MS).toISOString()) as { id: string }[];
  for (const { id } of stale) {
    conn
      .prepare("UPDATE post_targets SET status = 'failed', error = ? WHERE post_id = ? AND status = 'pending'")
      .run("Publishing was interrupted. Check the account before retrying.", id);
    finalize(id);
  }

  const claimed = conn
    .prepare(
      "UPDATE posts SET status = 'publishing', claimed_at = ? WHERE status = 'scheduled' AND scheduled_at <= ? RETURNING id",
    )
    .all(now.toISOString(), now.toISOString()) as { id: string }[];

  for (const { id } of claimed) await publishPost(id);
  return claimed.length;
}

async function publishPost(postId: string): Promise<void> {
  const post = getPost(postId);
  if (!post) return;
  const conn = db();
  await Promise.all(
    post.targets
      .filter((t) => t.status === "pending")
      .map(async (target) => {
        try {
          const encrypted = getAccountCredentials(target.accountId);
          if (!encrypted) throw new Error("Account was disconnected.");
          const result = await PUBLISHERS[target.platform].publish(decryptJson(encrypted), {
            postId: post.id,
            text: post.content,
            scheduledAt: post.scheduledAt,
            accountLabel: target.accountLabel,
          });
          conn
            .prepare("UPDATE post_targets SET status = 'published', external_url = ?, error = NULL, published_at = ? WHERE id = ?")
            .run(result.url, new Date().toISOString(), target.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          conn.prepare("UPDATE post_targets SET status = 'failed', error = ? WHERE id = ?").run(message.slice(0, 500), target.id);
        }
      }),
  );
  finalize(postId);
}

function finalize(postId: string): void {
  const targets = getPost(postId)?.targets ?? [];
  const ok = targets.filter((t) => t.status === "published").length;
  const status: PostStatus = ok === 0 ? "failed" : ok === targets.length ? "published" : "partial";
  db().prepare("UPDATE posts SET status = ? WHERE id = ? AND status = 'publishing'").run(status, postId);
}

/** Re-queues the failed targets of a post for immediate publishing. */
export function requeueFailed(postId: string): boolean {
  const conn = db();
  const res = conn
    .prepare("UPDATE posts SET status = 'scheduled', scheduled_at = ? WHERE id = ? AND status IN ('failed', 'partial')")
    .run(new Date().toISOString(), postId);
  if (!res.changes) return false;
  conn.prepare("UPDATE post_targets SET status = 'pending', error = NULL WHERE post_id = ? AND status = 'failed'").run(postId);
  return true;
}
