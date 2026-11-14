"use client";

/* ══════════════════════════════════════════════════════════════
   ProductRail — a titled horizontal row of products
   ──────────────────────────────────────────────────────────────
   CSS scroll-snap; swipe on phones, arrow buttons from tablets
   up (disabled at either end, mirrored in Arabic). Children are
   the tiles; each becomes one snap item.
   ══════════════════════════════════════════════════════════════ */

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { pdpCopy } from "./pdp-copy";

interface ProductRailProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: { href: string; label: string };
  locale: Locale;
  children: ReactNode;
  className?: string;
  id: string;
}

export default function ProductRail({ title, eyebrow, action, locale, children, className, id }: ProductRailProps) {
  const copy = pdpCopy(locale);
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // scrollLeft is negative in right-to-left layouts.
    const pos = Math.abs(el.scrollLeft);
    setEdges({ start: pos < 4, end: pos + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const items = Children.toArray(children);
  const scrollable = !(edges.start && edges.end);

  return (
    // Below the fold: the browser skips layout and paint (and lazy photos) until it scrolls near.
    <section
      aria-labelledby={id}
      className={cn(
        "py-14 md:py-20 [content-visibility:auto] [contain-intrinsic-size:auto_560px] md:[contain-intrinsic-size:auto_720px]",
        className,
      )}
    >
      <div className="container-x mb-6 flex items-end justify-between gap-6 md:mb-8">
        <div className="flex flex-col gap-2">
          {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
          <h2 id={id} className="t-h2">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {action ? (
            <Link
              href={action.href}
              className="text-sm text-text-primary underline decoration-border-hover underline-offset-4 hover:decoration-text-primary"
            >
              {action.label}
            </Link>
          ) : null}
          {scrollable ? (
            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                disabled={edges.start}
                aria-label={copy.previous}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-primary transition-colors hover:border-text-primary disabled:opacity-35 disabled:hover:border-border"
              >
                <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                disabled={edges.end}
                aria-label={copy.next}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-primary transition-colors hover:border-text-primary disabled:opacity-35 disabled:hover:border-border"
              >
                <ChevronRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-[var(--container-max)]">
        <ul
          ref={trackRef}
          onScroll={measure}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] scroll-px-[var(--gutter)] md:gap-4"
        >
          {items.map((child, i) => (
            <li key={i} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-3rem)/4)]">
              {child}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
