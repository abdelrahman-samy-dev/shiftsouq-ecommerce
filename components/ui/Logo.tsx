/* ══════════════════════════════════════════════════════════════
   Logo — Brand Identity Component
   ──────────────────────────────────────────────────────────────
   Reusable, bilingual, theme-aware logo comprising:
   - A minimalist SVG icon (stylised overlapping "S" shapes)
   - Brand typography: "ShiftSouq" (en) / "شيفت سوق" (ar)

   The icon uses `currentColor` so it auto-adapts to the active
   theme (light / dark) without extra CSS overrides.

   Props:
     locale   – "en" | "ar" — determines language of the wordmark
     className – extra classes for the wrapper element
     iconOnly – if true, hides the wordmark (e.g. for favicons)
     size     – "sm" | "md" | "lg" — controls icon + text scale
   ══════════════════════════════════════════════════════════════ */

import { useId } from "react";
import type { Locale } from "@/lib/types";

interface LogoProps {
  locale?: Locale;
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  hideTextOnMobile?: boolean;
}

/* ── Icon size map ─────────────────────────────────────────── */
const iconSizeMap = {
  sm: { icon: 28, text: "text-base sm:text-lg" },
  md: { icon: 36, text: "text-lg sm:text-xl" },
  lg: { icon: 44, text: "text-xl sm:text-2xl" },
} as const;

/* ── Abstract SVG Icon ─────────────────────────────────────── */

/**
 * ShiftSouqIcon — A minimalist, premium abstract mark.
 *
 * Two overlapping geometric parallelogram shapes create a
 * stylised "S" that evokes movement, shifting, and dynamism.
 * Uses currentColor for seamless theme adaptation.
 */
function ShiftSouqIcon({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  const clipId = `clip_${id}`;
  const maskId = `mask_${id}`;
  const paint0Id = `paint0_${id}`;
  const paint1Id = `paint1_${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 text-zinc-950 dark:text-white transition-colors duration-300"
      aria-hidden="true"
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M34.2105 0H15.7895C7.06919 0 0 7.06919 0 15.7895V34.2105C0 42.9308 7.06919 50 15.7895 50H34.2105C42.9308 50 50 42.9308 50 34.2105V15.7895C50 7.06919 42.9308 0 34.2105 0Z"
          fill="currentColor"
        />
        <mask
          id={maskId}
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="12"
          y="12"
          width="26"
          height="26"
        >
          <path
            d="M25 37.5C31.9036 37.5 37.5 31.9036 37.5 25C37.5 18.0964 31.9036 12.5 25 12.5C18.0964 12.5 12.5 18.0964 12.5 25C12.5 31.9036 18.0964 37.5 25 37.5Z"
            fill="#D9D9D9"
          />
        </mask>
        <g mask={`url(#${maskId})`}>
          <path
            d="M25 37.5C31.9036 37.5 37.5 31.9036 37.5 25C37.5 18.0964 31.9036 12.5 25 12.5C18.0964 12.5 12.5 18.0964 12.5 25C12.5 31.9036 18.0964 37.5 25 37.5Z"
            fill={`url(#${paint0Id})`}
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.8419 8.55261V11.8421H7.89453V12.5H11.8419V17.1052H7.89453V17.7631H11.8419V22.3684H7.89453V23.0263H11.8419V27.6316H7.89453V28.2895H11.8419V32.8947H7.89453V33.5526H11.8419V38.1579H7.89453V38.8158H11.8419V42.7631H12.4998V38.8158H17.1051V42.7631H17.763V38.8158H22.3682V42.7631H23.0261V38.8158H27.6314V42.7631H28.2893V38.8158H32.8945V42.7631H33.5524V38.8158H38.1577V42.7631H38.8156V38.8158H42.1051V38.1579H38.8156V33.5526H42.1051V32.8947H38.8156V28.2895H42.1051V27.6316H38.8156V23.0263H42.1051V22.3684H38.8156V17.7631H42.1051V17.1052H38.8156V12.5H42.1051V11.8421H38.8156V8.55261H38.1577V11.8421H33.5524V8.55261H32.8945V11.8421H28.2893V8.55261H27.6314V11.8421H23.0261V8.55261H22.3682V11.8421H17.763V8.55261H17.1051V11.8421H12.4998V8.55261H11.8419ZM38.1577 38.1579V33.5526H33.5524V38.1579H38.1577ZM32.8945 38.1579V33.5526H28.2893V38.1579H32.8945ZM27.6314 38.1579V33.5526H23.0261V38.1579H27.6314ZM22.3682 38.1579V33.5526H17.763V38.1579H22.3682ZM17.1051 38.1579V33.5526H12.4998V38.1579H17.1051ZM17.1051 32.8947H12.4998V28.2895H17.1051V32.8947ZM22.3682 32.8947H17.763V28.2895H22.3682V32.8947ZM27.6314 32.8947H23.0261V28.2895H27.6314V32.8947ZM32.8945 32.8947H28.2893V28.2895H32.8945V32.8947ZM38.1577 32.8947H33.5524V28.2895H38.1577V32.8947ZM38.1577 27.6316V23.0263H33.5524V27.6316H38.1577ZM32.8945 27.6316V23.0263H28.2893V27.6316H32.8945ZM27.6314 27.6316V23.0263H23.0261V27.6316H27.6314ZM22.3682 27.6316V23.0263H17.763V27.6316H22.3682ZM17.1051 27.6316V23.0263H12.4998V27.6316H17.1051ZM17.1051 22.3684H12.4998V17.7631H17.1051V22.3684ZM22.3682 22.3684H17.763V17.7631H22.3682V22.3684ZM27.6314 22.3684H23.0261V17.7631H27.6314V22.3684ZM32.8945 22.3684H28.2893V17.7631H32.8945V22.3684ZM38.1577 22.3684H33.5524V17.7631H38.1577V22.3684ZM38.1577 17.1052V12.5H33.5524V17.1052H38.1577ZM32.8945 17.1052V12.5H28.2893V17.1052H32.8945ZM27.6314 17.1052V12.5H23.0261V17.1052H27.6314ZM22.3682 17.1052V12.5H17.763V17.1052H22.3682ZM17.1051 17.1052V12.5H12.4998V17.1052H17.1051Z"
            fill={`url(#${paint1Id})`}
          />
        </g>
      </g>
      <defs>
        <linearGradient
          id={paint0Id}
          x1="25"
          y1="12.5"
          x2="29.6875"
          y2="41.4062"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--background, #ffffff)" />
          <stop offset="1" stopColor="var(--background, #ffffff)" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient
          id={paint1Id}
          x1="18.4208"
          y1="15.4605"
          x2="24.9998"
          y2="38.8158"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--background, #ffffff)" />
          <stop offset="1" stopColor="var(--background, #ffffff)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="50" height="50" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/* ── Main Logo Component ───────────────────────────────────── */

export function Logo({
  locale = "en",
  className = "",
  iconOnly = false,
  size = "md",
  hideTextOnMobile = false,
}: LogoProps) {
  const { icon, text } = iconSizeMap[size];
  const isAr = locale === "ar";

  return (
    <span
      className={`inline-flex items-center gap-2.5 text-text-primary ${className}`}
    >
      {/* Icon */}
      <ShiftSouqIcon size={icon} />

      {/* Wordmark */}
      {!iconOnly && (
        <span
          className={`${hideTextOnMobile ? "hidden sm:inline-block" : ""} ${text} font-extrabold tracking-tight leading-none select-none whitespace-nowrap`}
        >
          {isAr ? (
            /* Arabic wordmark */
            <span
              className="font-bold"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              شيفت{" "}
              <span className="font-medium text-text-muted">سوق</span>
            </span>
          ) : (
            /* English wordmark */
            <>
              Shift
              <span className="font-medium text-text-muted">Souq</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}

/* ── Standalone Icon Export (for favicon, etc.) ────────────── */

export { ShiftSouqIcon };
