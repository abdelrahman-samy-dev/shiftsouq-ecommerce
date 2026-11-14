/* ══════════════════════════════════════════════════════════════
   My Orders — bilingual labels and formatting (no React)
   ══════════════════════════════════════════════════════════════ */

import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import type { OrderStatusValue, PaymentMethodValue, PaymentStatusValue } from "./order-rules";

export type Lang = "en" | "ar";

const STATUS: Record<OrderStatusValue, [string, string]> = {
  pending: ["Pending", "قيد الانتظار"],
  confirmed: ["Confirmed", "تم التأكيد"],
  processing: ["Processing", "جارٍ التجهيز"],
  shipped: ["Shipped", "تم الشحن"],
  delivered: ["Delivered", "تم التوصيل"],
  cancelled: ["Cancelled", "ملغي"],
  refunded: ["Refunded", "تم الاسترداد"],
};

const METHOD: Record<PaymentMethodValue, [string, string]> = {
  cod: ["Cash on delivery", "الدفع عند الاستلام"],
  card: ["Credit / debit card", "بطاقة ائتمان / خصم"],
  wallet: ["Mobile wallet", "محفظة إلكترونية"],
};

const PAYMENT: Record<PaymentStatusValue, [string, string]> = {
  unpaid: ["Not paid", "غير مدفوع"],
  paid: ["Paid", "مدفوع"],
  failed: ["Payment failed", "فشل الدفع"],
  refunded: ["Refunded", "تم الاسترداد"],
};

const pick = (pair: [string, string], lang: Lang) => (lang === "ar" ? pair[1] : pair[0]);

export const statusLabel = (s: OrderStatusValue, lang: Lang) => pick(STATUS[s] ?? [s, s], lang);
export const methodLabel = (m: PaymentMethodValue | null, lang: Lang) =>
  m ? pick(METHOD[m] ?? [m, m], lang) : lang === "ar" ? "غير محدد" : "Not set";

/** "Pay on delivery" reads better than "Not paid" for an open cash-on-delivery order. */
export function paymentStatusLabel(
  s: PaymentStatusValue,
  m: PaymentMethodValue | null,
  lang: Lang,
  status?: OrderStatusValue,
): string {
  const open = status !== "cancelled" && status !== "refunded";
  if (m === "cod" && s === "unpaid" && open) return lang === "ar" ? "يُدفع عند الاستلام" : "Pay on delivery";
  return pick(PAYMENT[s] ?? [s, s], lang);
}

export function governorateLabel(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const g = GOVERNORATES.find((x) => x.value === value);
  return g ? (lang === "ar" ? g.ar : g.en) : value;
}

/** Dates and times in Cairo time, so server and browser render the same text. */
export function formatOrderDate(iso: string, lang: Lang, withTime = false): string {
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
  });
}
