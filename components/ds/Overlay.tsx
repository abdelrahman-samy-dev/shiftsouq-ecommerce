"use client";

/* ══════════════════════════════════════════════════════════════
   Drawer & Dialog on the native <dialog> element
   ──────────────────────────────────────────────────────────────
   showModal() gives the top layer, inert background, focus
   containment and Esc for free; focus returns to the opener on
   close. Animations are CSS (see globals.css "ds-overlay").
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
  /** Hide the visible title (still announced). */
  hideTitle?: boolean;
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onClose();
    el.addEventListener("close", handle);
    return () => el.removeEventListener("close", handle);
  }, [onClose]);
  return ref;
}

/** Click on the backdrop (the dialog box itself, outside the panel) closes it. */
function onBackdrop(e: React.MouseEvent<HTMLDialogElement>, onClose: () => void) {
  if (e.target === e.currentTarget) onClose();
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  closeLabel = "Close",
  hideTitle,
  side = "end",
}: OverlayProps & { side?: "start" | "end" }) {
  const ref = useDialog(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-labelledby="drawer-title"
      onClick={(e) => onBackdrop(e, onClose)}
      data-side={side}
      className={cn(
        "ds-overlay ds-drawer m-0 h-dvh max-h-dvh w-full max-w-[440px] bg-surface-elevated text-text-primary p-0",
        side === "end" ? "ms-auto" : "me-auto",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          <h2 id="drawer-title" className={cn("text-base font-medium", hideTitle && "sr-only")}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ms-auto inline-flex size-10 items-center justify-center rounded-sm hover:bg-surface"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="shrink-0 border-t border-border p-5">{footer}</div> : null}
      </div>
    </dialog>
  );
}

export function Dialog({ open, onClose, title, children, footer, className, closeLabel = "Close", hideTitle }: OverlayProps) {
  const ref = useDialog(open, onClose);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClick={(e) => onBackdrop(e, onClose)}
      className={cn(
        "ds-overlay ds-dialog m-auto w-[min(92vw,520px)] max-h-[85dvh] bg-surface-elevated text-text-primary p-0 rounded-sm",
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 id="dialog-title" className={cn("t-h3", hideTitle && "sr-only")}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-me-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-surface"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}
