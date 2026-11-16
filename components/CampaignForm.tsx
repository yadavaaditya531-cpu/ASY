"use client";

import { useActionState, useState } from "react";
import { createCampaign, type FormState } from "@/app/actions";
import type { Account } from "@/lib/db";
import { AccountPicker } from "./AccountPicker";
import { FormMessage, LocalTime, SubmitButton, toLocalInput, useHydrated } from "./ui";

const CADENCES = [
  { days: 1, label: "Every day" },
  { days: 2, label: "Every other day" },
  { days: 3, label: "Every 3 days" },
  { days: 7, label: "Every week" },
];

export function CampaignForm({ accounts }: { accounts: Account[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(createCampaign, {});
  const [selected, setSelected] = useState<string[]>(accounts.length === 1 ? [accounts[0].id] : []);
  const [count, setCount] = useState(5);
  const [cadence, setCadence] = useState(1);
  // Local time is only known in the browser, so the default start appears after hydration.
  const hydrated = useHydrated();
  const [defaultStart] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [startInput, setStart] = useState<string>();
  const start = startInput ?? (hydrated ? toLocalInput(defaultStart) : "");

  // Same local wall-clock time on each day, so daylight-saving changes don't shift the slot.
  const slots: string[] = [];
  if (start) {
    for (let i = 0; i < count; i++) {
      const slot = new Date(start);
      slot.setDate(slot.getDate() + i * cadence);
      slots.push(slot.toISOString());
    }
  }

  const submit = (form: FormData) => {
    form.set("slots", JSON.stringify(slots));
    return formAction(form);
  };

  return (
    <form action={submit} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="card space-y-4">
        <div>
          <label htmlFor="brief" className="label">
            What is this campaign about?
          </label>
          <textarea
            id="brief"
            name="brief"
            rows={5}
            required
            maxLength={2000}
            placeholder="e.g. We're opening a second bakery on Mill Street on March 3. Build excitement, mention the opening-day free croissant for the first 50 customers."
            className="input resize-y"
          />
          <p className="help">Include every fact the posts should mention. The AI is told not to invent offers, prices or dates.</p>
        </div>
        <div>
          <span className="label">Publish to</span>
          <AccountPicker accounts={accounts} selected={selected} onChange={setSelected} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="count" className="label">
              Number of posts
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={14}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(14, Number(e.target.value) || 1)))}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="cadence" className="label">
              How often
            </label>
            <select id="cadence" value={cadence} onChange={(e) => setCadence(Number(e.target.value))} className="input">
              {CADENCES.map((c) => (
                <option key={c.days} value={c.days}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start" className="label">
              First post
            </label>
            <input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingText="Writing posts… this can take a minute">Generate drafts</SubmitButton>
        <p className="help">
          Nothing is published automatically: the posts land in Drafts for you to review, edit and approve.
        </p>
      </div>

      <div className="card h-fit">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Schedule preview</h2>
        <ol className="space-y-1 text-sm text-slate-600">
          {slots.map((slot, i) => (
            <li key={slot} className="flex gap-2">
              <span className="w-5 text-right text-slate-400 tabular-nums">{i + 1}.</span>
              <LocalTime iso={slot} />
            </li>
          ))}
        </ol>
      </div>
    </form>
  );
}
