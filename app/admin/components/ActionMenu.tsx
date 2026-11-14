"use client";

/* ══════════════════════════════════════════════════════════════
   ActionMenu — the "⋯" row-actions menu.
   ──────────────────────────────────────────────────────────────
   <ActionMenu
     label={`Actions for ${name}`}
     items={[
       { type: "link", label: "View", href: `/admin/customers/${id}` },
       { type: "separator" },
       { type: "action", label: "Delete", tone: "danger",
         action: deleteReview.bind(null, id), success: "Deleted", errors: t.reviews.error,
         confirm: { title, body, confirmLabel, cancelLabel } },
     ]}
   />
   Keyboard: Enter/Space/↓ opens, ↑/↓ move, Home/End, Esc closes
   and returns focus to the button. Works from server components
   (actions are bound server actions; icons are React elements).
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Spinner } from "@/components/ds";
import { cn } from "@/lib/utils";
import { useServerAction, type ActionOutcome, type ConfirmSpec } from "./ActionButton";
import { adminButton } from "./buttons";
import { ConfirmDialog } from "./ConfirmDialog";

export type ActionMenuItem =
  | { type: "link"; label: string; href: string; icon?: ReactNode; external?: boolean }
  | {
      type: "action";
      label: string;
      action: () => Promise<ActionOutcome>;
      icon?: ReactNode;
      tone?: "default" | "danger";
      success?: string;
      errors?: Record<string, string>;
      confirm?: ConfirmSpec;
    }
  /** Client components only: a plain callback (e.g. open a custom dialog). */
  | { type: "button"; label: string; onSelect: () => void; icon?: ReactNode; tone?: "default" | "danger" }
  | { type: "separator" }
  | { type: "note"; label: string };

export function ActionMenu({
  label,
  items,
  trigger,
  className,
}: {
  /** Accessible name of the trigger, e.g. "Actions for order SS-…". */
  label: string;
  items: ActionMenuItem[];
  /** Visible trigger content (default: ⋯ icon only). */
  trigger?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Extract<ActionMenuItem, { type: "action" }> | null>(null);
  const { pending, run } = useServerAction();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const focusables = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

  useEffect(() => {
    if (!open) return;
    focusables()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = focusables();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const select = (item: Extract<ActionMenuItem, { type: "action" }>) => {
    close(false);
    if (item.confirm) setConfirming(item);
    else run(item.action, { success: item.success, errors: item.errors, after: () => buttonRef.current?.focus() });
  };

  const itemClass = (danger?: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-[2px] px-3 py-2 text-start text-[0.8125rem] outline-none transition-colors pointer-coarse:py-3",
      "hover:bg-surface focus-visible:bg-surface [&_svg]:size-4 [&_svg]:shrink-0",
      danger ? "text-destructive" : "text-text-primary",
    );

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={trigger ? adminButton("outline", "sm") : adminButton("ghost", "icon")}
      >
        {pending ? <Spinner /> : trigger ?? <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute end-0 top-full z-30 mt-1 min-w-52 rounded-[4px] border border-border bg-surface-elevated p-1 shadow-[var(--shadow-float)]"
        >
          {items.map((item, i) => {
            if (item.type === "separator") return <div key={i} role="separator" className="my-1 h-px bg-border" />;
            if (item.type === "note")
              return (
                <p key={i} className="px-3 py-2 text-[0.75rem] leading-snug text-text-muted">
                  {item.label}
                </p>
              );
            if (item.type === "link")
              return (
                <Link
                  key={i}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass()}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            if (item.type === "button")
              return (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass(item.tone === "danger")}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            return (
              <button key={i} type="button" role="menuitem" tabIndex={-1} className={itemClass(item.tone === "danger")} onClick={() => select(item)}>
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {confirming?.confirm ? (
        <ConfirmDialog
          open
          title={confirming.confirm.title}
          body={confirming.confirm.body}
          confirmLabel={confirming.confirm.confirmLabel}
          cancelLabel={confirming.confirm.cancelLabel}
          tone={confirming.confirm.tone}
          pending={pending}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            run(confirming.action, { success: confirming.success, errors: confirming.errors, after: () => setConfirming(null) })
          }
        />
      ) : null}
    </div>
  );
}
