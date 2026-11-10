# ASY

Social media automation for businesses: write (or let AI write) your posts, put them on a
schedule, and ASY publishes them to your accounts at the right time.

## What it does

- **Compose & schedule** – write a post once, pick the accounts, pick a time. Character limits
  are enforced per network.
- **Auto-publishing** – a background scheduler publishes due posts, records the result per
  account, and lets you retry anything that failed.
- **AI drafting** – describe what you want to say and Claude writes the post in your brand's voice.
- **AI campaigns** – give one brief and get up to 14 posts spread over the calendar. They land in
  **Drafts**; nothing goes out until you approve it.
- **Brand profile** – business, audience and voice, used for every AI draft.

### Supported accounts

| Account | How it connects |
| --- | --- |
| Demo (sandbox) | Nothing to set up. Runs the whole flow without sending anything. |
| Bluesky | Handle + app password |
| Mastodon | Instance URL + access token (`write:statuses`) |
| Webhook | Any HTTPS URL. Receives `{ id, text, scheduledAt, account }` as JSON, optionally HMAC-signed (`X-ASY-Signature`). Use it with Zapier / Make / n8n to reach Instagram, Facebook, LinkedIn, X, TikTok, etc. |

Direct Instagram / Facebook / LinkedIn / X connections need an approved developer app with each
network and are not built in yet; the webhook covers them in the meantime. New networks are added
by implementing the `Publisher` interface in `lib/publishers/`.

## Run it

Requires Node.js 22.13+.

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for the AI features
npm run dev                  # http://localhost:3000
```

For real use: `npm run build && npm start`, with `APP_PASSWORD` and `APP_SECRET` set.

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables AI drafting and campaigns |
| `APP_PASSWORD` | Password required to open the app. Set it whenever others can reach the server. |
| `APP_SECRET` | Key for encrypting stored account credentials (auto-generated in `data/` if unset) |
| `CRON_SECRET` | Bearer token for `GET /api/cron` |
| `DATA_DIR` | Location of the SQLite database (default `./data`) |

## How it works

- Next.js (App Router) + Tailwind, server actions in `app/actions.ts`.
- Data lives in a SQLite file (`data/asy.db`) via Node's built-in `node:sqlite`. Account
  credentials are encrypted with AES-256-GCM.
- `instrumentation.ts` starts a 30-second timer that calls `publishDue()` in `lib/scheduler.ts`.
  Posts are claimed atomically, so each one is published once even if several triggers overlap.
  If the process dies mid-publish, the unfinished accounts are marked failed rather than re-sent
  blindly.
- **Hosting:** the app needs a long-running Node process and a persistent disk (a VPS, Fly.io,
  Railway, Docker…). On serverless platforms the timer does not run and the disk is not
  persistent: you would need to move storage to a hosted database and call `/api/cron` every minute.

## Not built yet

Images and video, per-network text variants, analytics, multiple users / teams, and direct
connections to the networks listed above.
