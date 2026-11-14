"use client";

/* ══════════════════════════════════════════════════════════════
   SearchOverlayTrigger — the header's search entry point.
   Contract (kept stable for the header):
     <SearchOverlayTrigger locale="en" | "ar" className? />
   Renders an icon button that opens the search panel (below the
   header on desktop, full screen on phones). The panel's code
   loads on first hover/focus/open; "/" or Ctrl/⌘+K opens it from
   anywhere outside a text field. Without JavaScript the button
   is inert and /search still works.
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const loadPanel = () => import("./SearchPanel");
const SearchPanel = dynamic(loadPanel, { ssr: false });

/** Only one trigger on the page answers the keyboard shortcut. */
let shortcutOwner: string | null = null;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function SearchOverlayTrigger({ locale, className }: { locale: string; className?: string }) {
  const lang = locale === "ar" ? "ar" : "en";
  const label = lang === "ar" ? "بحث" : "Search";
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState(0);

  const openPanel = useCallback(() => {
    // Desktop: the panel hangs under the header. Phones: full screen.
    const header = buttonRef.current?.closest("header") ?? document.querySelector("header");
    const wide = window.matchMedia("(min-width: 768px)").matches;
    setTop(wide && header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0);
    setMounted(true);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (shortcutOwner === null) shortcutOwner = id;
    if (shortcutOwner !== id) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) || (k === "k" && (e.metaKey || e.ctrlKey))) {
        if (document.querySelector("dialog[open]")) return;
        e.preventDefault();
        openPanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (shortcutOwner === id) shortcutOwner = null;
    };
  }, [id, openPanel]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPanel}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          // text-current: inherits white over the transparent home header.
          "inline-flex size-10 items-center justify-center rounded-sm text-current transition-colors hover:bg-surface/60",
          className,
        )}
      >
        <Search className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </button>
      {mounted ? <SearchPanel locale={lang} open={open} top={top} onClose={close} /> : null}
    </>
  );
}
