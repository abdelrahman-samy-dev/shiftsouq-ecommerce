/* ══════════════════════════════════════════════════════════════
   DAL – Products Repository
   ──────────────────────────────────────────────────────────────
   Central data-access module for product entities. Implements
   the Repository Pattern to keep all Supabase/database logic
   strictly isolated from UI components.

   Design decisions:
   - Uses the cookie-free public Supabase client so every call
     is safe inside React.cache() and Server Components.
   - All filtering, sorting, and pagination is delegated to the
     database (PostgREST) to avoid client-side O(n) scans.
   - Error handling returns empty data instead of throwing, so
     upstream components always get predictable shapes.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type {
  Product,
  ProductWithDetails,
  ProductImage,
  ProductVariant,
  ProductFilters,
  PaginationParams,
} from "@/lib/types";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { toSafeLikeTerm } from "@/lib/search/normalize";

/* ── Listing types ───────────────────────────────────────────── */

/**
 * Variant fields listing cards need: options (to decide whether
 * "Add to cart" can go straight to the cart), stock and the price
 * override (to show the price checkout will charge).
 */
export type ListingVariant = Pick<
  ProductVariant,
  "id" | "size" | "color_en" | "color_ar" | "color_hex" | "stock" | "price_override"
>;

/** A product as returned by listing queries (cards, grids, wishlist). */
export type ListingProduct = Omit<ProductWithDetails, "variants"> & {
  variants: ListingVariant[];
};

/** Columns selected for listing cards. */
const LISTING_SELECT = `*, category:categories!category_id(name_en, name_ar, slug),
         store:stores!store_id(name, slug),
         product_images(id, url, alt_text_en, alt_text_ar, is_primary, sort_order),
         variants:product_variants(id, size, color_en, color_ar, color_hex, stock, price_override)`;

/* ── Private Helpers ─────────────────────────────────────────── */

/**
 * Transforms a raw Supabase join result into the `ProductWithDetails`
 * shape expected by the UI layer.
 *
 * Why this exists: Supabase returns `product_images` as an array even
 * when we filter `is_primary = true`. We extract the first image and
 * attach it as `primary_image` for ergonomic access in components.
 *
 * @param raw - A single row from the Supabase query with joined relations.
 * @returns A fully-typed `ProductWithDetails` object.
 */
function reshapeProduct(raw: Record<string, unknown>): ListingProduct {
  const rawImages = raw.product_images;
  const images = Array.isArray(rawImages) ? (rawImages as ProductImage[]) : [];
  const primaryImage =
    images.length > 0 ? { ...images[0], product_id: raw.id as string } : null;

  return {
    ...(raw as unknown as Product),
    category: (raw.category as ProductWithDetails["category"]) ?? null,
    store: (raw.store as ProductWithDetails["store"]) ?? null,
    variants: (raw.variants as ListingVariant[]) ?? [],
    primary_image: primaryImage,
  };
}

/**
 * Resolves a category slug into an array of category UUIDs,
 * including all direct child categories.
 *
 * Why: When a user selects a parent category like "Men", they
 * expect to see products from "Men > Shirts", "Men > Pants", etc.
 * This performs the parent → children lookup at the DB level.
 *
 * @param slug - The category slug to resolve (e.g. "men").
 * @returns An array of category UUIDs (parent + children), or empty if not found.
 */
async function resolveCategorySlugToIds(slug: string): Promise<string[]> {
  const supabase = getPublicClient();

  const { data: parent } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!parent?.id) return [];

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", parent.id);

  return [
    parent.id,
    ...(children ?? []).map((c) => (c as { id: string }).id),
  ];
}

/**
 * Resolves size filters into matching product IDs via the
 * `product_variants` table. This is a pre-filter step because
 * sizes live in a separate table and can't be filtered in the
 * main products query directly.
 *
 * @param sizes - Array of size strings to match (e.g. ["S", "M", "L"]).
 * @returns Array of unique product UUIDs that have matching variants,
 *          or `null` if no variants match (signals early empty return).
 */
async function resolveProductIdsBySizes(
  sizes: string[]
): Promise<string[] | null> {
  const supabase = getPublicClient();

  const { data: variantData } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("size", sizes);

  if (!variantData || variantData.length === 0) return null;

  return [...new Set(variantData.map((v) => v.product_id))];
}

/**
 * Resolves color filters into matching product IDs via the
 * `product_variants` table.
 *
 * @param colors - Array of color names (e.g. ["Black", "White"]).
 * @returns Array of unique product UUIDs that have matching variants,
 *          or `null` if no variants match.
 */
async function resolveProductIdsByColors(
  colors: string[]
): Promise<string[] | null> {
  const supabase = getPublicClient();

  const { data: variantData } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("color_en", colors);

  if (!variantData || variantData.length === 0) return null;

  return [...new Set(variantData.map((v) => v.product_id))];
}

/**
 * Resolves a store slug into a store UUID.
 *
 * @param slug - The store's URL slug.
 * @returns The store UUID, or `null` if not found.
 */
async function resolveStoreSlugToId(slug: string): Promise<string | null> {
  const supabase = getPublicClient();

  const { data } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return data?.id ?? null;
}

/* ── Sort Configuration ──────────────────────────────────────── */

/**
 * Maps user-facing sort keys to Supabase order-by parameters.
 * Centralised here to avoid switch-statement duplication.
 */
const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  price_asc: { column: "base_price", ascending: true },
  price_desc: { column: "base_price", ascending: false },
  rating: { column: "rating", ascending: false },
  popular: { column: "total_orders", ascending: false },
  newest: { column: "created_at", ascending: false },
};

/* ── Public Repository Methods ───────────────────────────────── */

/**
 * Fetches a paginated, filtered list of active products with their
 * primary image, category, and store info.
 *
 * All filtering and pagination is performed at the database level
 * via PostgREST operators — no client-side array scanning.
 *
 * @param filters    - Optional filter criteria (category, price range, sizes, etc.).
 * @param pagination - Page number and page size (defaults to page 1, 12 per page).
 * @returns An object with `products` array and total `count` for pagination.
 *
 * @example
 * ```ts
 * const { products, count } = await getProducts(
 *   { categorySlug: "sneakers", minPrice: 100 },
 *   { page: 2, pageSize: 12 }
 * );
 * ```
 */
export async function getProducts(
  filters?: ProductFilters,
  pagination?: PaginationParams
): Promise<{ products: ListingProduct[]; count: number }> {
  try {
    const supabase = getPublicClient();
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? PRODUCTS_PER_PAGE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    /* ── Resolve category slug → category UUIDs ────────────── */
    let resolvedCategoryIds = filters?.categoryIds ?? [];

    if (resolvedCategoryIds.length === 0 && filters?.categorySlug) {
      resolvedCategoryIds = await resolveCategorySlugToIds(
        filters.categorySlug
      );
    }

    /* ── Resolve size filter → product IDs (cross-table) ───── */
    let sizeFilteredProductIds: string[] | undefined;

    if (filters?.sizes && filters.sizes.length > 0) {
      const ids = await resolveProductIdsBySizes(filters.sizes);
      if (ids === null) {
        // No variants match the requested sizes — short-circuit
        return { products: [], count: 0 };
      }
      sizeFilteredProductIds = ids;
    }

    /* ── Resolve color filter → product IDs (cross-table) ───── */
    let colorFilteredProductIds: string[] | undefined;

    if (filters?.colors && filters.colors.length > 0) {
      const ids = await resolveProductIdsByColors(filters.colors);
      if (ids === null) {
        // No variants match the requested colors — short-circuit
        return { products: [], count: 0 };
      }
      colorFilteredProductIds = ids;
    }

    /* ── Resolve store slug → store ID ─────────────────────── */
    let storeId: string | undefined;

    if (filters?.storeSlug) {
      const id = await resolveStoreSlugToId(filters.storeSlug);
      if (id) storeId = id;
    }

    /* ── Build main query ──────────────────────────────────── */
    let query = supabase
      .from("products")
      .select(LISTING_SELECT, { count: "exact" })
      .eq("product_images.is_primary", true)
      .eq("is_active", true);

    /* Apply resolved filters */
    if (resolvedCategoryIds.length > 0) {
      query = query.in("category_id", resolvedCategoryIds);
    }
    if (sizeFilteredProductIds) {
      query = query.in("id", sizeFilteredProductIds);
    }
    if (colorFilteredProductIds) {
      query = query.in("id", colorFilteredProductIds);
    }
    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    /* Scalar column filters */
    if (filters?.minPrice !== undefined) {
      query = query.gte("base_price", filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte("base_price", filters.maxPrice);
    }
    const searchTerm = filters?.search ? toSafeLikeTerm(filters.search) : "";
    if (searchTerm) {
      query = query.or(
        `name_en.ilike.%${searchTerm}%,name_ar.ilike.%${searchTerm}%`
      );
    }
    if (filters?.isNew) {
      query = query.eq("is_new", true);
    }
    if (filters?.isFeatured) {
      query = query.eq("is_featured", true);
    }

    /* Sorting — defaults to newest */
    const sortConfig = SORT_MAP[filters?.sortBy ?? "newest"] ?? SORT_MAP.newest;
    query = query.order(sortConfig.column, {
      ascending: sortConfig.ascending,
    });

    /* Pagination window */
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[DAL:getProducts]", error.message);
      return { products: [], count: 0 };
    }

    return {
      products: (data ?? []).map((p) =>
        reshapeProduct(p as Record<string, unknown>)
      ),
      count: count ?? 0,
    };
  } catch (err) {
    console.error("[DAL:getProducts] unexpected:", err);
    return { products: [], count: 0 };
  }
}

/**
 * Fetches featured products directly from the database.
 *
 * Previously this fetched ALL products then filtered client-side
 * with `.filter(p => p.is_featured)` — an O(n) scan that loaded
 * unnecessary data. Now delegates filtering to the DB.
 *
 * @param limit - Maximum number of featured products to return (default: 8).
 * @returns Array of featured `ProductWithDetails`.
 */
export async function getFeaturedProducts(
  limit: number = 8
): Promise<ListingProduct[]> {
  const { products } = await getProducts(
    { isFeatured: true },
    { page: 1, pageSize: limit }
  );
  return products;
}

/**
 * Fetches a single product by its URL slug, including all images
 * (sorted by `sort_order`), variants, category, and store details.
 *
 * Wrapped in `React.cache()` for per-request deduplication — if
 * both `generateMetadata` and the page component call this for the
 * same slug, only one DB query is executed.
 *
 * @param slug - The product's URL-friendly slug.
 * @returns The full product record with relations, or `null` if not found / inactive.
 */
export const getProductBySlug = cache(async (slug: string) => {
  try {
    const supabase = getPublicClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        `*,
         category:categories!category_id(*),
         store:stores!store_id(*),
         images:product_images(id, url, alt_text_en, alt_text_ar, is_primary, sort_order, created_at, product_id),
         variants:product_variants(id, product_id, size, color_en, color_ar, color_hex, sku, stock, price_override, created_at)`
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .order("sort_order", {
        referencedTable: "images",
        ascending: true,
      })
      .maybeSingle();

    if (error) {
      console.error("[DAL:getProductBySlug]", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[DAL:getProductBySlug] unexpected:", err);
    return null;
  }
});

/**
 * Fetches multiple products by their UUIDs with primary image,
 * category, and store info. Used by the Wishlist page to display
 * saved products.
 *
 * @param ids - Array of product UUIDs to fetch.
 * @returns Array of `ProductWithDetails` matching the given IDs.
 */
export async function getProductsByIds(
  ids: string[]
): Promise<ListingProduct[]> {
  if (ids.length === 0) return [];

  try {
    const supabase = getPublicClient();

    const { data, error } = await supabase
      .from("products")
      .select(LISTING_SELECT)
      .eq("product_images.is_primary", true)
      .eq("is_active", true)
      .in("id", ids);

    if (error) {
      console.error("[DAL:getProductsByIds]", error.message);
      return [];
    }

    return (data ?? []).map((p) =>
      reshapeProduct(p as Record<string, unknown>)
    );
  } catch (err) {
    console.error("[DAL:getProductsByIds] unexpected:", err);
    return [];
  }
}

/**
 * Extracts all unique available sizes and colors for a given list of categories.
 * Used to dynamically populate the sidebar filters based on actual product data.
 *
 * @param categoryIds - Array of category UUIDs to filter products by. If empty, extracts globally.
 * @returns An object containing arrays of unique sizes and distinct colors.
 */
export async function getAvailableFiltersForCategories(
  categoryIds: string[]
): Promise<{ sizes: string[]; colors: { en: string; ar: string; hex: string }[] }> {
  try {
    const supabase = getPublicClient();

    let productQuery = supabase
      .from("products")
      .select("id")
      .eq("is_active", true);

    if (categoryIds.length > 0) {
      productQuery = productQuery.in("category_id", categoryIds);
    }

    const { data: products, error: productsError } = await productQuery;

    if (productsError || !products || products.length === 0) {
      return { sizes: [], colors: [] };
    }

    const productIds = products.map((p) => p.id);

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("size, color_en, color_ar, color_hex")
      .in("product_id", productIds);

    if (variantsError || !variants || variants.length === 0) {
      return { sizes: [], colors: [] };
    }

    const sizes = new Set<string>();
    const colorsMap = new Map<string, { en: string; ar: string; hex: string }>();

    variants.forEach((v) => {
      if (v.size && v.size.trim() !== "") {
        sizes.add(v.size.trim());
      }
      if (v.color_en && v.color_en.trim() !== "" && v.color_hex) {
        if (!colorsMap.has(v.color_en)) {
          colorsMap.set(v.color_en, {
            en: v.color_en,
            ar: v.color_ar || v.color_en,
            hex: v.color_hex,
          });
        }
      }
    });

    return {
      sizes: Array.from(sizes).sort(),
      colors: Array.from(colorsMap.values()).sort((a, b) => a.en.localeCompare(b.en)),
    };
  } catch (err) {
    console.error("[DAL:getAvailableFiltersForCategories] unexpected:", err);
    return { sizes: [], colors: [] };
  }
}
