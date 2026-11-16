"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { draftPosts } from "@/lib/ai";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { encryptJson } from "@/lib/crypto";
import * as store from "@/lib/db";
import { countChars, isPlatformId, PLATFORMS, tightestLimit, type PlatformId } from "@/lib/platforms";
import { PUBLISHERS } from "@/lib/publishers";
import { publishDue, requeueFailed } from "@/lib/scheduler";

export type FormState = { error?: string; ok?: string };

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

function platformsOf(accountIds: string[]): PlatformId[] {
  const accounts = store.listAccounts();
  return accountIds.flatMap((id) => accounts.find((a) => a.id === id)?.platform ?? []);
}

function parseTime(value: string): string | null {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/** Why a post cannot go out as-is, or null if it can. */
function publishBlocker(content: string, accountIds: string[]): string | null {
  const platforms = platformsOf(accountIds);
  if (!platforms.length) return "Choose at least one account to publish to.";
  const limit = tightestLimit(platforms);
  const length = countChars(content);
  if (limit !== null && length > limit) {
    return `This post is ${length} characters; the limit for the selected accounts is ${limit}.`;
  }
  return null;
}

// ---- sign-in ----

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const expected = await sessionToken();
  if (expected) {
    if (String(form.get("password") ?? "") !== process.env.APP_PASSWORD) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return { error: "Wrong password." };
    }
    (await cookies()).set(SESSION_COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---- accounts ----

export async function connectAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const platform = text(form, "platform");
  if (!isPlatformId(platform)) return { error: "Unknown platform." };
  const info = PLATFORMS[platform];
  const credentials: Record<string, string> = {};
  for (const field of info.fields) {
    const value = text(form, field.name);
    if (!value && !field.optional) return { error: `${field.label} is required.` };
    credentials[field.name] = value;
  }
  let handle: string;
  try {
    ({ handle } = await PUBLISHERS[platform].verify(credentials));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not verify this account." };
  }
  store.insertAccount({
    platform,
    label: text(form, "label") || (platform === "sandbox" ? "Demo account" : `${info.name} ${handle}`),
    handle,
    credentials: encryptJson(credentials),
  });
  revalidatePath("/", "layout");
  return { ok: `Connected ${handle}.` };
}

export async function disconnectAccount(id: string): Promise<void> {
  store.deleteAccount(id);
  revalidatePath("/", "layout");
}

// ---- posts ----

export async function savePost(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const content = text(form, "content");
  const intent = text(form, "intent");
  const accountIds = form.getAll("accountIds").map(String);
  if (!content) return { error: "Write something first." };

  let status: "draft" | "scheduled" = "draft";
  let scheduledAt = parseTime(text(form, "scheduledAt"));
  if (intent === "schedule" || intent === "now") {
    const blocker = publishBlocker(content, accountIds);
    if (blocker) return { error: blocker };
    if (intent === "now") scheduledAt = new Date().toISOString();
    else if (!scheduledAt) return { error: "Pick a date and time." };
    else if (new Date(scheduledAt).getTime() < Date.now() - 60_000) return { error: "That time is in the past." };
    status = "scheduled";
  }

  const input = { content, status, scheduledAt, accountIds };
  if (id) {
    if (!store.updatePost(id, input)) return { error: "This post has already been published and can no longer be edited." };
  } else {
    store.createPost(input);
  }
  if (intent === "now") await publishDue();
  revalidatePath("/", "layout");
  redirect(intent === "now" ? "/posts" : `/posts?status=${status}`);
}

function back(error?: string): never {
  revalidatePath("/", "layout");
  redirect(error ? `/posts?error=${encodeURIComponent(error)}` : "/posts");
}

/** Moves a reviewed draft into the publishing queue. */
export async function approvePost(id: string): Promise<void> {
  const post = store.getPost(id);
  if (!post || post.status !== "draft") back("That post is no longer a draft.");
  if (!post.scheduledAt) back("Open the draft and pick a time first.");
  const blocker = publishBlocker(post.content, post.targets.map((t) => t.accountId));
  if (blocker) back(blocker);
  store.setPostStatus(id, "scheduled", ["draft"]);
  if (new Date(post.scheduledAt).getTime() <= Date.now()) await publishDue();
  back();
}

export async function unschedulePost(id: string): Promise<void> {
  store.setPostStatus(id, "draft", ["scheduled"]);
  back();
}

export async function retryPost(id: string): Promise<void> {
  if (requeueFailed(id)) await publishDue();
  back();
}

export async function removePost(id: string): Promise<void> {
  store.deletePost(id);
  back();
}

// ---- brand + AI ----

export async function saveBrand(_prev: FormState, form: FormData): Promise<FormState> {
  store.saveBrand({
    name: text(form, "name"),
    description: text(form, "description"),
    audience: text(form, "audience"),
    tone: text(form, "tone"),
  });
  revalidatePath("/settings");
  return { ok: "Saved." };
}

function draftRequest(brief: string, accountIds: string[], count: number) {
  const platforms = [...new Set(platformsOf(accountIds))].filter((p) => p !== "sandbox");
  return {
    brand: store.getBrand(),
    brief,
    count,
    maxChars: tightestLimit(platformsOf(accountIds)),
    networks: platforms.map((p) => PLATFORMS[p].name),
  };
}

/** Composer helper: one AI-written draft for the text box. */
export async function suggestPost(brief: string, accountIds: string[]): Promise<{ text?: string; error?: string }> {
  if (!brief.trim()) return { error: "Describe what the post should be about." };
  try {
    const [first] = await draftPosts(draftRequest(brief.trim().slice(0, 2000), accountIds, 1));
    return { text: first };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI drafting failed." };
  }
}

/** Writes a batch of posts for a brief and saves them as drafts on the given time slots. */
export async function createCampaign(_prev: FormState, form: FormData): Promise<FormState> {
  const brief = text(form, "brief").slice(0, 2000);
  const accountIds = form.getAll("accountIds").map(String);
  let slots: string[] = [];
  try {
    slots = (JSON.parse(text(form, "slots")) as string[]).flatMap((s) => parseTime(s) ?? []);
  } catch {}
  if (!brief) return { error: "Describe the campaign." };
  if (!platformsOf(accountIds).length) return { error: "Choose at least one account." };
  if (!slots.length || slots.length > 14) return { error: "Choose between 1 and 14 posts and a start date." };
  if (new Date(slots[0]).getTime() < Date.now()) return { error: "The first post is in the past. Pick a later start." };

  let posts: string[];
  try {
    posts = await draftPosts(draftRequest(brief, accountIds, slots.length));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI drafting failed." };
  }
  const campaign = brief.length > 60 ? `${brief.slice(0, 57)}…` : brief;
  posts.forEach((content, i) =>
    store.createPost({ content, status: "draft", scheduledAt: slots[i], accountIds, campaign }),
  );
  revalidatePath("/", "layout");
  redirect("/posts?status=draft");
}
