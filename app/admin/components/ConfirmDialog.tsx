"use client";

/* ══════════════════════════════════════════════════════════════
   ConfirmDialog — "are you sure?" on the design-system Dialog
   (native <dialog>: focus trap, Esc, focus returns to the opener).
   Mounted only while open, so many rows can each have one.
   `children` adds content between the text and the buttons
   (e.g. a "type the email to confirm" field).
   ══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { Dialog, Spinner } from "@/components/ds";
import { useLocale } from "@/components/providers/LocaleProvider";
import { adminButton } from "./buttons";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  pending = false,
  tone = "danger",
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  tone?: "danger" | "warning" | "neutral";
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  if (!open) return null;
  const confirmVariant = tone === "danger" ? "dangerSolid" : tone === "warning" ? "warningSolid" : "primary";
  return (
    <Dialog
      open
      onClose={() => {
        if (!pending) onCancel();
      }}
      title={title}
      closeLabel={locale === "ar" ? "إغلاق" : "Close"}
      className="w-[min(92vw,460px)]"
    >
      <div className="text-[0.875rem] leading-relaxed text-text-secondary">{body}</div>
      {children ? <div className="mt-4">{children}</div> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={adminButton("outline", "md")} onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={adminButton(confirmVariant, "md")}
          onClick={onConfirm}
          disabled={pending || confirmDisabled}
          aria-busy={pending || undefined}
        >
          {pending ? <Spinner /> : null}
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
