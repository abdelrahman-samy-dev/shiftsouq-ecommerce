"use client";

/* ══════════════════════════════════════════════════════════════
   MobileMenu — the menu button (below the desktop-nav breakpoint)
   ──────────────────────────────────────────────────────────────
   Only the button ships with the page. The drawer (MobileMenuPanel)
   is fetched when the visitor reaches for the button (pointer down
   / focus) and mounts on the first tap, so a closed menu costs
   nothing on first load. Any navigation closes it.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Viewer } from "@/lib/dal/navigation";
import type { Locale } from "@/lib/types";
import { headerIcon } from "./HeaderActions";
import { shellCopy } from "./copy";
import type { MenuItem } from "./shell-rules";
import { cn } from "@/lib/utils";

const loadPanel = () => import("./MobileMenuPanel");
const MobileMenuPanel = dynamic(loadPanel, { ssr: false });

interface MobileMenuProps {
  items: MenuItem[];
  locale: Locale;
  viewer: Promise<Viewer | null>;
  className?: string;
}

export function MobileMenu({ items, locale, viewer, className }: MobileMenuProps) {
  const copy = shellCopy(locale);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        aria-label={copy.openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(headerIcon, "-ms-2", className)}
      >
        <Menu className="size-5" strokeWidth={1.5} />
      </button>

      {mounted ? <MobileMenuPanel items={items} locale={locale} viewer={viewer} open={open} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
