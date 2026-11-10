"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions";
import { FormMessage, SubmitButton } from "./ui";

export function LoginForm() {
  const [state, formAction] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <h1 className="text-lg font-semibold">Sign in to ASY</h1>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input id="password" name="password" type="password" required autoFocus className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…" className="btn btn-primary w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
