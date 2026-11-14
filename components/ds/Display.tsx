import Link from "next/link";
import type { ReactNode } from "react";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

/* Small presentational pieces — docs/design-system.md §5. Server-safe (no hooks). */

export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: "p" | "span" | "h2" | "h3" }) {
  return <Tag className={cn("t-eyebrow", className)}>{children}</Tag>;
}

export function Section({ children, className, id, label }: { children: ReactNode; className?: string; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={cn("py-14 md:py-20", className)}>
      <div className="container-x">{children}</div>
    </section>
  );
}

/** Section title row: display heading + optional eyebrow and action link. */
export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
  as: Tag = "h2",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: { href: string; label: ReactNode };
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("mb-8 md:mb-10 flex items-end justify-between gap-6", className)}>
      <div className="flex flex-col gap-2">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Tag className={Tag === "h1" ? "t-h1" : "t-h2"}>{title}</Tag>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm text-text-primary underline underline-offset-4 decoration-border-hover hover:decoration-text-primary"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

type BadgeTone = "neutral" | "accent" | "ink" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-background text-text-primary",
  accent: "bg-background text-accent",
  ink: "bg-text-primary text-background",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-destructive-bg text-destructive",
};

/** Small text tag: "New", "−20%", "Sold out". No pills, no red boxes. */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 px-2 text-[0.6875rem] font-medium leading-none rounded-[2px] tabular-nums",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Price with optional compare-at price. Sale price uses the accent colour. */
export function Price({
  amount,
  compareAt,
  locale,
  size = "md",
  className,
}: {
  amount: number;
  compareAt?: number | null;
  locale: Locale | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const loc = (locale === "ar" ? "ar" : "en") as Locale;
  const onSale = compareAt != null && compareAt > amount;
  const sizeClass = size === "lg" ? "text-xl" : size === "sm" ? "text-[0.8125rem]" : "text-sm";
  return (
    <p className={cn("t-price flex flex-wrap items-baseline gap-x-2", sizeClass, className)}>
      <span className={onSale ? "text-accent" : "text-text-primary"}>
        {onSale ? <span className="sr-only">{loc === "ar" ? "السعر الحالي " : "Now "}</span> : null}
        {formatPrice(amount, loc)}
      </span>
      {onSale ? (
        <s className="text-text-muted font-normal">
          <span className="sr-only">{loc === "ar" ? "السعر السابق " : "Was "}</span>
          {formatPrice(compareAt!, loc)}
        </s>
      ) : null}
    </p>
  );
}

/** Star rating, read-only. */
export function Rating({ value, count, locale, className }: { value: number; count?: number; locale: string; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  const label = locale === "ar" ? `التقييم ${value.toFixed(1)} من 5` : `Rated ${value.toFixed(1)} out of 5`;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[0.8125rem] text-text-secondary", className)}>
      <span className="inline-flex" role="img" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <defs>
              <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.1 4.1 13.3l.9-4.3-3.3-3 4.4-.5z"
              fill={rounded >= i ? "currentColor" : rounded >= i - 0.5 ? `url(#half-${i})` : "transparent"}
              stroke="currentColor"
              strokeWidth="1"
              className="text-text-primary"
            />
          </svg>
        ))}
      </span>
      {count != null ? <span className="tabular-nums">({count})</span> : null}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-surface-inset animate-pulse rounded-[2px]", className)} />;
}

export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-4 py-20 px-6", className)}>
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <h2 className="t-h2">{title}</h2>
      {body ? <p className="max-w-md text-text-secondary">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Breadcrumbs({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.8125rem] text-text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-text-secondary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Accordion built on <details>: works without JavaScript, keyboard and screen-reader friendly. */
export function Accordion({ items, className }: { items: { title: ReactNode; content: ReactNode; open?: boolean }[]; className?: string }) {
  return (
    <div className={cn("border-t border-border", className)}>
      {items.map((item, i) => (
        <details key={i} open={item.open} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-text-primary [&::-webkit-details-marker]:hidden">
            {item.title}
            <span aria-hidden="true" className="relative size-3 shrink-0">
              <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
              <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-200 group-open:scale-y-0" />
            </span>
          </summary>
          <div className="pb-5 text-sm text-text-secondary leading-relaxed">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

/** Colour swatch circle. Selected = ink ring with a gap. */
export function SwatchDot({ color, selected, className }: { color: string; selected?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-5 rounded-full ring-1 ring-border-hover",
        selected && "outline outline-2 outline-offset-2 outline-text-primary",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}
