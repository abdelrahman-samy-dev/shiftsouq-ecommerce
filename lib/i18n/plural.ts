/* ══════════════════════════════════════════════════════════════
   Plurals & counts
   ──────────────────────────────────────────────────────────────
   Arabic has six plural forms (zero, one, two, few, many, other):
   "منتج واحد", "منتجان", "3 منتجات", "11 منتجًا", "100 منتج".
   Intl.PluralRules picks the right one; "{count}" in a form is
   replaced by the number, formatted like prices for that locale.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export interface PluralForms {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

const numberLocale = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-US");

/** Formats a plain number the same way prices are formatted. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

/** Picks the plural form for `count` and fills in "{count}". */
export function pluralize(locale: Locale, count: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale === "ar" ? "ar" : "en").select(count);
  const template = forms[rule] ?? forms.other;
  return template.replace("{count}", formatNumber(count, locale));
}

/** "1 item" / "3 items" — "منتج واحد" / "3 منتجات" / "11 منتجًا". */
export function formatItemCount(locale: Locale, count: number): string {
  return locale === "ar"
    ? pluralize(locale, count, {
        zero: "لا توجد منتجات",
        one: "منتج واحد",
        two: "منتجان",
        few: "{count} منتجات",
        many: "{count} منتجًا",
        other: "{count} منتج",
      })
    : pluralize(locale, count, { one: "{count} item", other: "{count} items" });
}
