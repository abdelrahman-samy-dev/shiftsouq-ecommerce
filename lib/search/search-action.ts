/* ══════════════════════════════════════════════════════════════
   searchAction — Server Function kept for older callers
   ──────────────────────────────────────────────────────────────
   Same results as GET /api/search/suggest (Arabic-aware, typo
   tolerant, effective prices), in the older response shape.
   New code should use the route handler.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { getSearchSuggestions } from "@/lib/dal/products";

/* ── Types ──────────────────────────────────────────────────── */

export interface SearchResultProduct {
  type: "product";
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  brand: string | null;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
  category_name_en: string | null;
  category_name_ar: string | null;
  category_slug: string | null;
  score: number;
}

export interface SearchResultCategory {
  type: "category";
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  product_count: number;
  score: number;
}

export type SearchResult = SearchResultProduct | SearchResultCategory;

export interface SearchResponse {
  results: SearchResult[];
  products: SearchResultProduct[];
  categories: SearchResultCategory[];
  query: string;
  totalCount: number;
}

/**
 * Products and categories for a query. `categorySlug` is ignored
 * (search covers the whole catalogue; filters live on /search).
 */
export async function searchAction(query: string, categorySlug?: string): Promise<SearchResponse> {
  void categorySlug;
  const found = await getSearchSuggestions(typeof query === "string" ? query : "");

  const products: SearchResultProduct[] = found.products.map((p, i) => ({
    type: "product",
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    brand: null,
    // The price buyers pay, with the struck-through price when lower.
    base_price: p.compareAt ?? p.price,
    sale_price: p.compareAt ? p.price : null,
    image_url: p.image,
    category_name_en: null,
    category_name_ar: null,
    category_slug: null,
    score: 100 - i,
  }));

  const categories: SearchResultCategory[] = found.categories.map((c, i) => ({
    type: "category",
    id: c.id,
    slug: c.slug,
    name_en: c.name_en,
    name_ar: c.name_ar,
    product_count: 0,
    score: 110 - i,
  }));

  return {
    results: [...categories, ...products],
    products,
    categories,
    query: found.query,
    totalCount: found.total,
  };
}
