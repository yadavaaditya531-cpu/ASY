"use client";

import { useActionState, useState, useTransition } from "react";
import { savePost, suggestPost, type FormState } from "@/app/actions";
import type { Account, Post } from "@/lib/db";
import { countChars, tightestLimit } from "@/lib/platforms";
import { AccountPicker } from "./AccountPicker";
import { FormMessage, SubmitButton, toLocalInput, useHydrated } from "./ui";

export function Composer({ accounts, post }: { accounts: Account[]; post?: Post }) {
  const [state, formAction] = useActionState<FormState, FormData>(savePost, {});
  const [content, setContent] = useState(post?.content ?? "");
  const [selected, setSelected] = useState<string[]>(
    post ? post.targets.map((t) => t.accountId) : accounts.length === 1 ? [accounts[0].id] : [],
  );
  // Local wall-clock time is only known in the browser, so the default appears after hydration.
  const hydrated = useHydrated();
  const [defaultWhen] = useState(() => (post?.scheduledAt ? new Date(post.scheduledAt) : new Date(Date.now() + 60 * 60_000)));
  const [whenInput, setWhen] = useState<string>();
  const when = whenInput ?? (hydrated ? toLocalInput(defaultWhen) : "");
  const [brief, setBrief] = useState("");
  const [aiError, setAiError] = useState<string>();
  const [drafting, startDrafting] = useTransition();

  const limit = tightestLimit(accounts.filter((a) => selected.includes(a.id)).map((a) => a.platform));
  const length = countChars(content);
  const over = limit !== null && length > limit;

  const submit = (form: FormData) => {
    form.set("scheduledAt", when ? new Date(when).toISOString() : "");
    return formAction(form);
  };

  const draft = () =>
    startDrafting(async () => {
      setAiError(undefined);
      const result = await suggestPost(brief, selected);
      if (result.text) setContent(result.text);
      else setAiError(result.error);
    });

  return (
    <form action={submit} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <div className="card space-y-4">
          {post && <input type="hidden" name="id" value={post.id} />}
          <div>
            <span className="label">Publish to</span>
            <AccountPicker accounts={accounts} selected={selected} onChange={setSelected} />
          </div>
          <div>
            <label htmlFor="content" className="label">
              Post
            </label>
            <textarea
              id="content"
              name="content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              className="input resize-y leading-relaxed"
            />
            <p className={`help text-right tabular-nums ${over ? "font-semibold !text-red-600" : ""}`}>
              {length}
              {limit !== null && ` / ${limit}`} characters
            </p>
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <label htmlFor="brief" className="label">
              Draft it with AI
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (brief.trim() && !drafting) draft();
                  }
                }}
                placeholder="e.g. Announce our weekend 2-for-1 coffee offer"
                className="input"
              />
              <button type="button" className="btn shrink-0" onClick={draft} disabled={drafting || !brief.trim()}>
                {drafting ? "Writing…" : "Write draft"}
              </button>
            </div>
            <p className="help">Uses your brand profile from Settings. The draft replaces the text above; edit it freely.</p>
          </div>
          {aiError && <FormMessage state={{ error: aiError }} />}
        </div>
      </div>

      <div className="card h-fit space-y-4">
        <div>
          <label htmlFor="when" className="label">
            Date and time
          </label>
          <input
            id="when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="input"
          />
          <p className="help">Your local time.</p>
        </div>
        <FormMessage state={state} />
        <div className="grid gap-2">
          <SubmitButton name="intent" value="schedule" pendingText="Saving…" disabled={over}>
            Schedule
          </SubmitButton>
          <SubmitButton name="intent" value="now" className="btn" disabled={over}>
            Publish now
          </SubmitButton>
          <SubmitButton name="intent" value="draft" className="btn">
            Save as draft
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
