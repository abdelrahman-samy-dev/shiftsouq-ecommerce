"use client";

/* ══════════════════════════════════════════════════════════════
   StickyAddBar — phones only
   ──────────────────────────────────────────────────────────────
   Slides up from the bottom once the main "Add to bag" button has
   scrolled up out of view, and hides again at the end of the
   product content (#pdp-end) so it never covers the footer.
   Fixed + transform only: no layout shift.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState, type RefObject } from "react";
import { Button, Price } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { pdpCopy } from "./pdp-copy";

interface StickyAddBarProps {
  targetRef: RefObject<HTMLElement | null>;
  name: string;
  price: number;
  compareAt: number | null;
  showFrom: boolean;
  label: string;
  disabled: boolean;
  onAdd: () => void;
  locale: Locale;
}

export default function StickyAddBar({ targetRef, name, price, compareAt, showFrom, label, disabled, onAdd, locale }: StickyAddBarProps) {
  const copy = pdpCopy(locale);
  const [pastCta, setPastCta] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    // The observed area reaches far below the viewport, so "not intersecting"
    // means the button is above it (scrolled past) — also after a jump to the top.
    const io = new IntersectionObserver(([entry]) => setPastCta(!entry.isIntersecting), {
      rootMargin: "0px 0px 100000px 0px",
    });
    io.observe(target);
    // Reaching far above the viewport: intersecting = the end is in view or already passed.
    const end = document.getElementById("pdp-end");
    let endIo: IntersectionObserver | null = null;
    if (end) {
      endIo = new IntersectionObserver(([entry]) => setAtEnd(entry.isIntersecting), {
        rootMargin: "100000px 0px 0px 0px",
      });
      endIo.observe(end);
    }
    return () => {
      io.disconnect();
      endIo?.disconnect();
    };
  }, [targetRef]);

  const visible = pastCta && !atEnd;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden",
        "transition-[translate,visibility] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
        visible ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="container-x flex h-16 items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] text-text-primary">{name}</p>
          <div className="flex items-baseline gap-1.5">
            {showFrom ? <span className="text-[0.75rem] text-text-muted">{copy.from}</span> : null}
            <Price amount={price} compareAt={compareAt} locale={locale} size="sm" />
          </div>
        </div>
        <Button onClick={onAdd} disabled={disabled} className="shrink-0">
          {label}
        </Button>
      </div>
    </div>
  );
}
