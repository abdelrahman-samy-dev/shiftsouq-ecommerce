/* ══════════════════════════════════════════════════════════════
   Size groups and natural size order (client-safe, pure)
   ──────────────────────────────────────────────────────────────
   The database's size_group() files every size under one system,
   so clothing, waist, shoe and kids sizes are never mixed in one
   list. Inside a group sizes follow how people read them
   (XS → XXL, 6M → 12Y, 39 → 46), never alphabetically.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export const SIZE_GROUPS = ["apparel", "waist", "shoes", "kids", "one_size"] as const;
export type SizeGroup = (typeof SIZE_GROUPS)[number];

export const SIZE_GROUP_LABELS: Record<SizeGroup, Record<Locale, string>> = {
  apparel: { en: "Clothing", ar: "الملابس" },
  waist: { en: "Waist", ar: "مقاس الخصر" },
  shoes: { en: "Shoes (EU)", ar: "الأحذية (المقاس الأوروبي)" },
  kids: { en: "Kids", ar: "الأطفال" },
  one_size: { en: "One size", ar: "مقاس واحد" },
};

export function isSizeGroup(value: string): value is SizeGroup {
  return (SIZE_GROUPS as readonly string[]).includes(value);
}

/** "shoes.42" → { group: "shoes", value: "42" }; a bare "M" has no group. */
export function parseSizeToken(token: string): { group: SizeGroup | null; value: string } {
  const dot = token.indexOf(".");
  if (dot > 0) {
    const group = token.slice(0, dot);
    if (isSizeGroup(group)) return { group, value: token.slice(dot + 1) };
  }
  return { group: null, value: token };
}

export function sizeToken(group: SizeGroup, value: string): string {
  return `${group}.${value}`;
}

/** Shows "OS" as "One size" and the rest as stored. */
export function sizeLabel(value: string, locale: Locale): string {
  if (/^(os|o\/s|one ?-?size|free ?size|free)$/i.test(value.trim())) return SIZE_GROUP_LABELS.one_size[locale];
  return value;
}

/** Letter sizes on one scale: XXS −3 … S −1, M 0, L 1 … XXXL 4 (2XL = XXL). */
function letterRank(part: string): number | null {
  const m = /^(\d)?(X*)(S|M|L)$/.exec(part);
  if (!m) return null;
  const xs = m[1] ? Number(m[1]) : m[2].length;
  if (m[3] === "M") return xs === 0 ? 0 : null;
  return m[3] === "S" ? -(1 + xs) : 1 + xs;
}

/**
 * Sort key: [kind, value]. Kinds: 0 letter sizes, 1 ages (months),
 * 2 numbers, 3 anything else (compared as text).
 */
export function sizeSortKey(raw: string): [number, number] {
  const v = raw.trim().toUpperCase();
  const parts = v.split("/").map((p) => p.trim());
  const letters = parts.map(letterRank);
  if (letters.every((r): r is number => r !== null)) {
    return [0, letters.reduce((a, b) => a + b, 0) / letters.length];
  }
  const age = /^(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*(Y|YR|YRS|YEAR|YEARS|M|MO|MOS|MONTH|MONTHS)$/.exec(v);
  if (age) {
    const months = /^M/.test(age[3]) ? 1 : 12;
    return [1, Number(age[1]) * months + (age[2] ? 0.5 : 0)];
  }
  const waist = /^W?(\d{2})\s*(?:\/|X|L)\s*(\d{2})$/.exec(v);
  if (waist) return [2, Number(waist[1]) + Number(waist[2]) / 100];
  const num = /^(?:EU\s*)?(\d+(?:\.\d+)?)(?:\s*EU)?$/.exec(v);
  if (num) return [2, Number(num[1])];
  return [3, 0];
}

export function compareSizes(a: string, b: string): number {
  const [ka, va] = sizeSortKey(a);
  const [kb, vb] = sizeSortKey(b);
  if (ka !== kb) return ka - kb;
  if (va !== vb) return va - vb;
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

export interface SizeOption {
  group: SizeGroup;
  value: string;
  count: number;
}

/** Groups size options in display order, each group sorted naturally. */
export function groupSizeOptions(options: readonly SizeOption[]): { group: SizeGroup; options: SizeOption[] }[] {
  return SIZE_GROUPS.map((group) => ({
    group,
    options: options.filter((o) => o.group === group).sort((a, b) => compareSizes(a.value, b.value)),
  })).filter((g) => g.options.length > 0);
}
