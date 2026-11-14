"use client";

/* ══════════════════════════════════════════════════════════════
   ErrorState — Premium Error Feedback Component
   ──────────────────────────────────────────────────────────────
   A visually polished, branded error state used across all
   error.tsx boundaries. Features gradient accents, animated
   icons, and clear recovery actions.

   Props allow per-route customisation of title, message,
   icon, and action buttons.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { RotateCcw, Home, ShoppingBag, ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, pickLocalized, type Localized } from "@/components/providers/LocaleProvider";

/* ── Types ───────────────────────────────────────────────────── */

interface ErrorStateProps {
  /** Primary heading text (a string, or { en, ar }). */
  title?: Localized;
  /** Descriptive body copy explaining the issue. */
  message?: Localized;
  /** Technical error digest ID for support reference. */
  digest?: string;
  /** Reset function from the error boundary. */
  onReset: () => void;
  /** Label for the primary retry button. */
  retryLabel?: Localized;
  /** Secondary navigation link (e.g., /shop or /). */
  secondaryHref?: string;
  /** Label for the secondary link button. */
  secondaryLabel?: Localized;
  /** Icon variant for the secondary button. */
  secondaryIcon?: "home" | "shop" | "back";
}

/* ── Icon Map ────────────────────────────────────────────────── */

const DEFAULTS = {
  title: { en: "Something went wrong", ar: "حدث خطأ ما" },
  message: { en: "An unexpected error occurred. Please try again.", ar: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." },
  retryLabel: { en: "Try Again", ar: "إعادة المحاولة" },
  secondaryLabel: { en: "Go Home", ar: "العودة إلى الرئيسية" },
} satisfies Record<string, Localized>;

const secondaryIcons = {
  home: Home,
  shop: ShoppingBag,
  back: ArrowLeft,
};

/* ── Component ───────────────────────────────────────────────── */

/**
 * ErrorState provides a premium, branded error page layout.
 *
 * Features:
 * - SVG illustrated error icon (no emoji)
 * - Subtle gradient background accent
 * - Animated entrance (respects reduced motion)
 * - Error digest reference for debugging
 * - Clear primary (retry) and secondary (navigate) actions
 */
export default function ErrorState({
  title = DEFAULTS.title,
  message = DEFAULTS.message,
  digest,
  onReset,
  retryLabel = DEFAULTS.retryLabel,
  secondaryHref = "/",
  secondaryLabel = DEFAULTS.secondaryLabel,
  secondaryIcon = "home",
}: ErrorStateProps) {
  const prefersReducedMotion = useReducedMotion();
  const locale = useLocale();
  const isAr = locale === "ar";
  const SecondaryIcon = secondaryIcons[secondaryIcon];

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center gap-8 text-center max-w-lg w-full"
      >
        {/* ── Illustrated Error Icon ───────────────────────── */}
        <div className="relative">
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: "var(--destructive)" }}
          />

          {/* Icon container */}
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="relative w-24 h-24 rounded-full flex items-center justify-center border-2"
            style={{
              background: "var(--destructive-bg)",
              borderColor: "var(--destructive-border)",
            }}
          >
            {/* Custom SVG icon — no emoji */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: "var(--destructive)" }}
            >
              <path
                d="M12 9v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="16"
                r="1"
                fill="currentColor"
              />
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>

        {/* ── Text Content ────────────────────────────────── */}
        <div className="space-y-3">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {pickLocalized(title, locale)}
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            {pickLocalized(message, locale)}
          </p>
        </div>

        {/* ── Error Digest (for support/debugging) ────────── */}
        {digest && (
          <div
            className="text-xs font-mono px-3 py-1.5 rounded-lg select-all"
            style={{
              color: "var(--text-faint)",
              background: "var(--surface-inset)",
            }}
            title={isAr ? "رمز مرجعي للخطأ" : "Error reference code"}
            dir="ltr"
          >
            {isAr ? "المرجع" : "Ref"}: {digest}
          </div>
        )}

        {/* ── Action Buttons ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            className="btn-primary group flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
          >
            <RotateCcw
              size={17}
              strokeWidth={2}
              className="group-hover:-rotate-180 transition-transform duration-500"
            />
            <span>{pickLocalized(retryLabel, locale)}</span>
          </button>

          <Link
            href={secondaryHref}
            className="btn-secondary flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 text-[15px] font-semibold transition-all"
          >
            <SecondaryIcon size={17} strokeWidth={2} className={secondaryIcon === "back" ? "rtl:rotate-180" : undefined} />
            <span>{pickLocalized(secondaryLabel, locale)}</span>
          </Link>
        </div>

        {/* ── Decorative bottom line ──────────────────────── */}
        <div
          className="w-16 h-1 rounded-full mt-4"
          style={{
            background: "linear-gradient(90deg, var(--primary), var(--destructive))",
            opacity: 0.3,
          }}
        />
      </motion.div>
    </div>
  );
}
