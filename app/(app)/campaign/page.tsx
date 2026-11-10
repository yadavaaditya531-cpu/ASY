import { CampaignForm } from "@/components/CampaignForm";
import { aiConfigured } from "@/lib/ai";
import { listAccounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function CampaignPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI campaign</h1>
        <p className="mt-1 text-sm text-slate-600">
          Describe what you want to promote and get a run of ready-to-review posts spread across the calendar.
        </p>
      </div>
      {!aiConfigured() && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          AI drafting needs an Anthropic API key. Set <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> and
          restart the server.
        </p>
      )}
      <CampaignForm accounts={listAccounts()} />
    </div>
  );
}
