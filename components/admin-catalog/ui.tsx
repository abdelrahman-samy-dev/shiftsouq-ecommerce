/* ══════════════════════════════════════════════════════════════
   Admin catalogue — small presentational pieces (server-safe)
   Same tokens as the store, denser: hairlines, small type, no boxes
   where space and rules can do the work. docs/design-system.md §6.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StockState } from "@/lib/admin/catalog-utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-text-muted transition-colors hover:text-text-primary"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3.5L5.5 8l4.5 4.5" />
            </svg>
            {back.label}
          </Link>
        ) : null}
        <h1 className="t-h2">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-text-secondary">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-text-muted">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Small status label with a dot: published / draft. */
export function StatusLabel({ active, label, className }: { active: boolean; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[0.8125rem]", active ? "text-text-primary" : "text-text-muted", className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-text-faint")} />
      {label}
    </span>
  );
}

const STOCK_TONE: Record<StockState, string> = {
  in: "text-text-primary",
  low: "text-warning",
  out: "text-destructive",
};

/** Stock number with a low / sold-out marker. */
export function StockFigure({ value, state, label, className }: { value: string; state: StockState; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 tabular-nums", STOCK_TONE[state], className)}>
      {state !== "in" ? <span aria-hidden="true" className={cn("size-1.5 rounded-full", state === "low" ? "bg-warning" : "bg-destructive")} /> : null}
      <span>{value}</span>
      {label && state !== "in" ? <span className="text-[0.75rem]">{label}</span> : null}
    </span>
  );
}

/** Product thumbnail at 4:5 on the sand ground, or an empty frame. */
export function Thumb({ src, alt = "", size = 40, className }: { src: string | null | undefined; alt?: string; size?: number; className?: string }) {
  const h = Math.round(size * 1.25);
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-[2px] bg-surface", className)}
      style={{ width: size, height: h }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={`${size * 2}px`} className="object-cover" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute inset-0 m-auto size-4 text-text-faint" fill="none" stroke="currentColor" strokeWidth="1.25">
          <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
          <path d="M3.5 16l5-5 4 4 3-3 5 5" />
        </svg>
      )}
    </span>
  );
}

/** Editor section: heading and hint on the start side, fields on the end side (stacked on phones). */
export function FormSection({
  id,
  title,
  hint,
  children,
  aside,
}: {
  id?: string;
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-32 border-b border-border py-8 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2 id={id ? `${id}-title` : undefined} className="t-h2 text-[1.375rem]!">
            {title}
          </h2>
          {hint ? <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">{hint}</p> : null}
          {aside ? <div className="mt-4">{aside}</div> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** Label for a group of fields (e.g. "English" / "Arabic"). */
export function FieldGroupLabel({ children }: { children: ReactNode }) {
  return <p className="t-eyebrow mb-3">{children}</p>;
}

/** Table header cell style. */
export const thClass = "t-eyebrow h-10 px-3 text-start align-middle whitespace-nowrap";
/** Table body cell style. */
export const tdClass = "px-3 py-3 align-middle";

export function EmptyPanel({ title, body, action, icon }: { title: ReactNode; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border-b border-border px-6 py-20 text-center">
      {icon ? <div className="mb-1 text-text-faint">{icon}</div> : null}
      <h2 className="t-h2">{title}</h2>
      {body ? <p className="max-w-md text-sm text-text-secondary">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  hrefFor,
  labels,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  labels: { page: string; prev: string; next: string; nav: string };
}) {
  if (totalPages <= 1) return null;
  const link =
    "inline-flex size-10 items-center justify-center rounded-sm border border-border text-text-primary transition-colors hover:border-text-primary aria-disabled:pointer-events-none aria-disabled:opacity-35";
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return (
    <nav aria-label={labels.nav} className="flex items-center justify-between gap-4 pt-5">
      <p className="text-[0.8125rem] text-text-muted tabular-nums">{labels.page}</p>
      <div className="flex items-center gap-2">
        <Link href={hrefFor(prev)} aria-label={labels.prev} aria-disabled={page <= 1 || undefined} tabIndex={page <= 1 ? -1 : undefined} className={link}>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
        </Link>
        <Link
          href={hrefFor(next)}
          aria-label={labels.next}
          aria-disabled={page >= totalPages || undefined}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={link}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3.5L10.5 8 6 12.5" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

/** Builds a list URL keeping the current params and changing some. */
export function listHref(base: string, current: Record<string, string | null | undefined>, change: Record<string, string | number | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) {
    if (v === null || v === undefined || v === "") continue;
    if (k === "page" && String(v) === "1") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Wide cover thumbnail (collections). */
export function CoverThumb({ src, className }: { src: string | null | undefined; className?: string }) {
  return (
    <span className={cn("relative block h-10 w-16 shrink-0 overflow-hidden rounded-[2px] bg-surface", className)}>
      {src ? <Image src={src} alt="" fill sizes="128px" className="object-cover" /> : null}
    </span>
  );
}

/** Body cell for tables that turn into stacked rows on phones (no padding there). */
export const tdStack = "align-middle md:px-3 md:py-3";

/** Native checkbox in ink (paper in dark mode): the browser draws a contrasting tick in both themes. */
export const checkboxClass = "size-[18px] shrink-0 cursor-pointer align-middle accent-[var(--text-primary)]";
