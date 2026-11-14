/* ══════════════════════════════════════════════════════════════
   Checkout rules — pure helpers shared by the browser and the server
   ──────────────────────────────────────────────────────────────
   No React, no database: phone numbers, form schemas with
   bilingual messages, totals, payment options and promo-code
   messages. The server still prices every order itself; these
   helpers only make what the buyer sees match what the server
   will charge (same settings, same formula).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { FREE_SHIPPING_THRESHOLD, governorateName, isKnownGovernorate } from "@/lib/checkout/shipping";
import { DEFAULT_SETTINGS, shippingFeeFor, type ShippingSettings } from "@/lib/settings/types";

export type Lang = "en" | "ar";
export type PaymentMethod = "cod" | "card" | "wallet";

/** Cash on delivery is refused above this order total (EGP). */
export const COD_MAX_AMOUNT = 10_000;

/* ── Money ───────────────────────────────────────────────────── */

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** "EGP 1,250" / "EGP 112.50"; Arabic "1,250 ج.م" with Western digits. Piastres only when present. */
export function formatMoney(amount: number, lang: Lang): string {
  const value = round2(Number(amount) || 0);
  const decimals = Number.isInteger(value) ? 0 : 2;
  const n = new Intl.NumberFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
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

/** "01012345678" (or any accepted form) → "+201012345678"; "" when not Egyptian. */
export function egyptianMobileToE164(input: string | null | undefined): string {
  const local = normalizeEgyptianMobile(input);
  return local ? `+20${local.slice(1)}` : "";
}

/** Any accepted spelling → "010 1234 5678" for display; the input unchanged when not Egyptian. */
export function formatEgyptianMobile(input: string | null | undefined): string {
  const local = normalizeEgyptianMobile(input);
  return local ? `${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7)}` : String(input ?? "");
}

/** "12 Abbas St, Floor 3, Nasr City, Cairo" (Arabic comma in Arabic). */
export function formatAddress(
  a: { address?: string | null; apartment?: string | null; city?: string | null; governorate?: string | null },
  lang: Lang,
): string {
  return [a.address, a.apartment, a.city, governorateName(a.governorate, lang)]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(lang === "ar" ? "، " : ", ");
}

/* ── Names and emails ────────────────────────────────────────── */

export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Emails compare case-insensitively, without surrounding spaces. */
export const normalizeEmail = (s: string | null | undefined): string => String(s ?? "").trim().toLowerCase();

/** "ss-20261114-1a2b3c " → "SS-20261114-1A2B3C". */
export const normalizeOrderNumber = (s: string | null | undefined): string =>
  toLatinDigits(String(s ?? ""))
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/* ── Form schemas (messages in the buyer's language) ─────────── */

const MSG = {
  en: {
    firstName: "First name must be at least 2 characters",
    lastName: "Last name must be at least 2 characters",
    fullName: "Please enter the recipient's full name",
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
    fullName: "يرجى إدخال الاسم الكامل للمستلم",
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

/** The checkout delivery section: recipient name + address (+ optional notes for the courier). */
export function deliverySchema(lang: Lang) {
  const m = MSG[lang];
  const c = contactSchema(lang).shape;
  const s = shippingSchema(lang).shape;
  return z.object({
    firstName: c.firstName,
    lastName: c.lastName,
    governorate: s.governorate,
    city: s.city,
    address: s.address,
    apartment: s.apartment,
    postalCode: s.postalCode,
    notes: z.string().trim().max(500, m.tooLong),
  });
}

/** A saved address (account address book): same rules as the checkout delivery step. */
export function addressSchema(lang: Lang) {
  const m = MSG[lang];
  return z.object({
    label: z.string().trim().max(40, m.tooLong),
    fullName: z.string().trim().min(2, m.fullName).max(120, m.tooLong),
    phone: z.string().refine((v) => normalizeEgyptianMobile(v) !== null, m.phone),
    governorate: z.string().refine(isKnownGovernorate, m.governorate),
    city: z.string().trim().min(2, m.city).max(80, m.tooLong),
    address: z.string().trim().min(5, m.address).max(200, m.tooLong),
    apartment: z.string().trim().max(40, m.tooLong),
    postalCode: z.string().trim().max(20, m.tooLong),
    isDefault: z.boolean(),
  });
}

export type AddressInput = z.infer<ReturnType<typeof addressSchema>>;

/** Field → first message, for inline errors. */
export function fieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

/* ── Totals (same formula as createOrder / place_order) ───────── */

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  /** Subtotal after the promo discount: decides free delivery. */
  afterDiscount: number;
  /** null until a governorate is chosen (unless the order already ships free). */
  shipping: number | null;
  total: number;
}

const DEFAULT_SHIPPING: ShippingSettings = DEFAULT_SETTINGS.shipping;

export function checkoutTotals(
  subtotal: number,
  discount: number,
  governorate?: string | null,
  rates: ShippingSettings = DEFAULT_SHIPPING,
): CheckoutTotals {
  const sub = round2(Math.max(0, subtotal));
  const disc = round2(Math.min(Math.max(0, discount), sub));
  const afterDiscount = round2(sub - disc);
  const freeAbove = rates.freeThreshold > 0 && afterDiscount >= rates.freeThreshold;
  const shipping =
    governorate && isKnownGovernorate(governorate)
      ? shippingFeeFor(rates, governorate, afterDiscount)
      : freeAbove
        ? 0
        : null;
  return { subtotal: sub, discount: disc, afterDiscount, shipping, total: round2(afterDiscount + (shipping ?? 0)) };
}

/**
 * How far the order is from free delivery (subtotal after discount, like the server).
 * A threshold of 0 means the store never ships free: percent 0, never qualifies.
 */
export function freeShippingProgress(
  afterDiscount: number,
  threshold: number = FREE_SHIPPING_THRESHOLD,
): { qualifies: boolean; remaining: number; percent: number } {
  if (!(threshold > 0)) return { qualifies: false, remaining: 0, percent: 0 };
  const remaining = round2(Math.max(0, threshold - afterDiscount));
  return {
    qualifies: remaining === 0,
    remaining,
    percent: Math.max(0, Math.min(100, Math.round((afterDiscount / threshold) * 100))),
  };
}

/** "Delivery in 2–5 working days" from the store's ETA setting. */
export function deliveryEta(eta: { min: number; max: number }, lang: Lang): string {
  const min = Math.max(0, Math.round(eta.min));
  const max = Math.max(min, Math.round(eta.max));
  const range = min === max ? `${max}` : `${min}–${max}`;
  if (lang === "ar") return max <= 1 ? "التوصيل خلال يوم عمل واحد" : `التوصيل خلال ${range} أيام عمل`;
  return max <= 1 ? "Delivery in 1 working day" : `Delivery in ${range} working days`;
}

/* ── Payment methods on offer ────────────────────────────────── */

export type PaymentUnavailableReason = "store_off" | "gateway" | "cod_limit";

export interface PaymentOption {
  method: PaymentMethod;
  available: boolean;
  reason: PaymentUnavailableReason | null;
}

/**
 * Which methods the buyer may choose: the owner's switches (settings.payments),
 * whether the gateway can take card / wallet payments right now, and the
 * cash-on-delivery ceiling. createOrder applies exactly the same rules.
 */
export function paymentOptions(input: {
  enabled: Record<PaymentMethod, boolean>;
  gateway: { card: boolean; wallet: boolean };
  total: number | null;
}): Record<PaymentMethod, PaymentOption> {
  const make = (method: PaymentMethod): PaymentOption => {
    if (!input.enabled[method]) return { method, available: false, reason: "store_off" };
    if (method !== "cod" && !input.gateway[method]) return { method, available: false, reason: "gateway" };
    if (method === "cod" && input.total != null && input.total > COD_MAX_AMOUNT) {
      return { method, available: false, reason: "cod_limit" };
    }
    return { method, available: true, reason: null };
  };
  return { cod: make("cod"), card: make("card"), wallet: make("wallet") };
}

export function paymentUnavailableMessage(reason: PaymentUnavailableReason | null, lang: Lang): string {
  const ar = lang === "ar";
  switch (reason) {
    case "cod_limit":
      return ar
        ? `الدفع عند الاستلام متاح للطلبات حتى ${formatMoney(COD_MAX_AMOUNT, lang)}.`
        : `Cash on delivery is available for orders up to ${formatMoney(COD_MAX_AMOUNT, lang)}.`;
    case "gateway":
      return ar ? "غير متاح مؤقتًا. يرجى اختيار طريقة أخرى." : "Temporarily unavailable. Please choose another method.";
    case "store_off":
      return ar ? "لا يقدّم المتجر طريقة الدفع هذه حاليًا." : "The store doesn't offer this method at the moment.";
    default:
      return "";
  }
}

/* ── Promo codes ─────────────────────────────────────────────── */

export type PromoFailure = "invalid" | "expired" | "used_up" | "min_order" | "rate_limited";

export function promoErrorMessage(reason: PromoFailure | undefined, lang: Lang, minOrder?: number): string {
  const ar = lang === "ar";
  switch (reason) {
    case "expired":
      return ar ? "انتهت صلاحية رمز الخصم هذا." : "This promo code has expired.";
    case "used_up":
      return ar ? "استُنفد عدد مرات استخدام رمز الخصم هذا." : "This promo code has reached its usage limit.";
    case "rate_limited":
      return ar
        ? "محاولات كثيرة لرموز الخصم. يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى."
        : "Too many promo code attempts. Please wait a few minutes and try again.";
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
