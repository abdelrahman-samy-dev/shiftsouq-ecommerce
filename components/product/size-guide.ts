/* ══════════════════════════════════════════════════════════════
   Size systems — labels and measurement tables
   ──────────────────────────────────────────────────────────────
   products.size_system decides how sizes are named on the page
   and which table the size guide shows. Measurements are body
   measurements in centimetres (shoes: foot length). Pure data,
   bilingual, safe for client and server.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";
import type { SizeSystem } from "./pdp-logic";

type L = { en: string; ar: string };

/* ── Labels ──────────────────────────────────────────────────── */

const HEADINGS: Record<SizeSystem, L> = {
  apparel: { en: "Size", ar: "المقاس" },
  shoes: { en: "Size (EU)", ar: "المقاس (أوروبي)" },
  kids: { en: "Age", ar: "العمر" },
  waist: { en: "Waist (in)", ar: "محيط الخصر (بوصة)" },
  one_size: { en: "Size", ar: "المقاس" },
};

export function sizeHeading(system: SizeSystem, locale: Locale): string {
  return HEADINGS[system][locale];
}

function arYears(n: number): string {
  if (n === 1) return "سنة";
  if (n === 2) return "سنتان";
  return n >= 3 && n <= 10 ? "سنوات" : "سنة";
}

function arMonths(n: number): string {
  if (n === 1) return "شهر";
  if (n === 2) return "شهران";
  return n >= 3 && n <= 10 ? "أشهر" : "شهرًا";
}

/**
 * The label shown on a size button. Kids sizes stored as "8Y", "7-8Y" or
 * "6-12M" read naturally in Arabic; everything else is shown as stored.
 */
export function sizeLabel(system: SizeSystem, size: string, locale: Locale): string {
  const s = size.trim();
  if (system === "one_size" && /^(os|one ?size|one)$/i.test(s)) return locale === "ar" ? "مقاس واحد" : "One size";
  if (system !== "kids") return s;
  const m = /^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*([YM])$/i.exec(s);
  if (!m) return s;
  const [, a, b, unit] = m;
  // Ranges are isolated left-to-right so "7–8" never flips to "8–7" in Arabic.
  const range = b ? (locale === "ar" ? `⁦${a}–${b}⁩` : `${a}–${b}`) : a;
  const last = Number(b ?? a);
  const years = unit.toUpperCase() === "Y";
  if (locale === "ar") return `${range} ${years ? arYears(last) : arMonths(last)}`;
  return `${range}${years ? "Y" : "M"}`;
}

/* ── Measurement tables ──────────────────────────────────────── */

export interface SizeTable {
  title: L;
  /** Column headings; the first column is the size. */
  columns: L[];
  rows: { size: string; values: string[] }[];
  /** How to measure, one line per measurement. */
  howTo: L[];
}

const APPAREL: SizeTable = {
  title: { en: "Clothing", ar: "الملابس" },
  columns: [
    { en: "Size", ar: "المقاس" },
    { en: "Chest (cm)", ar: "الصدر (سم)" },
    { en: "Waist (cm)", ar: "الخصر (سم)" },
    { en: "Length (cm)", ar: "الطول (سم)" },
  ],
  rows: [
    { size: "XS", values: ["84–88", "70–74", "68"] },
    { size: "S", values: ["89–94", "75–80", "70"] },
    { size: "M", values: ["95–100", "81–86", "72"] },
    { size: "L", values: ["101–106", "87–92", "74"] },
    { size: "XL", values: ["107–112", "93–98", "76"] },
    { size: "XXL", values: ["113–118", "99–104", "78"] },
  ],
  howTo: [
    { en: "Chest: around the fullest part, under the arms.", ar: "الصدر: حول أعرض جزء من الصدر تحت الإبطين." },
    { en: "Waist: around your natural waistline.", ar: "الخصر: حول خط الخصر الطبيعي." },
    { en: "Length: from the highest point of the shoulder to the hem.", ar: "الطول: من أعلى نقطة في الكتف حتى الحافة السفلية." },
  ],
};

const WAIST: SizeTable = {
  title: { en: "Trousers", ar: "البناطيل" },
  columns: [
    { en: "Waist (in)", ar: "الخصر (بوصة)" },
    { en: "Waist (cm)", ar: "الخصر (سم)" },
    { en: "Hip (cm)", ar: "الورك (سم)" },
  ],
  rows: [28, 29, 30, 31, 32, 33, 34, 36, 38, 40].map((w) => ({
    size: String(w),
    values: [String(Math.round(w * 2.54)), String(Math.round(w * 2.54 + 19))],
  })),
  howTo: [
    { en: "Waist: around your natural waistline, keeping the tape comfortably loose.", ar: "الخصر: حول خط الخصر الطبيعي مع ترك الشريط مريحًا." },
    { en: "Hip: around the widest part of the hips.", ar: "الورك: حول أعرض جزء من الوركين." },
  ],
};

/** EU shoe size ↔ foot length (heel to longest toe), UK and US men. */
function shoeRow(eu: number) {
  const footCm = (eu / 1.5 - 1.5).toFixed(1);
  const uk = eu - 33.5;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return { size: String(eu), values: [footCm, eu >= 35 ? fmt(uk) : "—", eu >= 35 ? fmt(uk + 1) : "—"] };
}

const SHOES: SizeTable = {
  title: { en: "Shoes", ar: "الأحذية" },
  columns: [
    { en: "EU", ar: "أوروبي" },
    { en: "Foot length (cm)", ar: "طول القدم (سم)" },
    { en: "UK", ar: "بريطاني" },
    { en: "US", ar: "أمريكي" },
  ],
  rows: Array.from({ length: 24 }, (_, i) => shoeRow(24 + i)),
  howTo: [
    {
      en: "Stand on a sheet of paper, mark your heel and longest toe, and measure the distance. Between sizes, choose the larger one.",
      ar: "قف على ورقة وحدّد طرف الكعب وأطول إصبع ثم قِس المسافة بينهما. إذا كان القياس بين مقاسين فاختر الأكبر.",
    },
  ],
};

const KIDS: SizeTable = {
  title: { en: "Kids", ar: "الأطفال" },
  columns: [
    { en: "Age", ar: "العمر" },
    { en: "Height (cm)", ar: "الطول (سم)" },
    { en: "Chest (cm)", ar: "الصدر (سم)" },
  ],
  rows: [
    ["2Y", "92", "53"],
    ["3Y", "98", "55"],
    ["4Y", "104", "57"],
    ["5Y", "110", "59"],
    ["6Y", "116", "61"],
    ["7Y", "122", "63"],
    ["8Y", "128", "65"],
    ["9Y", "134", "67"],
    ["10Y", "140", "70"],
    ["11Y", "146", "73"],
    ["12Y", "152", "76"],
    ["13Y", "158", "79"],
    ["14Y", "164", "82"],
  ].map(([size, h, c]) => ({ size, values: [h, c] })),
  howTo: [
    { en: "Height: standing straight without shoes.", ar: "الطول: والطفل واقف باستقامة دون حذاء." },
    { en: "Chest: around the fullest part, under the arms.", ar: "الصدر: حول أعرض جزء من الصدر تحت الإبطين." },
  ],
};

const TABLES: Partial<Record<SizeSystem, SizeTable>> = { apparel: APPAREL, shoes: SHOES, kids: KIDS, waist: WAIST };

/** The table for a size system (none for one-size products). */
export function sizeTable(system: SizeSystem): SizeTable | null {
  return TABLES[system] ?? null;
}

/**
 * Table rows worth showing for this product: for shoes and waist sizes,
 * the product's own range with one size either side; otherwise all rows.
 */
export function relevantRows(table: SizeTable, system: SizeSystem, productSizes: readonly string[]): SizeTable["rows"] {
  if (system !== "shoes" && system !== "waist") return table.rows;
  const nums = productSizes.map((s) => parseFloat(s)).filter(Number.isFinite);
  if (nums.length === 0) return table.rows;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const rows = table.rows.filter((r) => {
    const n = parseFloat(r.size);
    return n >= min - 1 && n <= max + 1;
  });
  return rows.length ? rows : table.rows;
}

/** True when a table row is one of the product's sizes (highlighted in the guide). */
export function rowMatches(rowSize: string, productSizes: readonly string[]): boolean {
  const r = rowSize.trim().toUpperCase();
  return productSizes.some((s) => s.trim().toUpperCase() === r);
}
