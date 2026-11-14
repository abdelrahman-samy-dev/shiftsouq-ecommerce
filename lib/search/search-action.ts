/* ══════════════════════════════════════════════════════════════
   Search Engine — Server Action
   
   Performs server-side product search with:
   - Arabic text normalization (أ/ا, ى/ي, ة/ه)
   - Category filtering
   - Multi-field search (name, brand, description, category)
   - Relevance-based scoring and ranking
   - Result grouping by type (products, categories)
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { normalizeText, scoreMatch, buildSearchableText, toSafeLikeTerm } from "./normalize";

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

/* ── Constants ──────────────────────────────────────────────── */

const MAX_RESULTS = 8;
const MAX_CATEGORY_RESULTS = 3;

/* ── Main Search Action ─────────────────────────────────────── */

/**
 * Perform a unified search across products and categories.
 * 
 * Algorithm:
 * 1. Normalize the query using Arabic/English normalizer
 * 2. Fetch products matching the query (Supabase ilike)
 * 3. Fetch categories matching the query  
 * 4. Apply Arabic-normalized scoring to rank results
 * 5. Sort by relevance score (descending)
 * 6. Return grouped results
 *
 * @param query - The raw search query from the user
 * @param categorySlug - Optional category filter
 */
export async function searchAction(
  query: string,
  categorySlug?: string
): Promise<SearchResponse> {
  const trimmedQuery = query.trim();
  // Term used inside the PostgREST filter: no separators or wildcards from the user.
  const likeTerm = toSafeLikeTerm(trimmedQuery);

  if (trimmedQuery.length < 1 || likeTerm.length < 1) {
    return { results: [], products: [], categories: [], query: trimmedQuery, totalCount: 0 };
  }

  const normalizedQuery = normalizeText(trimmedQuery);
  const supabase = await createServerClient();

  // Run product and category searches in parallel
  const [productResults, categoryResults] = await Promise.all([
    searchProducts(supabase, likeTerm, normalizedQuery, categorySlug),
    searchCategories(supabase, likeTerm, normalizedQuery),
  ]);

  const allResults: SearchResult[] = [
    ...categoryResults,
    ...productResults,
  ].sort((a, b) => b.score - a.score);

  return {
    results: allResults,
    products: productResults,
    categories: categoryResults,
    query: trimmedQuery,
    totalCount: allResults.length,
  };
}

/* ── Product Search ─────────────────────────────────────────── */

async function searchProducts(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  rawQuery: string,
  normalizedQuery: string,
  categorySlug?: string
): Promise<SearchResultProduct[]> {
  // Build multi-field OR search query for Supabase
  // Search across: name_en, name_ar, brand, description_en, description_ar
  let query = supabase
    .from("products")
    .select(`
      id, slug, name_en, name_ar, brand, base_price, sale_price,
      category:categories!category_id(name_en, name_ar, slug),
      product_images!inner(url, is_primary)
    `)
    .eq("is_active", true)
    .eq("product_images.is_primary", true)
    .or(
      `name_en.ilike.%${rawQuery}%,name_ar.ilike.%${rawQuery}%,brand.ilike.%${rawQuery}%,description_en.ilike.%${rawQuery}%,description_ar.ilike.%${rawQuery}%`
    )
    .limit(MAX_RESULTS * 2); // Fetch extra for scoring/filtering

  // Apply category filter if specified
  if (categorySlug) {
    // Get the category id first
    const { data: catData } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();

    if (catData) {
      // Get child categories too
      const { data: childCats } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", catData.id);

      const allCatIds = [catData.id, ...(childCats ?? []).map((c: { id: string }) => c.id)];
      query = query.in("category_id", allCatIds);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[searchProducts]", error.message);
    return [];
  }

  // Score and rank results using our normalization engine
  const scored: SearchResultProduct[] = (data ?? []).map((item: Record<string, unknown>) => {
    const images = (item.product_images ?? []) as { url: string; is_primary: boolean }[];
    const category = item.category as { name_en: string; name_ar: string; slug: string } | null;

    // Build composite searchable text for scoring
    const searchableText = buildSearchableText([
      item.name_en as string,
      item.name_ar as string,
      item.brand as string | null,
    ]);

    // Calculate relevance score across multiple fields
    const nameScoreEn = scoreMatch(normalizedQuery, (item.name_en as string) || "");
    const nameScoreAr = scoreMatch(normalizedQuery, (item.name_ar as string) || "");
    const brandScore = scoreMatch(normalizedQuery, (item.brand as string) || "") * 0.7;
    const compositeScore = scoreMatch(normalizedQuery, searchableText) * 0.5;

    // Take the highest score from all fields
    const finalScore = Math.max(nameScoreEn, nameScoreAr, brandScore, compositeScore);

    return {
      type: "product" as const,
      id: item.id as string,
      slug: item.slug as string,
      name_en: item.name_en as string,
      name_ar: item.name_ar as string,
      brand: item.brand as string | null,
      base_price: item.base_price as number,
      sale_price: item.sale_price as number | null,
      image_url: images[0]?.url ?? null,
      category_name_en: category?.name_en ?? null,
      category_name_ar: category?.name_ar ?? null,
      category_slug: category?.slug ?? null,
      score: finalScore,
    };
  });

  // Sort by score descending, take top results
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);
}

/* ── Category Search ────────────────────────────────────────── */

async function searchCategories(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  rawQuery: string,
  normalizedQuery: string
): Promise<SearchResultCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_ar")
    .or(`name_en.ilike.%${rawQuery}%,name_ar.ilike.%${rawQuery}%`)
    .limit(MAX_CATEGORY_RESULTS * 2);

  if (error) {
    console.error("[searchCategories]", error.message);
    return [];
  }

  // Score categories
  const scored: SearchResultCategory[] = (data ?? []).map((item: Record<string, unknown>) => {
    const nameScoreEn = scoreMatch(normalizedQuery, (item.name_en as string) || "");
    const nameScoreAr = scoreMatch(normalizedQuery, (item.name_ar as string) || "");
    const finalScore = Math.max(nameScoreEn, nameScoreAr);

    return {
      type: "category" as const,
      id: item.id as string,
      slug: item.slug as string,
      name_en: item.name_en as string,
      name_ar: item.name_ar as string,
      product_count: 0, // Could be enriched with a count query
      score: finalScore + 10, // Slight boost to show categories first
    };
  });

  return scored
    .filter((r) => r.score > 10) // Must have actual match (not just the boost)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CATEGORY_RESULTS);
}
