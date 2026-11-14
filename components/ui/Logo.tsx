/* ══════════════════════════════════════════════════════════════
   Logo — the store wordmark
   ──────────────────────────────────────────────────────────────
   Typographic and white-label: the name comes from lib/brand,
   set in the display serif (Latin) or IBM Plex Sans Arabic
   (Arabic). It inherits the text colour, so it works on paper,
   on photography (transparent header) and in both themes.
   ══════════════════════════════════════════════════════════════ */

import { brand, t } from "@/lib/brand/config";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LogoProps {
  locale?: Locale;
  className?: string;
  /** A monogram (first letter) instead of the full name. */
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  /** Kept for older callers; the wordmark is always shown. */
  hideTextOnMobile?: boolean;
}

const sizes = {
  sm: "text-[1.375rem] rtl:text-[1.1875rem]",
  md: "text-[1.625rem] md:text-[1.875rem] rtl:text-[1.3125rem] md:rtl:text-[1.5rem]",
  lg: "text-[2.25rem] md:text-[2.75rem] rtl:text-[1.875rem] md:rtl:text-[2.25rem]",
} as const;

export function Logo({ locale = "en", className, iconOnly = false, size = "md" }: LogoProps) {
  const name = t(brand.name, locale);

  if (iconOnly) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-sm bg-text-primary text-background font-display text-xl leading-none",
          className,
        )}
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap font-display leading-none tracking-[-0.01em] select-none",
        "rtl:font-semibold rtl:tracking-normal",
        sizes[size],
        className,
      )}
    >
      {name}
    </span>
  );
}
