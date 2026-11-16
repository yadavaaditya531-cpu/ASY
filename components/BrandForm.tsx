"use client";

import { useActionState } from "react";
import { saveBrand, type FormState } from "@/app/actions";
import type { Brand } from "@/lib/db";
import { FormMessage, SubmitButton } from "./ui";

export function BrandForm({ brand }: { brand: Brand }) {
  const [state, formAction] = useActionState<FormState, FormData>(saveBrand, {});
  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Business name
        </label>
        <input id="name" name="name" defaultValue={brand.name} maxLength={100} className="input" />
      </div>
      <div>
        <label htmlFor="description" className="label">
          What you do
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={brand.description}
          placeholder="Products, services, what makes you different, your website."
          className="input resize-y"
        />
      </div>
      <div>
        <label htmlFor="audience" className="label">
          Who you are talking to
        </label>
        <input
          id="audience"
          name="audience"
          maxLength={300}
          defaultValue={brand.audience}
          placeholder="e.g. Local families and office workers near downtown"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="tone" className="label">
          Voice
        </label>
        <input
          id="tone"
          name="tone"
          maxLength={300}
          defaultValue={brand.tone}
          placeholder="e.g. Warm, a little playful, no jargon, one emoji at most"
          className="input"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </form>
  );
}
