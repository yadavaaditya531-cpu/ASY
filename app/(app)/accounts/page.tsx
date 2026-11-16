import { disconnectAccount } from "@/app/actions";
import { AccountForm } from "@/components/AccountForm";
import { LocalTime, SubmitButton } from "@/components/ui";
import { listAccounts } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const accounts = listAccounts();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>

      {accounts.length > 0 && (
        <ul className="card divide-y divide-slate-100 !py-1">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="size-2.5 rounded-full" style={{ background: PLATFORMS[account.platform].color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{account.label}</div>
                <div className="truncate text-sm text-slate-500">
                  {PLATFORMS[account.platform].name} · {account.handle} · added{" "}
                  <LocalTime iso={account.createdAt} dateOnly />
                </div>
              </div>
              <form action={disconnectAccount.bind(null, account.id)}>
                <SubmitButton className="btn btn-danger btn-sm" pendingText="Removing…">
                  Disconnect
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <AccountForm />
      <p className="text-xs text-slate-500">
        Credentials are encrypted before they are stored and are only used to publish your posts. Disconnecting an
        account also removes it from posts that have not gone out yet.
      </p>
    </div>
  );
}
