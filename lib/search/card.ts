/* ══════════════════════════════════════════════════════════════
   Card data for listing grids (pure)
   ──────────────────────────────────────────────────────────────
   Only the fields ProductCard reads travel to the browser (no
   descriptions, store or timestamps), for the first render and
   for "Load more" pages alike.
   ══════════════════════════════════════════════════════════════ */

import type { ListingProduct, ListingVariant } from "@/lib/dal/products";

export interface GridProduct {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  base_price: number;
  sale_price: number | null;
  is_new: boolean;
  primary_image: { url: string; alt_text_en: string | null; alt_text_ar: string | null } | null;
  secondary_image: { url: string; alt_text_en: string | null; alt_text_ar: string | null } | null;
  variants: ListingVariant[];
}

const image = (img: ListingProduct["primary_image"] | undefined) =>
  img ? { url: img.url, alt_text_en: img.alt_text_en ?? null, alt_text_ar: img.alt_text_ar ?? null } : null;

export function toGridProduct(p: ListingProduct): GridProduct {
  return {
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    base_price: Number(p.base_price),
    sale_price: p.sale_price === null || p.sale_price === undefined ? null : Number(p.sale_price),
    is_new: Boolean(p.is_new),
    primary_image: image(p.primary_image),
    secondary_image: image(p.secondary_image),
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color_en: v.color_en,
      color_ar: v.color_ar,
      color_hex: v.color_hex,
      stock: v.stock,
      price_override: v.price_override === null || v.price_override === undefined ? null : Number(v.price_override),
    })),
  };
}
