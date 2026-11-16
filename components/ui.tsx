"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.ok}
      </p>
    );
  }
  return null;
}

/** Renders a UTC timestamp in the viewer's own time zone (UTC until the page has hydrated). */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const hydrated = useHydrated();
  const formatted = new Date(iso).toLocaleString(hydrated ? undefined : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
    ...(hydrated ? {} : { timeZone: "UTC", timeZoneName: dateOnly ? undefined : "short" }),
  });
  return <time dateTime={iso}>{formatted}</time>;
}

/** Formats a Date for <input type="datetime-local"> in the viewer's time zone. */
export function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true afterwards. For values only the browser knows (local time). */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
