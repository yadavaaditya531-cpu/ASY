import type { PlatformId } from "../platforms";
import { bluesky } from "./bluesky";
import { mastodon } from "./mastodon";
import { sandbox } from "./sandbox";
import type { Publisher } from "./types";
import { webhook } from "./webhook";

export const PUBLISHERS: Record<PlatformId, Publisher> = { sandbox, bluesky, mastodon, webhook };
