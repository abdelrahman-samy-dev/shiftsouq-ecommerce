/* Store settings — shapes and pure helpers (safe for client and server). */

import { DEFAULT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, GOVERNORATE_SHIPPING } from "@/lib/checkout/shipping";
import { brand, type Localized } from "@/lib/brand/config";

export interface ShippingSettings {
  defaultFee: number;
  /** Subtotal (after discount) from which delivery is free; 0 = never free. */
  freeThreshold: number;
  /** Fee per governorate key (keys match GOVERNORATES in lib/store/useCheckoutStore). */
  zones: Record<string, number>;
  etaDays: { min: number; max: number };
}

export interface StoreSettings {
  announcement: Localized[];
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: Localized;
    hours: Localized;
  };
  social: { instagram: string; facebook: string; tiktok: string; x: string };
  shipping: ShippingSettings;
  payments: { cod: boolean; card: boolean; wallet: boolean };
  policies: { returnDays: number };
  home: {
    hero: {
      image: string;
      title: Localized;
      subtitle: Localized;
      ctaLabel: Localized;
      ctaHref: string;
    } | null;
  };
  inventory: { lowStockThreshold: number };
  updatedAt: string | null;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  announcement: [
    { en: `Free delivery on orders over EGP ${FREE_SHIPPING_THRESHOLD}`, ar: `توصيل مجاني للطلبات فوق ${FREE_SHIPPING_THRESHOLD} ج.م` },
    { en: "Cash on delivery across Egypt", ar: "الدفع عند الاستلام في كل المحافظات" },
    { en: `Easy returns within ${brand.policies.returnDays} days`, ar: `إرجاع سهل خلال ${brand.policies.returnDays} يومًا` },
  ],
  contact: {
    email: brand.contact.email,
    phone: brand.contact.phone,
    whatsapp: brand.contact.whatsapp,
    address: brand.contact.address,
    hours: { en: "Sun–Thu, 10:00–20:00", ar: "الأحد إلى الخميس، 10:00–20:00" },
  },
  social: { instagram: brand.social.instagram, facebook: brand.social.facebook, tiktok: brand.social.tiktok, x: brand.social.x },
  shipping: {
    defaultFee: DEFAULT_SHIPPING_FEE,
    freeThreshold: FREE_SHIPPING_THRESHOLD,
    zones: { ...GOVERNORATE_SHIPPING },
    etaDays: { min: 2, max: 5 },
  },
  payments: { cod: true, card: true, wallet: true },
  policies: { returnDays: brand.policies.returnDays },
  home: { hero: null },
  inventory: { lowStockThreshold: 5 },
  updatedAt: null,
};

/** Delivery fee for a governorate and subtotal (after discount). Same rule on client and server. */
export function shippingFeeFor(shipping: ShippingSettings, governorate: string, subtotal: number): number {
  if (shipping.freeThreshold > 0 && subtotal >= shipping.freeThreshold) return 0;
  const zone = Object.prototype.hasOwnProperty.call(shipping.zones, governorate) ? shipping.zones[governorate] : undefined;
  return typeof zone === "number" && zone >= 0 ? zone : shipping.defaultFee;
}

/* ── Normalising raw JSON from the database ─────────────────── */

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const loc = (v: unknown, fallback: Localized): Localized => {
  const o = obj(v);
  return { en: str(o.en, fallback.en), ar: str(o.ar, fallback.ar) };
};

export function normalizeSettings(row: Record<string, unknown> | null | undefined): StoreSettings {
  if (!row) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;

  const announcement = Array.isArray(row.announcement)
    ? (row.announcement as unknown[]).map((a) => loc(a, { en: "", ar: "" })).filter((a) => a.en || a.ar)
    : [];

  const c = obj(row.contact);
  const s = obj(row.social);
  const sh = obj(row.shipping);
  const zonesRaw = obj(sh.zones);
  const zones: Record<string, number> = { ...d.shipping.zones };
  for (const [k, v] of Object.entries(zonesRaw)) if (typeof v === "number" && v >= 0) zones[k] = v;
  const eta = obj(sh.eta_days);
  const p = obj(row.payments);
  const pol = obj(row.policies);
  const hero = obj(obj(row.home).hero);
  const inv = obj(row.inventory);

  return {
    announcement: announcement.length ? announcement : d.announcement,
    contact: {
      email: str(c.email, d.contact.email),
      phone: str(c.phone, d.contact.phone),
      whatsapp: str(c.whatsapp, d.contact.whatsapp),
      address: { en: str(c.address_en, d.contact.address.en), ar: str(c.address_ar, d.contact.address.ar) },
      hours: { en: str(c.hours_en, d.contact.hours.en), ar: str(c.hours_ar, d.contact.hours.ar) },
    },
    social: {
      instagram: str(s.instagram, d.social.instagram),
      facebook: str(s.facebook, d.social.facebook),
      tiktok: str(s.tiktok, d.social.tiktok),
      x: str(s.x, d.social.x),
    },
    shipping: {
      defaultFee: num(sh.default_fee, d.shipping.defaultFee),
      freeThreshold: num(sh.free_threshold, d.shipping.freeThreshold),
      zones,
      etaDays: { min: num(eta.min, d.shipping.etaDays.min), max: num(eta.max, d.shipping.etaDays.max) },
    },
    payments: { cod: bool(p.cod, true), card: bool(p.card, true), wallet: bool(p.wallet, true) },
    policies: { returnDays: num(pol.return_days, d.policies.returnDays) },
    home: {
      hero: str(hero.image)
        ? {
            image: str(hero.image),
            title: { en: str(hero.title_en), ar: str(hero.title_ar) },
            subtitle: { en: str(hero.subtitle_en), ar: str(hero.subtitle_ar) },
            ctaLabel: { en: str(hero.cta_label_en, "Shop now"), ar: str(hero.cta_label_ar, "تسوّق الآن") },
            ctaHref: str(hero.cta_href, "/shop"),
          }
        : null,
    },
    inventory: { lowStockThreshold: num(inv.low_stock_threshold, d.inventory.lowStockThreshold) },
    updatedAt: str(row.updated_at) || null,
  };
}
