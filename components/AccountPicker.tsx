"use client";

import Link from "next/link";
import type { Account } from "@/lib/db";
import { PLATFORMS } from "@/lib/platforms";

export function AccountPicker({
  accounts,
  selected,
  onChange,
}: {
  accounts: Account[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!accounts.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600">
        No accounts yet.{" "}
        <Link href="/accounts" className="text-brand font-medium underline">
          Connect one
        </Link>{" "}
        to publish.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((account) => {
        const on = selected.includes(account.id);
        const platform = PLATFORMS[account.platform];
        return (
          <label
            key={account.id}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              on ? "border-brand bg-indigo-50 text-indigo-900" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <input
              type="checkbox"
              name="accountIds"
              value={account.id}
              checked={on}
              onChange={() => onChange(on ? selected.filter((id) => id !== account.id) : [...selected, account.id])}
              className="sr-only"
            />
            <span className="size-2 rounded-full" style={{ background: platform.color }} />
            {account.label}
          </label>
        );
      })}
    </div>
  );
}
