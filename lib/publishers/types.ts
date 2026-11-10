export type PublishInput = {
  postId: string;
  text: string;
  scheduledAt: string | null;
  accountLabel: string;
};

export type PublishResult = { url: string | null };

export type Publisher = {
  /** Checks the credentials work and returns the account's display handle. */
  verify(credentials: Record<string, string>): Promise<{ handle: string }>;
  publish(credentials: Record<string, string>, input: PublishInput): Promise<PublishResult>;
};

/**
 * Validates a user-supplied endpoint before the server fetches it: https only, and no
 * loopback or private-network hosts unless ALLOW_PRIVATE_HOSTS=1 (for self-hosted targets).
 */
export function safeUrl(raw: string, what: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`${what} is not a valid URL.`);
  }
  if (process.env.ALLOW_PRIVATE_HOSTS === "1") return url;
  if (url.protocol !== "https:") throw new Error(`${what} must start with https://`);
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host === "::1" ||
    /^(fc|fd|fe80)/.test(host);
  if (isPrivate) throw new Error(`${what} points at a private network address.`);
  return url;
}

export async function fetchJson(url: URL | string, init: RequestInit, what: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(20_000) });
  } catch (err) {
    throw new Error(`${what}: could not reach the server (${err instanceof Error ? err.message : "network error"}).`);
  }
  const body = await res.text();
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${body.slice(0, 200)}`.trim());
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}
