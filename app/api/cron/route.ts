import { timingSafeEqual } from "node:crypto";
import { publishDue } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// Publishes due posts. For hosts without a long-lived process: have a cron job call this
// every minute with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ published: await publishDue() });
}
