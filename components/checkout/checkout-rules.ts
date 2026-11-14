/* ══════════════════════════════════════════════════════════════
   Checkout rules — pure helpers shared by the browser and the server
   ──────────────────────────────────────────────────────────────
   No React, no database: phone numbers, form schemas with
   bilingual messages, totals and promo-code messages. The server
   still prices every order itself; these helpers only make what
   the buyer sees match what the server will charge.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { FREE_SHIPPING_THRESHOLD, isKnownGovernorate, shippingFee } from "@/lib/checkout/shipping";

export type Lang = "en" | "ar";

/** Cash on delivery is refused above this order total (EGP). */
export const COD_MAX_AMOUNT = 10_000;

/* ── Money ───────────────────────────────────────────────────── */

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** "EGP 1,250" / "EGP 112.50" — Arabic: "١٬٢٥٠ ج.م". Piastres are shown only when present. */
export function formatMoney(amount: number, lang: Lang): string {
  const value = round2(Number(amount) || 0);
  const decimals = Number.isInteger(value) ? 0 : 2;
  const n = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return lang === "ar" ? `${n} ج.م` : `EGP ${n}`;
}

/* ── Phone numbers ───────────────────────────────────────────── */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic / Persian digits to 0-9 (Arabic keyboards type ٠١٠…). */
export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_DIGITS.indexOf(d);
    return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(d));
  });
}

/**
 * Egyptian mobile number → "01XXXXXXXXX" (11 digits, 010/011/012/015), or null.
 * Accepts spaces, dashes, brackets, "+20", "0020" or "20" in front, and Arabic digits.
 */
export function normalizeEgyptianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = toLatinDigits(String(input)).replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  else if (s.startsWith("00")) s = s.slice(2);
  if (s.length === 12 && s.startsWith("20")) s = `0${s.slice(2)}`;
  return /^01[0125]\d{8}$/.test(s) ? s : null;
}

/** "01012345678" (or any accepted form) → "+201012345678" for the phone field; "" when not Egyptian. */
export function egyptianMobileToE164(input: string | null | undefined): string {
  const local = normalizeEgyptianMobile(input);
  return local ? `+20${local.slice(1)}` : "";
}

/* ── Names ───────────────────────────────────────────────────── */

export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/* ── Form schemas (messages in the buyer's language) ─────────── */

const MSG = {
  en: {
    firstName: "First name must be at least 2 characters",
    lastName: "Last name must be at least 2 characters",
    email: "Please enter a valid email address",
    phone: "Enter an Egyptian mobile number: 11 digits starting with 010, 011, 012 or 015",
    governorate: "Please select a governorate",
    city: "City must be at least 2 characters",
    address: "Please enter a detailed address (street and building)",
    tooLong: "This field is too long",
  },
  ar: {
    firstName: "يجب ألا يقل الاسم الأول عن حرفين",
    lastName: "يجب ألا يقل اسم العائلة عن حرفين",
    email: "يرجى إدخال بريد إلكتروني صحيح",
    phone: "أدخل رقم هاتف محمول مصريًا من 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015",
    governorate: "يرجى اختيار المحافظة",
    city: "يجب ألا يقل اسم المدينة عن حرفين",
    address: "يرجى إدخال عنوان تفصيلي (الشارع ورقم المبنى)",
    tooLong: "هذا الحقل أطول من المسموح",
  },
} as const;

export function contactSchema(lang: Lang) {
  const m = MSG[lang];
  return z.object({
    firstName: z.string().trim().min(2, m.firstName).max(60, m.tooLong),
    lastName: z.string().trim().min(2, m.lastName).max(60, m.tooLong),
    email: z.string().trim().email(m.email).max(254, m.tooLong),
    phone: z.string().refine((v) => normalizeEgyptianMobile(v) !== null, m.phone),
  });
}

export function shippingSchema(lang: Lang) {
  const m = MSG[lang];
  return z.object({
    governorate: z.string().refine(isKnownGovernorate, m.governorate),
    city: z.string().trim().min(2, m.city).max(80, m.tooLong),
    address: z.string().trim().min(5, m.address).max(200, m.tooLong),
    apartment: z.string().trim().max(40, m.tooLong),
    postalCode: z.string().trim().max(20, m.tooLong),
    saveAddress: z.boolean(),
  });
}

/* ── Totals (same formula as createOrder / place_order) ───────── */

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  /** Subtotal after the promo discount: decides free shipping. */
  afterDiscount: number;
  /** null until a governorate is chosen (unless the order already ships free). */
  shipping: number | null;
  total: number;
}

export function checkoutTotals(subtotal: number, discount: number, governorate?: string | null): CheckoutTotals {
  const sub = round2(Math.max(0, subtotal));
  const disc = round2(Math.min(Math.max(0, discount), sub));
  const afterDiscount = round2(sub - disc);
  const shipping =
    governorate && isKnownGovernorate(governorate)
      ? shippingFee(governorate, afterDiscount)
      : afterDiscount >= FREE_SHIPPING_THRESHOLD
        ? 0
        : null;
  return { subtotal: sub, discount: disc, afterDiscount, shipping, total: round2(afterDiscount + (shipping ?? 0)) };
}

/** How far the order is from free shipping (uses the subtotal after discount, like the server). */
export function freeShippingProgress(afterDiscount: number): { qualifies: boolean; remaining: number; percent: number } {
  const remaining = round2(Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount));
  return {
    qualifies: remaining === 0,
    remaining,
    percent: Math.max(0, Math.min(100, Math.round((afterDiscount / FREE_SHIPPING_THRESHOLD) * 100))),
  };
}

/* ── Promo codes ─────────────────────────────────────────────── */

export type PromoFailure = "invalid" | "expired" | "used_up" | "min_order";

export function promoErrorMessage(reason: PromoFailure | undefined, lang: Lang, minOrder?: number): string {
  const ar = lang === "ar";
  switch (reason) {
    case "expired":
      return ar ? "انتهت صلاحية رمز الخصم هذا." : "This promo code has expired.";
    case "used_up":
      return ar ? "استُنفد عدد مرات استخدام رمز الخصم هذا." : "This promo code has reached its usage limit.";
    case "min_order":
      return minOrder
        ? ar
          ? `يتطلب هذا الرمز ألا يقل المجموع الفرعي عن ${formatMoney(minOrder, lang)}.`
          : `This code needs a subtotal of at least ${formatMoney(minOrder, lang)}.`
        : ar
          ? "المجموع الفرعي أقل من الحد الأدنى لهذا الرمز."
          : "Your subtotal is below the minimum for this code.";
    default:
      return ar ? "رمز الخصم غير صحيح." : "This promo code isn't valid.";
  }
}
