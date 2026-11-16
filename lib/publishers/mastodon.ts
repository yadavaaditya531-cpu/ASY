import { fetchJson, safeUrl, type Publisher } from "./types";

export const mastodon: Publisher = {
  async verify(credentials) {
    const instance = safeUrl(credentials.instance, "Instance URL");
    const me = (await fetchJson(
      new URL("/api/v1/accounts/verify_credentials", instance),
      { headers: { authorization: `Bearer ${credentials.token}` } },
      "Mastodon sign-in",
    )) as { username?: string };
    if (!me.username) throw new Error("Mastodon did not return an account for this token.");
    return { handle: `@${me.username}@${instance.host}` };
  },
  async publish(credentials, input) {
    const instance = safeUrl(credentials.instance, "Instance URL");
    const status = (await fetchJson(
      new URL("/api/v1/statuses", instance),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${credentials.token}`,
          // Mastodon de-duplicates on this key, so a retried request cannot double-post.
          "idempotency-key": `asy-${input.postId}`,
        },
        body: JSON.stringify({ status: input.text }),
      },
      "Mastodon post",
    )) as { url?: string };
    return { url: status.url ?? null };
  },
};
