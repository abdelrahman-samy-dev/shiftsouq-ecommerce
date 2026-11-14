/* ══════════════════════════════════════════════════════════════
   Admin building blocks — presentational, server-safe (no hooks)
   ──────────────────────────────────────────────────────────────
   PageHeader, Panel, StatCard, AdminEmptyState, Tag, KeyValue,
   TabsNav, FilterBar, Notice. Same tokens as the storefront,
   denser: hairlines, square-ish corners, no shadows.
   Usage notes for every block: app/admin/components/README.md.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── PageHeader ──────────────────────────────────────────────── */

/** Page title (h1) with an optional description, back link and actions on the end side. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 lg:mb-8", className)}>
      {back ? (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-text-muted hover:text-text-primary transition-colors"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="t-h2 break-words">{title}</h1>
          {description ? <p className="mt-1.5 text-[0.875rem] text-text-muted">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/* ── Panel ───────────────────────────────────────────────────── */

/** A bordered section with an optional header row (title, description, actions). */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  id,
  as: Tag = "section",
  headingLevel = 2,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** false = the body has no padding (tables, lists that run edge to edge). */
  padded?: boolean;
  id?: string;
  as?: "section" | "div" | "article";
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 3 ? "h3" : "h2";
  return (
    <Tag id={id} className={cn("rounded-[4px] border border-border bg-surface-elevated", className)}>
      {title || actions ? (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? <H className="text-[0.875rem] font-medium text-text-primary">{title}</H> : null}
            {description ? <p className="mt-0.5 text-[0.8125rem] text-text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(padded && "p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}

/* ── StatCard ────────────────────────────────────────────────── */

export interface StatDelta {
  /** Relative change (0.12 = +12 %), or null when there is nothing to compare with. */
  change: number | null;
  /** Pre-formatted text, e.g. "Up 12%" — the component adds the arrow and colour. */
  label: string;
  /** e.g. "vs. the previous 7 days" */
  context?: string;
  /** Rising is good (revenue) or bad (refunds). Default true. */
  upIsGood?: boolean;
}

/** KPI tile: label, big tabular value, optional comparison and hint. */
export function StatCard({
  label,
  value,
  delta,
  hint,
  href,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: StatDelta;
  hint?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[0.8125rem] text-text-muted">{label}</p>
      <p className="mt-2 text-[1.375rem] font-medium leading-none tracking-tight tabular-nums text-text-primary sm:text-[1.625rem] lg:text-[1.875rem]">{value}</p>
      {delta ? <DeltaLine delta={delta} /> : null}
      {hint ? <p className="mt-1 text-[0.75rem] text-text-faint">{hint}</p> : null}
    </>
  );
  const cls = cn(
    "block rounded-[4px] border border-border bg-surface-elevated p-4 sm:p-5",
    href && "transition-colors hover:border-border-hover",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DeltaLine({ delta }: { delta: StatDelta }) {
  const { change, upIsGood = true } = delta;
  const dir = change == null || Math.abs(change) < 0.0005 ? "flat" : change > 0 ? "up" : "down";
  const good = dir === "flat" ? null : (dir === "up") === upIsGood;
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.75rem]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular-nums",
          good === true && "text-success",
          good === false && "text-destructive",
          good === null && "text-text-muted",
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
        {delta.label}
      </span>
      {delta.context ? <span className="text-text-muted">{delta.context}</span> : null}
    </p>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

/** Compact empty state for panels and tables: icon, title, one sentence, one action. */
export function AdminEmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="mb-4 grid size-11 place-items-center rounded-full border border-border text-text-muted [&_svg]:size-5">{icon}</div>
      ) : null}
      <p className="text-[0.9375rem] font-medium text-text-primary">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[0.8125rem] text-text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ── Tag (status) ────────────────────────────────────────────── */

export type TagTone = "neutral" | "ink" | "success" | "warning" | "danger" | "accent" | "muted";

const TAG_TONES: Record<TagTone, string> = {
  neutral: "bg-surface text-text-secondary",
  ink: "bg-text-primary text-background",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-destructive-bg text-destructive",
  accent: "bg-surface text-accent",
  muted: "bg-transparent text-text-muted border border-border",
};

/** Small square-cornered status tag with an optional dot. */
export function Tag({ tone = "neutral", dot = false, children, className }: { tone?: TagTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 text-[0.71875rem] font-medium leading-none",
        TAG_TONES[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/* ── Key/value list ──────────────────────────────────────────── */

/** Definition list with hairline rows. Wrap rows in <KeyValueList>. */
export function KeyValueList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-border", className)}>{children}</dl>;
}

export function KeyValue({ label, children, ltr = false }: { label: ReactNode; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[0.8125rem]">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-end text-text-primary" dir={ltr ? "ltr" : undefined}>
        {children}
      </dd>
    </div>
  );
}

/* ── Tabs (links) ────────────────────────────────────────────── */

/** Underlined tab row made of links (state lives in the URL). */
export function TabsNav({
  tabs,
  label,
  className,
}: {
  tabs: { href: string; label: ReactNode; count?: number | null; current: boolean }[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("overflow-x-auto no-scrollbar", className)}>
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center gap-2 px-3 text-[0.8125rem] transition-colors first:ps-0",
                tab.current
                  ? "font-medium text-text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-text-primary [li:first-child_&]:after:start-0"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              {tab.label}
              {tab.count != null ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 tabular-nums",
                    tab.current ? "bg-text-primary text-background" : "bg-surface text-text-muted",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── Filter bar ──────────────────────────────────────────────── */

/** Row of filters above a table: search first, selects after, results/clear at the end. */
export function FilterBar({ children, end, className }: { children: ReactNode; end?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-2 lg:flex-row lg:items-center", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {end ? <div className="flex shrink-0 items-center gap-3 text-[0.8125rem] text-text-muted">{end}</div> : null}
    </div>
  );
}

/* ── Notice ──────────────────────────────────────────────────── */

/** Inline message box (owner-only notices, warnings). */
export function Notice({
  tone = "neutral",
  title,
  children,
  icon,
  className,
}: {
  tone?: "neutral" | "warning" | "danger" | "success";
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-border bg-surface text-text-secondary",
    warning: "border-transparent bg-warning-bg text-warning",
    danger: "border-destructive-border bg-destructive-bg text-destructive",
    success: "border-transparent bg-success-bg text-success",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-[4px] border px-4 py-3 text-[0.8125rem]", tones[tone], className)}>
      {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <p className="font-medium text-text-primary">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : undefined, "text-text-secondary")}>{children}</div> : null}
      </div>
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────────── */

/** Initials in a circle (people only). */
export function Avatar({ name, email, size = 32, className }: { name?: string | null; email?: string | null; size?: number; className?: string }) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-surface-inset font-sans font-medium not-italic leading-none tracking-normal text-text-secondary", className)}
    >
      {initials}
    </span>
  );
}
