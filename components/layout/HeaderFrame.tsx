"use client";

/* ══════════════════════════════════════════════════════════════
   HeaderFrame — the sticky <header> and its two looks
   ──────────────────────────────────────────────────────────────
   On the home page the header sits transparently over the hero
   (white text). It turns into solid paper with a hairline as
   soon as the page scrolls, or while it is hovered or holds
   keyboard focus (menus, focus rings stay readable). Every other
   page gets the solid header. Children style themselves with
   `group-data-[overlay=true]/header:*`.
   Height is fixed by --header-height: no layout shift.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [isHome]);

  const overlay = isHome && !scrolled && !hovered && !focused;

  return (
    <header
      data-overlay={overlay}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn(
        "group/header sticky top-0 z-40 h-[var(--header-height)] border-b",
        "transition-[background-color,color,border-color] duration-300 ease-out motion-reduce:transition-none",
        overlay ? "border-transparent bg-transparent text-white" : "border-border bg-background text-text-primary",
      )}
    >
      {children}
    </header>
  );
}
