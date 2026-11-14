"use client";

/* Footer newsletter form: progressive (works without JavaScript), errors linked to the field. */

import { useActionState, useId } from "react";
import { subscribeToNewsletter } from "@/lib/actions/newsletter";
import type { NewsletterState } from "@/lib/validations/newsletter";
import { Spinner } from "@/components/ds";
import { cn } from "@/lib/utils";

interface NewsletterFormProps {
  labels: { email: string; placeholder: string; submit: string; note: string };
  source?: "footer" | "home";
}

const initial: NewsletterState = { status: "idle", message: "" };

export function NewsletterForm({ labels, source = "footer" }: NewsletterFormProps) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const id = useId();
  const emailId = `${id}-email`;
  const messageId = `${id}-message`;
  const failed = state.status === "invalid" || state.status === "too_many" || state.status === "error";
  const done = state.status === "subscribed" || state.status === "already" || state.status === "resubscribed";

  return (
    <form action={action} noValidate className="w-full max-w-md">
      <label htmlFor={emailId} className="mb-2 block text-[0.8125rem] text-text-secondary">
        {labels.email}
      </label>
      <div
        className={cn(
          "flex h-12 items-stretch border-b transition-colors duration-150 focus-within:border-text-primary",
          failed ? "border-destructive" : "border-border-hover",
        )}
      >
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder={labels.placeholder}
          dir="ltr"
          aria-invalid={failed || undefined}
          aria-describedby={state.message ? messageId : `${id}-note`}
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-text-primary outline-none placeholder:text-text-faint rtl:text-right"
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className="inline-flex shrink-0 items-center gap-2 ps-4 text-sm font-medium text-text-primary underline-offset-4 hover:underline disabled:opacity-60"
        >
          {pending ? <Spinner className="size-3.5" /> : null}
          {labels.submit}
        </button>
      </div>
      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="source" value={source} />
      {state.message ? (
        <p
          id={messageId}
          role={failed ? "alert" : "status"}
          className={cn("mt-3 text-[0.8125rem]", failed ? "text-destructive" : done ? "text-success" : "text-text-muted")}
        >
          {state.message}
        </p>
      ) : (
        <p id={`${id}-note`} className="mt-3 text-[0.8125rem] text-text-muted">
          {labels.note}
        </p>
      )}
    </form>
  );
}
