"use client";

/* ══════════════════════════════════════════════════════════════
   ActionButton — runs one bound server action from a button,
   with an optional confirmation, a pending state and a toast.
   ──────────────────────────────────────────────────────────────
   From a server component:
     <ActionButton
       action={setReviewStatus.bind(null, review.id, "approved")}
       success={t.reviews.approved}
       errors={t.reviews.error}
     >{t.reviews.approve}</ActionButton>
   The action returns { ok: true } | { ok: false, error: key };
   `errors[key]` (or errors.generic) is shown on failure. The
   action's own revalidatePath refreshes the page afterwards.
   ══════════════════════════════════════════════════════════════ */

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds";
import { adminButton, type AdminButtonSize, type AdminButtonVariant } from "./buttons";
import { ConfirmDialog } from "./ConfirmDialog";

export type ActionOutcome = { ok: true } | { ok: false; error: string };

export interface ConfirmSpec {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "warning" | "neutral";
}

export function errorMessage(errors: Record<string, string> | undefined, key: string | undefined): string {
  return (key && errors?.[key]) || errors?.generic || "Something went wrong.";
}

/** Runs an action with toast feedback; shared by ActionButton and ActionMenu. */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionOutcome>, opts: { success?: string; errors?: Record<string, string>; after?: () => void }) =>
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok) {
          if (opts.success) toast.success(opts.success);
        } else {
          toast.error(errorMessage(opts.errors, res.error));
        }
      } catch {
        toast.error(errorMessage(opts.errors, "generic"));
      } finally {
        opts.after?.();
      }
    });
  return { pending, run };
}

export function ActionButton({
  action,
  children,
  variant = "outline",
  size = "sm",
  icon,
  success,
  errors,
  confirm,
  className,
  ariaLabel,
  disabled,
}: {
  action: () => Promise<ActionOutcome>;
  children: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  icon?: ReactNode;
  success?: string;
  errors?: Record<string, string>;
  confirm?: ConfirmSpec;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const { pending, run } = useServerAction();
  const [asking, setAsking] = useState(false);
  const go = () => run(action, { success, errors, after: () => setAsking(false) });

  return (
    <>
      <button
        type="button"
        className={adminButton(variant, size, className)}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        aria-label={ariaLabel}
        onClick={() => (confirm ? setAsking(true) : go())}
      >
        {pending && !asking ? <Spinner /> : icon}
        {children}
      </button>
      {confirm ? (
        <ConfirmDialog
          open={asking}
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          tone={confirm.tone}
          pending={pending}
          onCancel={() => setAsking(false)}
          onConfirm={go}
        />
      ) : null}
    </>
  );
}
