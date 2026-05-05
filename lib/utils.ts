/* ══════════════════════════════════════════════════════════════
   Utility Functions
   ──────────────────────────────────────────────────────────────
   Pure functions with no side effects. These are shared across
   server and client components for formatting, localisation,
   and common operations.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

/**
 * Formats a numeric price with locale-aware number formatting
 * and the appropriate currency symbol.
 *
 * Uses `Intl.NumberFormat` to handle Arabic numeral conversion
 * automatically when locale is "ar".
 *
 * @param amount   - The numeric price value.
 * @param locale   - Display locale ("en" or "ar").
 * @param _currency - Reserved for future multi-currency support.
 * @returns Formatted price string (e.g. "EGP 1,500" or "١٬٥٠٠ ج.م").
 */
export function formatPrice(
  amount: number,
  locale: Locale = "en",
  _currency: string = "EGP"
): string {
  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const formattedNumber = formatter.format(amount);
  return locale === "ar" ? `${formattedNumber} ج.م` : `EGP ${formattedNumber}`;
}

/**
 * Calculates the discount percentage between a base price and sale price.
 *
 * Returns 0 if the sale price is >= base price or base price is <= 0
 * to guard against division-by-zero and invalid data.
 *
 * @param basePrice - The original (higher) price.
 * @param salePrice - The discounted (lower) price.
 * @returns Integer percentage discount (0–100), rounded.
 */
export function getDiscountPercentage(
  basePrice: number,
  salePrice: number
): number {
  if (basePrice <= 0 || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

/**
 * Generates a URL-friendly slug from arbitrary text.
 *
 * Lowercases, strips special characters, and replaces
 * whitespace/underscores with hyphens.
 *
 * @param text - The input string to slugify.
 * @returns A kebab-case URL slug.
 *
 * @example
 * ```ts
 * slugify("Men's Premium T-Shirts") // "mens-premium-t-shirts"
 * ```
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncates a string to a maximum length, appending an ellipsis
 * character ("…") when truncation occurs.
 *
 * @param text      - The string to truncate.
 * @param maxLength - Maximum character count before truncation.
 * @returns The original or truncated string.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Retrieves a locale-specific field value from a bilingual object.
 *
 * Falls back to the English (`_en`) field if the requested locale
 * field is empty, ensuring the UI always displays something.
 *
 * @param obj    - An object with locale-suffixed fields (e.g. `name_en`, `name_ar`).
 * @param field  - The field name prefix (e.g. "name", "description").
 * @param locale - The desired locale.
 * @returns The localised string, or empty string as last resort.
 *
 * @example
 * ```ts
 * getLocalizedField(product, "name", "ar") // → product.name_ar || product.name_en
 * ```
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: Locale
): string {
  const key = `${field}_${locale}` as keyof T;
  const fallbackKey = `${field}_en` as keyof T;
  return (obj[key] as string) || (obj[fallbackKey] as string) || "";
}

/**
 * Clamps a numeric value between a minimum and maximum bound.
 *
 * @param value - The value to clamp.
 * @param min   - Lower bound (inclusive).
 * @param max   - Upper bound (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Simple className concatenation utility.
 *
 * Filters out falsy values and joins the rest with spaces.
 * Replaces the need for clsx/classnames as a dependency.
 *
 * @param classes - Variable number of class strings or falsy values.
 * @returns A single space-separated className string.
 *
 * @example
 * ```ts
 * cn("base", isActive && "active", null, "extra") // "base active extra"
 * ```
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
