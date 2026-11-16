"use client";

import { useActionState, useState } from "react";
import { connectAccount, type FormState } from "@/app/actions";
import { PLATFORM_LIST, PLATFORMS, type PlatformId } from "@/lib/platforms";
import { FormMessage, SubmitButton } from "./ui";

export function AccountForm() {
  const [state, formAction] = useActionState<FormState, FormData>(connectAccount, {});
  const [platform, setPlatform] = useState<PlatformId>("sandbox");
  const info = PLATFORMS[platform];

  return (
    <form action={formAction} className="card space-y-4">
      <h2 className="font-semibold">Connect an account</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLATFORM_LIST.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              platform === p.id ? "border-brand bg-indigo-50" : "border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="platform"
              value={p.id}
              checked={platform === p.id}
              onChange={() => setPlatform(p.id)}
              className="sr-only"
            />
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </label>
        ))}
      </div>
      <p className="text-sm text-slate-600">{info.blurb}</p>

      {/* key resets the inputs when the platform changes, so a token never carries over */}
      <div key={platform} className="grid gap-4 sm:grid-cols-2">
        {info.fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="label">
              {field.label}
              {field.optional && <span className="font-normal text-slate-400"> (optional)</span>}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              required={!field.optional}
              placeholder={field.placeholder}
              autoComplete="off"
              className="input"
            />
            {field.help && <p className="help">{field.help}</p>}
          </div>
        ))}
        <div>
          <label htmlFor="label" className="label">
            Name in ASY <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="label" name="label" maxLength={40} placeholder="e.g. Main brand account" className="input" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Checking…">Connect</SubmitButton>
    </form>
  );
}
