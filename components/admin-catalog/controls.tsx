"use client";

/* ══════════════════════════════════════════════════════════════
   Admin catalogue — small interactive controls
   Switch, confirm dialog, CSV download button, list toolbar.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Dialog, Spinner } from "@/components/ds";
import { cn } from "@/lib/utils";

/* ── Switch ───────────────────────────────────────────────────── */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-6 py-3", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm text-text-primary">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="mt-0.5 text-[0.8125rem] text-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group relative -my-2 inline-flex h-11 w-12 shrink-0 items-center justify-center disabled:opacity-45"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-10 rounded-full border transition-colors duration-150",
            checked ? "border-text-primary bg-text-primary" : "border-border-hover bg-surface-inset",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-[inset-inline-start] duration-150",
              checked ? "start-[1.25rem] bg-background" : "start-[0.1875rem] bg-text-primary/70",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/* ── Confirm dialog ───────────────────────────────────────────── */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  closeLabel,
  destructive,
  busy,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  /** Leave out for an information-only dialog (one button). */
  cancelLabel?: string;
  closeLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={closeLabel}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {cancelLabel ? (
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            onClick={onConfirm}
            loading={busy}
            className={destructive ? "bg-destructive text-destructive-foreground hover:opacity-90" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {body ? <p className="text-sm text-text-secondary">{body}</p> : null}
      {children}
    </Dialog>
  );
}

/* ── CSV download ─────────────────────────────────────────────── */

type CsvResult = { ok: true; csv: string; count: number } | { ok: false; error: string };

export function CsvButton({
  action,
  params,
  filename,
  labels,
}: {
  action: (params: Record<string, string>) => Promise<CsvResult>;
  params: Record<string, string>;
  filename: string;
  labels: { idle: string; busy: string; empty: string; failed: string };
}) {
  const [busy, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      try {
        const res = await action(params);
        if (!res.ok) return void toast.error(labels.failed);
        if (res.count === 0) return void toast.message(labels.empty);
        // BOM so spreadsheet apps read Arabic text as UTF-8.
        const blob = new Blob(["﻿", res.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        toast.error(labels.failed);
      }
    });
  return (
    <Button variant="ghost" size="sm" onClick={run} loading={busy} className="border border-border">
      {busy ? labels.busy : labels.idle}
    </Button>
  );
}

/* ── List toolbar: search + filters + sort, kept in the URL ───── */

export interface ToolbarSelect {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}

export function ListToolbar({
  search,
  searchLabel,
  searchPlaceholder,
  selects,
  clearLabel,
  extra,
}: {
  search: string;
  searchLabel: string;
  searchPlaceholder: string;
  selects: ToolbarSelect[];
  clearLabel: string;
  extra?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useId();

  // Follow the URL when it changes from outside (back button, clear filters).
  if (search !== lastSearch) {
    setLastSearch(search);
    setTerm(search);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const navigate = (changes: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    params.delete("q");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const onSearch = (value: string) => {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ search: value.trim() }), 300);
  };

  const active = !!search || selects.some((s) => s.value);

  return (
    <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center" aria-busy={pending || undefined}>
      <div className="relative min-w-0 flex-1 lg:max-w-sm">
        <label htmlFor={searchId} className="sr-only">
          {searchLabel}
        </label>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          id={searchId}
          type="search"
          value={term}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (timer.current) clearTimeout(timer.current);
              navigate({ search: term.trim() });
            }
          }}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="h-10 w-full rounded-sm border border-border bg-surface-elevated ps-9 pe-9 text-sm text-text-primary outline-none placeholder:text-text-faint hover:border-border-hover focus:border-text-primary"
        />
        {pending ? <Spinner className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted" /> : null}
      </div>
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {selects.map((s) => (
          <label key={s.name} className="relative shrink-0">
            <span className="sr-only">{s.label}</span>
            <select
              value={s.value}
              onChange={(e) => navigate({ [s.name]: e.target.value })}
              className={cn(
                "h-10 cursor-pointer appearance-none rounded-sm border bg-surface-elevated ps-3 pe-9 text-[0.8125rem] outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] pointer-coarse:h-11",
                s.value ? "border-text-primary text-text-primary" : "border-border text-text-secondary",
              )}
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </label>
        ))}
        {active ? (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              navigate(Object.fromEntries([["search", ""], ...selects.filter((s) => s.name !== "sort").map((s) => [s.name, ""])]));
            }}
            className="h-10 shrink-0 px-2 text-[0.8125rem] text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
          >
            {clearLabel}
          </button>
        ) : null}
        {extra ? <div className="flex shrink-0 items-center gap-2 lg:ms-auto">{extra}</div> : null}
      </div>
    </div>
  );
}
