"use client";

/* One checkout section: number + title, then the form (open), a summary with "Edit" (done), or nothing yet. */

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { panelTitle, textLink } from "./ui";

interface CheckoutSectionProps {
  id: string;
  index: number;
  title: string;
  state: "open" | "done" | "upcoming";
  summary?: ReactNode;
  editLabel: string;
  editAria: string;
  onEdit?: () => void;
  /** Move focus to the heading when the section opens (not on first load). */
  focusOnOpen?: boolean;
  children?: ReactNode;
}

export function CheckoutSection({
  id,
  index,
  title,
  state,
  summary,
  editLabel,
  editAria,
  onEdit,
  focusOnOpen,
  children,
}: CheckoutSectionProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(state === "open");

  useEffect(() => {
    if (state === "open" && !wasOpen.current && focusOnOpen) {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    wasOpen.current = state === "open";
  }, [state, focusOnOpen]);

  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={`${id}-title`}
          ref={headingRef}
          tabIndex={-1}
          // Focus lands here only to announce the section; no ring on a heading.
          style={{ outline: "none" }}
          className={cn(panelTitle, "flex items-baseline gap-3 outline-none", state === "upcoming" && "text-text-faint")}
        >
          <span aria-hidden="true" className="font-sans text-[0.8125rem] tabular-nums tracking-normal text-text-muted">
            {String(index).padStart(2, "0")}
          </span>
          {title}
        </h2>
        {state === "done" && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={editAria}
            className={cn("min-h-10 shrink-0 text-sm text-text-primary", textLink)}
          >
            {editLabel}
          </button>
        ) : null}
      </div>
      {state === "open" ? <div className="mt-6">{children}</div> : null}
      {state === "done" && summary ? <div className="mt-3 ps-7 text-sm leading-relaxed text-text-secondary">{summary}</div> : null}
    </section>
  );
}
