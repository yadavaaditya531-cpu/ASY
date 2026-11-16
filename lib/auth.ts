// Optional single-password gate. Set APP_PASSWORD to require sign-in; leave it unset for
// local, single-user use. Uses Web Crypto only so it can run inside proxy.ts.

export const SESSION_COOKIE = "asy_session";

/** The cookie value a signed-in browser holds, or null when no password is configured. */
export async function sessionToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  const data = new TextEncoder().encode(`asy-session:${password}:${process.env.APP_SECRET ?? ""}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
