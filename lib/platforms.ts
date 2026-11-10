// Platform metadata. Safe to import from client components (no secrets, no node APIs).

export type PlatformId = "sandbox" | "bluesky" | "mastodon" | "webhook";

export type CredentialField = {
  name: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  help?: string;
  optional?: boolean;
};

export type PlatformInfo = {
  id: PlatformId;
  name: string;
  /** Max characters per post, or null when the platform has no fixed limit. */
  charLimit: number | null;
  blurb: string;
  color: string;
  fields: CredentialField[];
};

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  sandbox: {
    id: "sandbox",
    name: "Demo (sandbox)",
    charLimit: null,
    blurb:
      "A pretend account. Posts go through the full schedule → publish flow but are never sent anywhere. Use it to try the app.",
    color: "#64748b",
    fields: [],
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    charLimit: 300,
    blurb: "Publishes with an app password (Settings → Privacy and security → App passwords).",
    color: "#0a7aff",
    fields: [
      { name: "identifier", label: "Handle", type: "text", placeholder: "yourbrand.bsky.social" },
      { name: "password", label: "App password", type: "password", placeholder: "xxxx-xxxx-xxxx-xxxx" },
      {
        name: "service",
        label: "PDS URL",
        type: "url",
        placeholder: "https://bsky.social",
        help: "Leave empty unless you self-host.",
        optional: true,
      },
    ],
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    charLimit: 500,
    blurb:
      "Publishes with an access token (Preferences → Development → New application, with the write:statuses scope).",
    color: "#6364ff",
    fields: [
      { name: "instance", label: "Instance URL", type: "url", placeholder: "https://mastodon.social" },
      { name: "token", label: "Access token", type: "password" },
    ],
  },
  webhook: {
    id: "webhook",
    name: "Webhook",
    charLimit: null,
    blurb:
      "POSTs each post as JSON to a URL you choose. Point it at Zapier, Make, n8n or your own service to reach networks like Instagram, Facebook, LinkedIn, X or TikTok.",
    color: "#d97706",
    fields: [
      { name: "url", label: "Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/..." },
      {
        name: "secret",
        label: "Signing secret",
        type: "password",
        help: "If set, requests carry an X-ASY-Signature header (HMAC-SHA256 of the body).",
        optional: true,
      },
    ],
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export function isPlatformId(value: string): value is PlatformId {
  return value in PLATFORMS;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Counts user-perceived characters, which is how the networks count. */
export function countChars(text: string): number {
  return Array.from(segmenter.segment(text)).length;
}

/** Tightest character limit across a set of platforms (null = unlimited). */
export function tightestLimit(platforms: PlatformId[]): number | null {
  const limits = platforms.map((p) => PLATFORMS[p].charLimit).filter((l): l is number => l !== null);
  return limits.length ? Math.min(...limits) : null;
}
