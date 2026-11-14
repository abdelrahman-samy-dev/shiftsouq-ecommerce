"use client";

/* ══════════════════════════════════════════════════════════════
   AnnouncementBar — ink strip above the header (32px)
   ──────────────────────────────────────────────────────────────
   Rotates the store_settings messages with a soft fade. Rotation
   pauses while the bar is hovered or focused, and does not run
   at all for visitors who prefer reduced motion (they can step
   through with the arrows). "Hide" stores a session cookie the
   server reads, so a hidden bar never flashes back on the next
   page (no layout shift).
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ANNOUNCEMENT_COOKIE, rotateIndex } from "./shell-rules";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

interface AnnouncementBarProps {
  messages: string[];
  /** Fingerprint of the messages (a new set shows again after hiding). */
  dismissKey: string;
  labels: { region: string; prev: string; next: string; dismiss: string };
}

export function AnnouncementBar({ messages, dismissKey, labels }: AnnouncementBarProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );

  const count = messages.length;
  const rotating = count > 1 && !paused && !reduced && !manual;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setInterval(() => setIndex((i) => rotateIndex(i, count)), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [rotating, count]);

  if (hidden || count === 0) return null;

  const step = (dir: 1 | -1) => {
    setManual(true);
    setIndex((i) => rotateIndex(i, count, dir));
  };

  const dismiss = () => {
    document.cookie = `${ANNOUNCEMENT_COOKIE}=${dismissKey}; path=/; samesite=lax`;
    setHidden(true);
  };

  const arrow =
    "inline-flex h-8 w-10 shrink-0 items-center justify-center text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-current focus-visible:-outline-offset-4";

  return (
    <section
      aria-label={labels.region}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      className="relative z-50 h-[var(--announcement-height)] bg-text-primary text-background dark:bg-surface dark:text-text-primary dark:border-b dark:border-border"
    >
      <div className="mx-auto flex h-full max-w-[var(--container-max)] items-center px-1 md:px-4">
        <div className="flex w-20 shrink-0 justify-end">
          {count > 1 ? (
            <button type="button" onClick={() => step(-1)} aria-label={labels.prev} className={arrow}>
              <ChevronLeft className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>

        <div className="grid min-w-0 flex-1 [grid-template-areas:'stack']" aria-live={manual ? "polite" : "off"}>
          {messages.map((message, i) => (
            <p
              key={i}
              aria-hidden={i !== index}
              className={cn(
                "[grid-area:stack] truncate text-center text-[0.75rem] leading-[var(--announcement-height)] tracking-[0.01em] rtl:tracking-normal",
                "transition-opacity duration-500 ease-out motion-reduce:transition-none",
                i === index ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {message}
            </p>
          ))}
        </div>

        <div className="flex w-20 shrink-0 justify-end">
          {count > 1 ? (
            <button type="button" onClick={() => step(1)} aria-label={labels.next} className={cn(arrow, "me-auto")}>
              <ChevronRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.5} />
            </button>
          ) : null}
          <button type="button" onClick={dismiss} aria-label={labels.dismiss} title={labels.dismiss} className={arrow}>
            <X className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
