/* ══════════════════════════════════════════════════════════════
   Admin — store settings form (pure; shared by the form, the
   server action and the tests)
   ──────────────────────────────────────────────────────────────
   The form edits `SettingsValues` (camelCase, like StoreSettings
   in lib/settings). The server validates with the same schema and
   writes `settingsToRow()` — the JSON layout of the store_settings
   table that lib/settings normalizeSettings() reads back.
   Error messages are short codes; the UI translates them.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { GOVERNORATE_SHIPPING } from "@/lib/checkout/shipping";
import type { StoreSettings } from "@/lib/settings/types";
import { isAllowedImageUrl } from "./products";

/** Governorate keys the checkout uses (lib/store/useCheckoutStore GOVERNORATES). */
export const GOVERNORATE_KEYS: readonly string[] = Object.keys(GOVERNORATE_SHIPPING);

export const MAX_ANNOUNCEMENTS = 8;
export const MAX_FEE = 10_000;

export type SettingsErrorCode =
  | "required"
  | "too_long"
  | "email"
  | "phone"
  | "url"
  | "link"
  | "image"
  | "number"
  | "eta"
  | "payments"
  | "too_many";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s\-()]{5,24}$/;
const WHATSAPP = /^\+?[0-9]{8,15}$/;

export function isHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** A link inside the store ("/shop", "/category/shoes?sort=new") or an https page. */
export function isSafeLink(raw: string): boolean {
  if (raw.startsWith("/")) return !raw.startsWith("//") && !raw.includes("\\") && !/\s/.test(raw);
  return isHttpsUrl(raw);
}

/** Hero image: a file in /public, an allowed image host, or this project's Supabase storage. */
export function isHeroImage(raw: string): boolean {
  if (raw.startsWith("/")) return !raw.startsWith("//") && !raw.includes("\\") && !/\s/.test(raw);
  if (isAllowedImageUrl(raw)) return true;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const url = new URL(raw);
    const origin = new URL(base);
    return url.origin === origin.origin && url.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

const text = (max: number) => z.string().trim().max(max, { error: "too_long" });
const required = (max: number) => text(max).min(1, { error: "required" });
const optionalBy = (max: number, test: (v: string) => boolean, code: SettingsErrorCode) =>
  text(max).refine((v) => v === "" || test(v), { error: code });
const localized = (max: number) => z.object({ en: text(max), ar: text(max) });
const money = z.number({ error: "number" }).finite({ error: "number" }).min(0, { error: "number" }).max(MAX_FEE, { error: "number" });
const wholeNumber = (min: number, max: number) =>
  z.number({ error: "number" }).int({ error: "number" }).min(min, { error: "number" }).max(max, { error: "number" });

export const settingsSchema = z
  .object({
    announcement: z
      .array(z.object({ en: required(140), ar: required(140) }))
      .max(MAX_ANNOUNCEMENTS, { error: "too_many" }),
    contact: z.object({
      email: optionalBy(254, (v) => EMAIL.test(v), "email"),
      phone: optionalBy(30, (v) => PHONE.test(v), "phone"),
      whatsapp: optionalBy(20, (v) => WHATSAPP.test(v.replace(/\s/g, "")), "phone"),
      address: localized(200),
      hours: localized(120),
    }),
    social: z.object({
      instagram: optionalBy(200, isHttpsUrl, "url"),
      facebook: optionalBy(200, isHttpsUrl, "url"),
      tiktok: optionalBy(200, isHttpsUrl, "url"),
      x: optionalBy(200, isHttpsUrl, "url"),
    }),
    shipping: z.object({
      defaultFee: money,
      freeThreshold: z.number({ error: "number" }).finite({ error: "number" }).min(0, { error: "number" }).max(1_000_000, { error: "number" }),
      etaDays: z
        .object({ min: wholeNumber(0, 60), max: wholeNumber(0, 60) })
        .refine((e) => e.max >= e.min, { path: ["max"], error: "eta" }),
      zones: z.record(z.string(), money).superRefine((zones, ctx) => {
        for (const key of Object.keys(zones)) {
          if (!GOVERNORATE_KEYS.includes(key)) ctx.addIssue({ code: "custom", path: [key], message: "required" });
        }
      }),
    }),
    payments: z
      .object({ cod: z.boolean(), card: z.boolean(), wallet: z.boolean() })
      .refine((p) => p.cod || p.card || p.wallet, { error: "payments" }),
    policies: z.object({ returnDays: wholeNumber(0, 365) }),
    home: z.object({
      hero: z.object({
        image: optionalBy(500, isHeroImage, "image"),
        title: localized(120),
        subtitle: localized(240),
        ctaLabel: localized(40),
        ctaHref: optionalBy(300, isSafeLink, "link"),
      }),
    }),
    inventory: z.object({ lowStockThreshold: wholeNumber(0, 1000) }),
  });

export type SettingsValues = z.input<typeof settingsSchema>;

/** Field path ("contact.email", "announcement.0.ar") → error code, first error per field. */
export function settingsErrors(error: z.ZodError): Record<string, SettingsErrorCode> {
  const out: Record<string, SettingsErrorCode> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (!(path in out)) out[path] = (issue.message as SettingsErrorCode) || "required";
  }
  return out;
}

/** Form values from the current settings (lib/settings, already merged over the defaults). */
export function settingsToValues(s: StoreSettings): SettingsValues {
  const hero = s.home.hero;
  const zones: Record<string, number> = {};
  for (const key of GOVERNORATE_KEYS) {
    const fee = s.shipping.zones[key];
    zones[key] = typeof fee === "number" ? fee : s.shipping.defaultFee;
  }
  return {
    announcement: s.announcement.map((a) => ({ en: a.en, ar: a.ar })),
    contact: {
      email: s.contact.email,
      phone: s.contact.phone,
      whatsapp: s.contact.whatsapp,
      address: { ...s.contact.address },
      hours: { ...s.contact.hours },
    },
    social: { ...s.social },
    shipping: {
      defaultFee: s.shipping.defaultFee,
      freeThreshold: s.shipping.freeThreshold,
      etaDays: { ...s.shipping.etaDays },
      zones,
    },
    payments: { ...s.payments },
    policies: { returnDays: s.policies.returnDays },
    home: {
      hero: {
        image: hero?.image ?? "",
        title: hero ? { ...hero.title } : { en: "", ar: "" },
        subtitle: hero ? { ...hero.subtitle } : { en: "", ar: "" },
        ctaLabel: hero ? { ...hero.ctaLabel } : { en: "Shop now", ar: "تسوّق الآن" },
        ctaHref: hero?.ctaHref ?? "/shop",
      },
    },
    inventory: { lowStockThreshold: s.inventory.lowStockThreshold },
  };
}

export type SettingsParsed = z.output<typeof settingsSchema>;

/** The store_settings columns to write (JSON layout read by lib/settings normalizeSettings). */
export function settingsToRow(v: SettingsParsed) {
  const zones: Record<string, number> = {};
  for (const key of GOVERNORATE_KEYS) {
    if (typeof v.shipping.zones[key] === "number") zones[key] = round2(v.shipping.zones[key]);
  }
  return {
    announcement: v.announcement.map((a) => ({ en: a.en, ar: a.ar })),
    contact: {
      email: v.contact.email,
      phone: v.contact.phone,
      whatsapp: v.contact.whatsapp.replace(/\s/g, ""),
      address_en: v.contact.address.en,
      address_ar: v.contact.address.ar,
      hours_en: v.contact.hours.en,
      hours_ar: v.contact.hours.ar,
    },
    social: { ...v.social },
    shipping: {
      default_fee: round2(v.shipping.defaultFee),
      free_threshold: round2(v.shipping.freeThreshold),
      zones,
      eta_days: { min: v.shipping.etaDays.min, max: v.shipping.etaDays.max },
    },
    payments: { ...v.payments },
    policies: { return_days: v.policies.returnDays },
    home: {
      hero: {
        image: v.home.hero.image,
        title_en: v.home.hero.title.en,
        title_ar: v.home.hero.title.ar,
        subtitle_en: v.home.hero.subtitle.en,
        subtitle_ar: v.home.hero.subtitle.ar,
        cta_label_en: v.home.hero.ctaLabel.en,
        cta_label_ar: v.home.hero.ctaLabel.ar,
        cta_href: v.home.hero.ctaHref,
      },
    },
    inventory: { low_stock_threshold: v.inventory.lowStockThreshold },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Deep-merges what the form writes over what is stored, so keys the form
 * doesn't edit survive a save (e.g. home.hero.alt_en, home.hero.credit,
 * shipping.eta_days_by_zone). Objects merge key by key; arrays and plain
 * values from `next` replace the stored ones.
 */
export function mergeSettingsJson(current: unknown, next: unknown): unknown {
  if (!isPlainObject(current) || !isPlainObject(next)) return next;
  const out: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(next)) out[key] = mergeSettingsJson(current[key], value);
  return out;
}

/** Key-order-insensitive JSON equality (jsonb does not keep key order). */
export function sameJson(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    isPlainObject(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, norm(v[k])]),
        )
      : Array.isArray(v)
        ? v.map(norm)
        : v;
  return JSON.stringify(norm(a ?? null)) === JSON.stringify(norm(b ?? null));
}
