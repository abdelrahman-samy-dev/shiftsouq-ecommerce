"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/** Small confirmation dialog in the style of DeleteProductDialog. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  pending = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-start"
      >
        <div className="p-6">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              danger ? "bg-red-100 dark:bg-red-500/10" : "bg-amber-100 dark:bg-amber-500/10"
            }`}
          >
            <AlertTriangle size={24} className={danger ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"} />
          </div>
          <h2 id="confirm-title" className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            {title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed whitespace-normal">{body}</p>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className={`px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
