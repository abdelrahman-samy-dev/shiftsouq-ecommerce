/* ══════════════════════════════════════════════════════════════
   Facts quoted by the policy pages, from store settings
   ──────────────────────────────────────────────────────────────
   Fees, the free-delivery threshold, delivery times, return days,
   payment methods and contact details are never typed into the
   policy text: they come from store_settings (via the server)
   and the brand config, so the pages always match checkout.
   ══════════════════════════════════════════════════════════════ */

import { brand, t } from "@/lib/brand/config";
import type { StoreSettings } from "@/lib/settings/types";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { formatPrice } from "@/lib/utils";
import { dayCount, phoneHref } from "@/components/layout/shell-rules";
import type { Locale } from "@/lib/types";

export interface LegalFacts {
  brand: string;
  email: string;
  phone: string;
  /** "[phone](tel:…)" or the plain number. */
  phoneLink: string;
  hours: string;
  address: string;
  returnDays: string;
  freeThreshold: string | null;
  etaMin: number;
  etaMax: number;
  /** Delivery fee table rows: [governorates, fee]. */
  feeRows: [string, string][];
  payments: StoreSettings["payments"];
  /** "cash on delivery, bank cards (…) and mobile wallets". */
  paymentList: string;
}

function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join("");
  if (locale === "ar") return `${items.slice(0, -1).join("، ")} و${items[items.length - 1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function legalFacts(settings: StoreSettings, locale: Locale): LegalFacts {
  const ar = locale === "ar";
  const { shipping, payments, contact, policies } = settings;
  const price = (n: number) => formatPrice(n, locale);

  // Group governorates by fee; the default fee covers "all other governorates".
  const label = (key: string) => {
    const g = GOVERNORATES.find((x) => x.value === key);
    return g ? (ar ? g.ar : g.en) : key;
  };
  const groups = new Map<number, string[]>();
  for (const [key, fee] of Object.entries(shipping.zones)) {
    if (fee === shipping.defaultFee) continue;
    groups.set(fee, [...(groups.get(fee) ?? []), label(key)]);
  }
  const feeRows: [string, string][] = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([fee, names]) => [joinList(names, locale), fee === 0 ? (ar ? "مجانًا" : "Free") : price(fee)]);
  feeRows.push([
    groups.size ? (ar ? "باقي المحافظات" : "All other governorates") : ar ? "جميع المحافظات" : "All governorates",
    price(shipping.defaultFee),
  ]);
  if (shipping.freeThreshold > 0) {
    feeRows.push([ar ? `الطلبات من ${price(shipping.freeThreshold)}` : `Orders from ${price(shipping.freeThreshold)}`, ar ? "مجانًا" : "Free"]);
  }

  const methods = [
    payments.cod ? (ar ? "الدفع نقدًا عند الاستلام" : "cash on delivery") : null,
    payments.card ? (ar ? "البطاقات البنكية (فيزا وماستركارد وميزة)" : "bank cards (Visa, Mastercard and Meeza)") : null,
    payments.wallet ? (ar ? "المحافظ الإلكترونية" : "mobile wallets") : null,
  ].filter((m): m is string => !!m);

  const tel = phoneHref(contact.phone);

  return {
    brand: t(brand.name, locale),
    email: contact.email,
    phone: contact.phone,
    phoneLink: contact.phone ? (tel ? `[${contact.phone}](${tel})` : contact.phone) : "",
    hours: t(contact.hours, locale),
    address: t(contact.address, locale),
    returnDays: dayCount(policies.returnDays, locale),
    freeThreshold: shipping.freeThreshold > 0 ? price(shipping.freeThreshold) : null,
    etaMin: shipping.etaDays.min,
    etaMax: shipping.etaDays.max,
    feeRows,
    payments,
    paymentList: joinList(methods, locale),
  };
}

/** Contact lines shared by every policy's last section. */
export function contactItems(f: LegalFacts, locale: Locale): string[] {
  const ar = locale === "ar";
  return [
    f.email ? `**${ar ? "البريد الإلكتروني" : "Email"}:** [${f.email}](mailto:${f.email})` : null,
    f.phoneLink ? `**${ar ? "الهاتف" : "Phone"}:** ${f.phoneLink}` : null,
    f.hours ? `**${ar ? "مواعيد العمل" : "Hours"}:** ${f.hours}` : null,
    `**${ar ? "نموذج التواصل" : "Contact form"}:** [${ar ? "صفحة تواصل معنا" : "our contact page"}](/contact)`,
  ].filter((x): x is string => !!x);
}

export const LEGAL_LABELS = {
  en: { updated: "Last updated", onThisPage: "On this page", help: "Help", legal: "Legal" },
  ar: { updated: "آخر تحديث", onThisPage: "في هذه الصفحة", help: "المساعدة", legal: "السياسات" },
} as const;
