// Starts the in-process publisher when the server boots (`next dev` / `next start`).
// On serverless hosts there is no long-lived process: call GET /api/cron on a schedule instead.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.ASY_DISABLE_SCHEDULER === "1") return;
  const { publishDue } = await import("./lib/scheduler");
  const tick = () => publishDue().catch((err) => console.error("[asy] scheduler run failed:", err));
  const timer = setInterval(tick, 30_000);
  timer.unref();
  tick();
}
