"use client";

/* ══════════════════════════════════════════════════════════════
   SearchOverlayTrigger — the header's search entry point.
   Contract (kept stable for the header):
     <SearchOverlayTrigger locale="en" | "ar" className? />
   Renders an icon button; opens the search experience.
   (Placeholder until the full overlay lands: links to /search.)
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchOverlayTrigger({ locale, className }: { locale: string; className?: string }) {
  const label = locale === "ar" ? "بحث" : "Search";
  return (
    <Link
      href="/search"
      aria-label={label}
      title={label}
      className={cn("inline-flex size-10 items-center justify-center rounded-sm text-text-primary hover:bg-surface", className)}
    >
      <Search className="size-5" strokeWidth={1.5} />
    </Link>
  );
}
