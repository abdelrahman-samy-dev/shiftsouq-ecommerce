"use client";

/* ══════════════════════════════════════════════════════════════
   ProductRail — horizontal product carousel (CSS scroll-snap)
   ──────────────────────────────────────────────────────────────
   Native scrolling (touch, trackpad, Shift+wheel); cards snap to
   the gutter. Desktop gets previous/next buttons that page by
   the visible width and disable at either end. Keyboard users
   tab through the cards: focus scrolls each into view. Works in
   RTL (scrollLeft is negative there).
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductRailProps {
  id: string;
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
  labels: { prev: string; next: string };
  children: ReactNode;
}

export function ProductRail({ id, eyebrow, title, action, labels, children }: ProductRailProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 2);
    setAtEnd(pos >= max - 2);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    "inline-flex size-10 items-center justify-center rounded-sm border border-border text-text-primary transition-colors hover:border-text-primary disabled:pointer-events-none disabled:opacity-35";

  return (
    <section aria-labelledby={`${id}-title`} className="py-16 md:py-24">
      <div className="container-x">
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
          <div className="flex flex-col gap-2">
            <p className="t-eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`} className="t-h2">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            {action ? (
              <Link
                href={action.href}
                className="text-sm text-text-primary underline underline-offset-4 decoration-border-hover hover:decoration-text-primary"
              >
                {action.label}
              </Link>
            ) : null}
            <div className="hidden items-center gap-2 md:flex">
              <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label={labels.prev} aria-controls={id} className={arrow}>
                <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label={labels.next} aria-controls={id} className={arrow}>
                <ChevronRight className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        <ul
          id={id}
          ref={scroller}
          className={cn(
            "no-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] scroll-px-[var(--gutter)] md:gap-4 xl:gap-5",
            "[&>li]:w-[calc((100%-0.75rem)/2.2)] [&>li]:shrink-0 [&>li]:snap-start",
            "md:[&>li]:w-[calc((100%-2rem)/3.25)] xl:[&>li]:w-[calc((100%-3.75rem)/4)]",
          )}
        >
          {children}
        </ul>
      </div>
    </section>
  );
}
