/* ══════════════════════════════════════════════════════════════
   Product page rules — pure, shared by server and client
   ──────────────────────────────────────────────────────────────
   Options (colour / size), stock, gallery order and the small
   text helpers the product page needs. No React, no database:
   tested in tests/unit/pdp.test.ts.
   ══════════════════════════════════════════════════════════════ */

import { MAX_CART_QUANTITY } from "@/lib/constants";
import { shippingFeeFor, type ShippingSettings } from "@/lib/settings/types";

export type SizeSystem = "apparel" | "shoes" | "kids" | "waist" | "one_size";

export const SIZE_SYSTEMS: readonly SizeSystem[] = ["apparel", "shoes", "kids", "waist", "one_size"];

export function toSizeSystem(value: unknown): SizeSystem {
  return SIZE_SYSTEMS.includes(value as SizeSystem) ? (value as SizeSystem) : "apparel";
}

export interface PdpVariant {
  id: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  stock: number;
  price_override: number | null;
}

export interface PdpImage {
  id: string;
  url: string;
  /** Alt text in the page language (falls back to the product name). */
  alt: string;
  /** Colour (English name) the photo shows; null = shared by every colour. */
  colour: string | null;
}

/* ── Colours ─────────────────────────────────────────────────── */

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** The key a variant's colour is selected by: its English name, else its hex. */
export function colourKey(v: Pick<PdpVariant, "color_en" | "color_hex">): string | null {
  const key = (v.color_en ?? "").trim() || (v.color_hex ?? "").trim();
  return key || null;
}

export interface ColourOption {
  key: string;
  en: string;
  ar: string;
  hex: string | null;
  /** At least one size of this colour can be bought. */
  inStock: boolean;
}

/** Distinct colours in variant order. */
export function colourOptions(variants: readonly PdpVariant[]): ColourOption[] {
  const map = new Map<string, ColourOption>();
  for (const v of variants) {
    const key = colourKey(v);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.inStock ||= v.stock > 0;
      continue;
    }
    map.set(key, {
      key,
      en: v.color_en?.trim() || key,
      ar: v.color_ar?.trim() || v.color_en?.trim() || key,
      hex: v.color_hex,
      inStock: v.stock > 0,
    });
  }
  return [...map.values()];
}

/* ── Sizes ───────────────────────────────────────────────────── */

const APPAREL_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL"];

/** Sort rank for a size label: letter sizes in their usual order, numbers ascending. */
export function sizeRank(size: string): number {
  const s = size.trim().toUpperCase();
  const letter = APPAREL_ORDER.indexOf(s);
  if (letter >= 0) return letter;
  const n = parseFloat(s.replace(",", "."));
  if (Number.isFinite(n)) return 100 + n;
  return 10_000;
}

export interface SizeOption {
  size: string;
  /** Stock of this size in the selected colour (or across colours when none is selected). */
  stock: number;
}

/**
 * Distinct sizes in display order. Variants carry an admin-set position;
 * when positions don't separate two sizes, the usual size order decides.
 */
export function sizeOptions(
  variants: readonly (PdpVariant & { position?: number })[],
  colour: string | null,
): SizeOption[] {
  const sizes = new Map<string, { stock: number; position: number }>();
  for (const v of variants) {
    const size = v.size?.trim();
    if (!size) continue;
    const matches = !colour || colourKey(v) === colour;
    const entry = sizes.get(size) ?? { stock: 0, position: v.position ?? 0 };
    entry.position = Math.min(entry.position, v.position ?? 0);
    if (matches) entry.stock += Math.max(0, v.stock);
    sizes.set(size, entry);
  }
  return [...sizes.entries()]
    .sort((a, b) => a[1].position - b[1].position || sizeRank(a[0]) - sizeRank(b[0]))
    .map(([size, { stock }]) => ({ size, stock }));
}

/** The variant for a full selection, or null while an option is missing / the combination doesn't exist. */
export function resolveVariant(
  variants: readonly PdpVariant[],
  colour: string | null,
  size: string | null,
): PdpVariant | null {
  if (variants.length === 0) return null;
  const hasColours = variants.some((v) => colourKey(v));
  const hasSizes = variants.some((v) => v.size?.trim());
  if (!hasColours && !hasSizes) return variants.find((v) => v.stock > 0) ?? variants[0];
  if ((hasColours && !colour) || (hasSizes && !size)) return null;
  return (
    variants.find(
      (v) => (!hasColours || colourKey(v) === colour) && (!hasSizes || v.size?.trim() === size),
    ) ?? null
  );
}

/**
 * Colour shown when the page opens: the requested one (?color=) when it
 * exists, else the colour of the main photo, else the first colour in stock.
 */
export function initialColour(
  variants: readonly PdpVariant[],
  images: readonly Pick<PdpImage, "colour">[],
  requested?: string | null,
): string | null {
  const options = colourOptions(variants);
  if (options.length === 0) return null;
  if (requested) {
    const match = options.find((o) => norm(o.key) === norm(requested));
    if (match) return match.key;
  }
  const firstPhoto = images[0]?.colour;
  if (firstPhoto) {
    const match = options.find((o) => norm(o.en) === norm(firstPhoto) || norm(o.key) === norm(firstPhoto));
    if (match) return match.key;
  }
  return (options.find((o) => o.inStock) ?? options[0]).key;
}

/** A single size is chosen for the buyer. */
export function initialSize(variants: readonly PdpVariant[]): string | null {
  const sizes = sizeOptions(variants, null);
  return sizes.length === 1 ? sizes[0].size : null;
}

/* ── Gallery ─────────────────────────────────────────────────── */

/**
 * Photos for the selected colour: that colour's photos first, then the
 * shared ones. Photos of other colours are left out. With no colour (or
 * no photo tagged with it) every photo is shown in its saved order.
 */
export function imagesForColour<T extends Pick<PdpImage, "colour">>(images: readonly T[], colour: string | null, colourName?: string | null): T[] {
  if (!colour) return [...images];
  const wanted = new Set([norm(colour), norm(colourName)].filter(Boolean));
  const own = images.filter((img) => img.colour && wanted.has(norm(img.colour)));
  if (own.length === 0) return [...images];
  const shared = images.filter((img) => !img.colour);
  return [...own, ...shared];
}

/**
 * Desktop stack: the first photo spans both columns; when the rest can't
 * fill whole rows, the last one spans too, so the grid never has a hole.
 */
export function galleryLayout(count: number): ("full" | "half")[] {
  if (count <= 0) return [];
  const layout: ("full" | "half")[] = Array.from({ length: count }, (_, i) => (i === 0 ? "full" : "half"));
  if ((count - 1) % 2 === 1) layout[count - 1] = "full";
  return layout;
}

/* ── Stock & quantity ────────────────────────────────────────── */

export type StockState = { kind: "out" } | { kind: "low"; count: number } | { kind: "in" };

export function stockState(stock: number, lowStockThreshold: number): StockState {
  if (stock <= 0) return { kind: "out" };
  if (lowStockThreshold > 0 && stock <= lowStockThreshold) return { kind: "low", count: stock };
  return { kind: "in" };
}

/** Most a buyer can add at once: the stock, capped at the cart limit (never below 1). */
export function maxQuantity(stock: number | null | undefined, cap: number = MAX_CART_QUANTITY): number {
  if (stock == null) return cap;
  return Math.max(1, Math.min(cap, Math.floor(stock)));
}

/* ── Delivery promise ────────────────────────────────────────── */

export interface DeliveryQuote {
  fee: number;
  free: boolean;
  /** Amount still needed for free delivery (0 when free or never free). */
  remaining: number;
}

/** What delivery to a governorate costs for this amount — the checkout rule. */
export function deliveryQuote(shipping: ShippingSettings, governorate: string, amount: number): DeliveryQuote {
  const fee = shippingFeeFor(shipping, governorate, amount);
  const free = fee === 0;
  const remaining = !free && shipping.freeThreshold > 0 ? Math.max(0, shipping.freeThreshold - amount) : 0;
  return { fee, free, remaining };
}

/* ── Text ────────────────────────────────────────────────────── */

/** Non-empty trimmed lines ("details" are one bullet per line; leading "-" / "•" removed). */
export function splitLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
}

/** Paragraphs (blank-line separated), each a list of lines. Plain text only. */
export function splitParagraphs(text: string | null | undefined): string[][] {
  return (text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length > 0);
}

/** "Mona Buyer" → "Mona B." — first name and last initial only. */
export function reviewerName(fullName: string | null | undefined): string | null {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0].slice(0, 40);
  if (parts.length === 1) return first;
  const initial = Array.from(parts[parts.length - 1])[0];
  return `${first} ${initial}.`;
}

/* ── Ratings ─────────────────────────────────────────────────── */

export interface RatingSummary {
  average: number;
  count: number;
  /** Stars 5 → 1 with their review counts. */
  distribution: { stars: number; count: number }[];
}

export function summarizeRatings(ratings: readonly number[]): RatingSummary {
  const valid = ratings.filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);
  const count = valid.length;
  const average = count ? Math.round((valid.reduce((s, r) => s + r, 0) / count) * 10) / 10 : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: valid.filter((r) => r === stars).length }));
  return { average, count, distribution };
}
