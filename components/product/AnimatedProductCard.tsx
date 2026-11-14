"use client";

/* ══════════════════════════════════════════════════════════════
   AnimatedProductCard — Scroll-Triggered Reveal Wrapper
   ──────────────────────────────────────────────────────────────
   Server-rendered cards stay visible in the HTML (no opacity:0
   before JavaScript runs, so the first cards can be the LCP).
   After hydration, cards that are still below the fold are
   hidden and faded up when they scroll into view. Cards already
   on screen are left alone. Respects prefers-reduced-motion.
   No animation library is needed for this.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, type ReactNode } from "react";

interface AnimatedProductCardProps {
  /** The ProductCard content to wrap. */
  children: ReactNode;
  /** Index within the grid, used for stagger delay. */
  index?: number;
}

const HIDDEN = ["opacity-0", "translate-y-6"];

export default function AnimatedProductCard({
  children,
  index = 0,
}: AnimatedProductCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (first) {
          first = false;
          if (entry.isIntersecting) {
            observer.disconnect(); // already visible: no animation
            return;
          }
          el.classList.add(...HIDDEN);
          return;
        }
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${(index % 4) * 80}ms`;
          el.classList.remove(...HIDDEN);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="h-full transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
    >
      {children}
    </div>
  );
}
