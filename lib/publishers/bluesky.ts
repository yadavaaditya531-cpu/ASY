import { fetchJson, safeUrl, type Publisher } from "./types";

type Session = { accessJwt: string; did: string; handle: string };

async function login(credentials: Record<string, string>): Promise<{ service: URL; session: Session }> {
  const service = safeUrl(credentials.service || "https://bsky.social", "PDS URL");
  const session = (await fetchJson(
    new URL("/xrpc/com.atproto.server.createSession", service),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: credentials.identifier.replace(/^@/, ""), password: credentials.password }),
    },
    "Bluesky sign-in",
  )) as Session;
  if (!session.accessJwt || !session.did) throw new Error("Bluesky sign-in returned no session.");
  return { service, session };
}

/** Link facets make URLs clickable; offsets are in UTF-8 bytes, as the protocol requires. */
function linkFacets(text: string) {
  const bytes = (s: string) => Buffer.byteLength(s, "utf8");
  const facets = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"]+/g)) {
    const uri = match[0].replace(/[.,;:!?)\]]+$/, "");
    const byteStart = bytes(text.slice(0, match.index));
    facets.push({
      index: { byteStart, byteEnd: byteStart + bytes(uri) },
      features: [{ $type: "app.bsky.richtext.facet#link", uri }],
    });
  }
  return facets;
}

export const bluesky: Publisher = {
  async verify(credentials) {
    const { session } = await login(credentials);
    return { handle: `@${session.handle}` };
  },
  async publish(credentials, input) {
    const { service, session } = await login(credentials);
    const facets = linkFacets(input.text);
    const created = (await fetchJson(
      new URL("/xrpc/com.atproto.repo.createRecord", service),
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.accessJwt}` },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text: input.text,
            createdAt: new Date().toISOString(),
            ...(facets.length ? { facets } : {}),
          },
        }),
      },
      "Bluesky post",
    )) as { uri?: string };
    const rkey = created.uri?.split("/").pop();
    return { url: rkey ? `https://bsky.app/profile/${session.handle}/post/${rkey}` : null };
  },
};
