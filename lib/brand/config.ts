/* ══════════════════════════════════════════════════════════════
   Brand configuration — the one place a new brand edits.
   ──────────────────────────────────────────────────────────────
   Build-time identity: name, wordmark, metadata, currency,
   locales, contact defaults and social links. Values the store
   team changes day to day (announcement messages, shipping fees,
   contact details shown on the site) live in the store_settings
   table and override the defaults here at runtime.
   Colours and fonts: app/globals.css (tokens) and app/layout.tsx.
   ══════════════════════════════════════════════════════════════ */

export type Localized = { en: string; ar: string };

export const brand = {
  /** Shown in the header wordmark, titles, emails and structured data. */
  name: { en: "ShiftSouq", ar: "شيفت سوق" } satisfies Localized,
  /** Short line used in the hero fallback, footer and metadata. */
  tagline: {
    en: "Modern menswear and everyday essentials",
    ar: "أزياء رجالية عصرية وأساسيات لكل يوم",
  } satisfies Localized,
  description: {
    en: "Shirts, polos, trousers, sneakers and accessories — delivered across Egypt, with cash on delivery and easy returns.",
    ar: "قمصان وبولو وبناطيل وأحذية وإكسسوارات، مع توصيل لكل محافظات مصر والدفع عند الاستلام وإرجاع سهل.",
  } satisfies Localized,

  /** Public site URL (canonical links, sitemap, emails). */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3020").replace(/\/$/, ""),

  locales: ["en", "ar"] as const,
  defaultLocale: "en" as const,

  currency: { code: "EGP", label: { en: "EGP", ar: "ج.م" } satisfies Localized },
  country: "EG",
  /** Order numbers look like SS-20261114-1A2B3C (prefix is set in the database function). */
  orderPrefix: "SS",

  /** Defaults until the super admin fills Store settings. */
  contact: {
    email: "hello@shiftsouq.com",
    phone: "+20 100 000 0000",
    whatsapp: "",
    address: { en: "Cairo, Egypt", ar: "القاهرة، مصر" } satisfies Localized,
  },

  social: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "",
    x: "",
  },

  /** Policies shown in the announcement bar, PDP and checkout until settings override them. */
  policies: {
    returnDays: 14,
    cashOnDelivery: true,
  },
} as const;

export function t(value: Localized, locale: string): string {
  return locale === "ar" ? value.ar : value.en;
}
