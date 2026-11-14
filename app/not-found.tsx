/* ══════════════════════════════════════════════════════════════
   Not Found — 404 Page
   ──────────────────────────────────────────────────────────────
   Displayed when a user navigates to a route that doesn't exist.
   Premium design with animated SVG, clear messaging, and
   helpful navigation links. Bilingual: follows NEXT_LOCALE.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Home, ShoppingBag, Search } from "lucide-react";
import { getLocaleAndDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { dict } = await getLocaleAndDictionary();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-8 text-center max-w-lg w-full">
        {/* ── 404 Display ─────────────────────────────────── */}
        <div className="relative select-none">
          {/* Glow behind the number */}
          <div
            className="absolute inset-0 blur-3xl opacity-20 rounded-full"
            style={{ background: "var(--primary)" }}
          />

          <p
            aria-hidden="true"
            className="relative text-[120px] sm:text-[160px] font-black leading-none tracking-tighter"
            style={{
              color: "var(--text-primary)",
              opacity: 0.08,
            }}
          >
            404
          </p>

          {/* Overlaid icon */}
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{
                background: "var(--surface-elevated)",
                borderColor: "var(--border)",
              }}
            >
              <Search
                aria-hidden="true"
                size={32}
                strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>
        </div>

        {/* ── Text Content ────────────────────────────────── */}
        <div className="space-y-3 -mt-4">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {dict.notFound.title}
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            {dict.notFound.message}
          </p>
        </div>

        {/* ── Action Buttons ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="btn-primary group flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
          >
            <Home size={17} strokeWidth={2} />
            <span>{dict.common.goHome}</span>
          </Link>

          <Link
            href="/shop"
            className="btn-secondary flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold transition-all"
          >
            <ShoppingBag size={17} strokeWidth={2} />
            <span>{dict.common.browseShop}</span>
          </Link>
        </div>

        {/* ── Decorative bottom line ──────────────────────── */}
        <div
          className="w-16 h-1 rounded-full mt-4"
          style={{
            background: "linear-gradient(90deg, var(--primary), var(--border))",
            opacity: 0.4,
          }}
        />
      </div>
    </div>
  );
}
