import { createHmac } from "node:crypto";
import { fetchJson, safeUrl, type Publisher } from "./types";

export const webhook: Publisher = {
  async verify(credentials) {
    return { handle: safeUrl(credentials.url, "Webhook URL").host };
  },
  async publish(credentials, input) {
    const url = safeUrl(credentials.url, "Webhook URL");
    const body = JSON.stringify({
      id: input.postId,
      text: input.text,
      scheduledAt: input.scheduledAt,
      account: input.accountLabel,
    });
    const headers: Record<string, string> = { "content-type": "application/json", "x-asy-post-id": input.postId };
    if (credentials.secret) {
      headers["x-asy-signature"] = createHmac("sha256", credentials.secret).update(body).digest("hex");
    }
    const reply = (await fetchJson(url, { method: "POST", headers, body }, "Webhook")) as { url?: unknown };
    return { url: typeof reply.url === "string" && /^https?:\/\//.test(reply.url) ? reply.url : null };
  },
};
