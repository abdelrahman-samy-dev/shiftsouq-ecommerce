/* ══════════════════════════════════════════════════════════════
   DAL – Products
   ──────────────────────────────────────────────────────────────
   Listing, search and facet reads go through the database's
   search_products() / product_facets() functions
   (supabase/migrations/20261114020000_search.sql):
   - filters and sorting use the price buyers actually pay
     (lowest variant price after sale price and overrides),
   - sizes are filtered within their size system,
   - search is Arabic-aware and typo tolerant.
   Card rows are then read with the public, cookie-free client
   (RLS: active products only). Errors return empty results so
   pages always get predictable shapes.
   ══════════════════════════════════════════════════════════════ */

import "server-only";

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  Product,
  ProductWithDetails,
  ProductImage,
  ProductVariant,
  ProductFilters,
  PaginationParams,
} from "@/lib/types";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { priceSummary } from "@/lib/seo/pricing";
import { EMPTY_FACETS, parseFacets, type ListingFacets } from "@/lib/search/facets";
import type { ListingSort } from "@/lib/search/listing-params";
import { cleanQuery, textMatchLevel } from "@/lib/search/normalize";
import { compareSizes } from "@/lib/search/sizes";
import { getCategories } from "./categories";

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

/** Product columns for cards (no search document). */
const PRODUCT_COLUMNS: (keyof Product)[] = [
  "id",
  "category_id",
  "store_id",
  "name_en",
  "name_ar",
  "slug",
  "description_en",
  "description_ar",
  "base_price",
  "sale_price",
  "brand",
  "rating",
  "review_count",
  "total_orders",
  "is_featured",
  "is_new",
  "is_active",
  "created_at",
  "updated_at",
];

const LISTING_SELECT = `${PRODUCT_COLUMNS.join(", ")},
         category:categories!category_id(name_en, name_ar, slug),
         store:stores!store_id(name, slug),
         product_images(id, url, alt_text_en, alt_text_ar, is_primary, sort_order),
         variants:product_variants(id, size, color_en, color_ar, color_hex, stock, price_override)`;

/** Card rows: primary photo first, then the next one for the hover swap. */
function listingRows(ids: string[]) {
  return getPublicClient()
    .from("products")
    .select(LISTING_SELECT)
    .eq("is_active", true)
    .in("id", ids)
    .order("is_primary", { referencedTable: "product_images", ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(2, { referencedTable: "product_images" });
}

/** Adds `primary_image` / `secondary_image` to a raw row. */
function reshapeProduct(raw: Record<string, unknown>): ListingProduct {
  const rawImages = raw.product_images;
  const images = (Array.isArray(rawImages) ? (rawImages as ProductImage[]) : [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const primaryImage = images.length > 0 ? { ...images[0], product_id: raw.id as string } : null;
  const secondaryImage = images.length > 1 ? { ...images[1], product_id: raw.id as string } : null;

  const rest = { ...raw };
  delete rest.product_images;
  return {
    ...(rest as unknown as Product),
    category: (raw.category as ProductWithDetails["category"]) ?? null,
    store: (raw.store as ProductWithDetails["store"]) ?? null,
    variants: (raw.variants as ListingVariant[]) ?? [],
    primary_image: primaryImage,
    secondary_image: secondaryImage,
  };
}

/** Card rows for the ids, in the order given. */
async function fetchListingProducts(ids: string[]): Promise<ListingProduct[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await listingRows(ids);
    if (error) {
      console.error("[DAL:fetchListingProducts]", error.message);
      return [];
    }
    const byId = new Map(
      (data ?? []).map((row) => [(row as unknown as { id: string }).id, row as unknown as Record<string, unknown>]),
    );
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [reshapeProduct(row)] : [];
    });
  } catch (err) {
    console.error("[DAL:fetchListingProducts] unexpected:", err);
    return [];
  }
}

/* ── Search / listing ─────────────────────────────────────────── */

export interface ListingQuery {
  /** Search text. */
  q?: string;
  /** Fixed scope (category page): these categories and everything below them. */
  scopeCategoryIds?: string[];
  /** Fixed scope (collection page). */
  collectionId?: string;
  /** Buyer's category filter (subcategories included). */
  categoryIds?: string[];
  /** Size tokens: "group.value" (e.g. "shoes.42") or a bare value. */
  sizes?: string[];
  /** Colour names (English, case-insensitive). */
  colors?: string[];
  /** Effective price range (what buyers pay). */
  priceMin?: number | null;
  priceMax?: number | null;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  featured?: boolean;
  sort?: ListingSort | "rating";
}

const nonEmpty = (list?: string[]) => (list && list.length > 0 ? list : null);

function filterArgs(query: ListingQuery) {
  return {
    p_query: query.q?.trim() ? query.q.trim().slice(0, 100) : null,
    p_scope_category_ids: nonEmpty(query.scopeCategoryIds),
    p_collection_id: query.collectionId ?? null,
    p_category_ids: nonEmpty(query.categoryIds),
    p_sizes: nonEmpty(query.sizes),
    p_colors: nonEmpty(query.colors),
    p_price_min: query.priceMin ?? null,
    p_price_max: query.priceMax ?? null,
    p_in_stock: Boolean(query.inStock),
    p_on_sale: Boolean(query.onSale),
    p_is_new: Boolean(query.isNew),
    p_featured: Boolean(query.featured),
  };
}

/** A scope that was asked for but resolved to nothing matches nothing. */
const emptyScope = (query: ListingQuery) => query.scopeCategoryIds !== undefined && query.scopeCategoryIds.length === 0;

/** Ordered product ids for one page plus the total number of matches. */
export async function searchProductIds(
  query: ListingQuery,
  limit: number,
  offset = 0,
): Promise<{ ids: string[]; total: number }> {
  if (emptyScope(query)) return { ids: [], total: 0 };
  try {
    const { data, error } = await getPublicClient().rpc("search_products", {
      ...filterArgs(query),
      p_sort: query.sort ?? "relevance",
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error("[DAL:searchProductIds]", error.message);
      return { ids: [], total: 0 };
    }
    const result = (data ?? {}) as { ids?: unknown; total?: unknown };
    return {
      ids: Array.isArray(result.ids) ? result.ids.filter((id): id is string => typeof id === "string") : [],
      total: Number(result.total) || 0,
    };
  } catch (err) {
    console.error("[DAL:searchProductIds] unexpected:", err);
    return { ids: [], total: 0 };
  }
}

/** One page of listing cards and the total. */
export async function searchListing(
  query: ListingQuery,
  page: number,
  pageSize: number,
): Promise<{ products: ListingProduct[]; total: number }> {
  const { ids, total } = await searchProductIds(query, pageSize, (Math.max(page, 1) - 1) * pageSize);
  return { products: await fetchListingProducts(ids), total };
}

/** Filter options and counts for the current result set. */
export async function getListingFacets(query: ListingQuery): Promise<ListingFacets> {
  if (emptyScope(query)) return EMPTY_FACETS;
  try {
    const { data, error } = await getPublicClient().rpc("product_facets", filterArgs(query));
    if (error) {
      console.error("[DAL:getListingFacets]", error.message);
      return EMPTY_FACETS;
    }
    return parseFacets(data);
  } catch (err) {
    console.error("[DAL:getListingFacets] unexpected:", err);
    return EMPTY_FACETS;
  }
}

/* ── Search suggestions (header search panel) ─────────────────── */

export interface SuggestProduct {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  image: string | null;
  price: number;
  compareAt: number | null;
  varies: boolean;
}

export interface SuggestCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  parent_en: string | null;
  parent_ar: string | null;
}

export interface SearchSuggestions {
  query: string;
  total: number;
  products: SuggestProduct[];
  categories: SuggestCategory[];
}

function toSuggestProduct(p: ListingProduct): SuggestProduct {
  const summary = priceSummary(p, p.variants);
  return {
    id: p.id,
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    image: p.primary_image?.url ?? null,
    price: summary.price,
    compareAt: summary.compareAt,
    varies: summary.varies,
  };
}

type FlatCategory = SuggestCategory & { featured: boolean; depth: number };

/** Every navigation category (with products), with its parent's name. */
async function flatCategories(): Promise<FlatCategory[]> {
  const tree = await getCategories();
  const featured = (c: Category) => Boolean((c as Category & { is_featured?: boolean }).is_featured);
  return tree.flatMap((parent) => [
    {
      id: parent.id,
      slug: parent.slug,
      name_en: parent.name_en,
      name_ar: parent.name_ar,
      parent_en: null,
      parent_ar: null,
      featured: featured(parent),
      depth: 0,
    },
    ...parent.children.map((c) => ({
      id: c.id,
      slug: c.slug,
      name_en: c.name_en,
      name_ar: c.name_ar,
      parent_en: parent.name_en,
      parent_ar: parent.name_ar,
      featured: featured(c),
      depth: 1,
    })),
  ]);
}

const toSuggestCategory = ({ id, slug, name_en, name_ar, parent_en, parent_ar }: FlatCategory): SuggestCategory => ({
  id,
  slug,
  name_en,
  name_ar,
  parent_en,
  parent_ar,
});

/** Up to 6 products and 4 categories for a typed query. */
export async function getSearchSuggestions(rawQuery: string): Promise<SearchSuggestions> {
  const query = cleanQuery(rawQuery);
  if (!query) return { query, total: 0, products: [], categories: [] };

  const [{ ids, total }, categories] = await Promise.all([searchProductIds({ q: query }, 6), flatCategories()]);
  const products = (await fetchListingProducts(ids)).map(toSuggestProduct);

  const matched = categories
    .map((c) => ({ c, level: Math.max(textMatchLevel(query, c.name_en), textMatchLevel(query, c.name_ar)) }))
    .filter((m) => m.level > 0)
    .sort((a, b) => b.level - a.level || a.c.depth - b.c.depth)
    .slice(0, 4)
    .map((m) => toSuggestCategory(m.c));

  return { query, total, products, categories: matched };
}

/** What the search panel shows before anything is typed: popular categories and best sellers. */
export async function getSearchStarters(): Promise<{ categories: SuggestCategory[]; products: SuggestProduct[] }> {
  const [categories, best] = await Promise.all([flatCategories(), searchProductIds({ sort: "bestselling" }, 4)]);
  const featured = categories.filter((c) => c.featured);
  const popular = [...featured, ...categories.filter((c) => !c.featured && c.depth === 0)]
    .slice(0, 6)
    .map(toSuggestCategory);
  const products = (await fetchListingProducts(best.ids)).map(toSuggestProduct);
  return { categories: popular, products };
}

/* ── Older entry points (home rails, related products, wishlist) ─ */

const LEGACY_SORT: Record<NonNullable<ProductFilters["sortBy"]>, ListingQuery["sort"]> = {
  price_asc: "price_asc",
  price_desc: "price_desc",
  newest: "newest",
  rating: "rating",
  popular: "bestselling",
};

/** Category slug → [category id] (the search expands subcategories). */
async function categoryIdForSlug(slug: string): Promise<string[]> {
  const { data } = await getPublicClient().from("categories").select("id").eq("slug", slug).maybeSingle();
  return data?.id ? [data.id as string] : [];
}

/**
 * Paginated, filtered list of active products (defaults to newest
 * first). Prices filter and sort on what buyers pay. `storeSlug` is
 * no longer supported (there is one store).
 */
export async function getProducts(
  filters?: ProductFilters,
  pagination?: PaginationParams,
): Promise<{ products: ListingProduct[]; count: number }> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? PRODUCTS_PER_PAGE;

  let scope: string[] | undefined;
  if (filters?.categoryIds && filters.categoryIds.length > 0) scope = filters.categoryIds;
  else if (filters?.categorySlug) scope = await categoryIdForSlug(filters.categorySlug);

  const { products, total } = await searchListing(
    {
      q: filters?.search,
      scopeCategoryIds: scope,
      sizes: filters?.sizes,
      colors: filters?.colors,
      priceMin: filters?.minPrice ?? null,
      priceMax: filters?.maxPrice ?? null,
      isNew: filters?.isNew,
      featured: filters?.isFeatured,
      sort: LEGACY_SORT[filters?.sortBy ?? "newest"] ?? "newest",
    },
    page,
    pageSize,
  );
  return { products, count: total };
}

/** Featured products (newest first). */
export async function getFeaturedProducts(limit: number = 8): Promise<ListingProduct[]> {
  const { products } = await getProducts({ isFeatured: true }, { page: 1, pageSize: limit });
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

/** Cards for the given product ids (wishlist), in the order given. */
export async function getProductsByIds(ids: string[]): Promise<ListingProduct[]> {
  return fetchListingProducts(Array.from(new Set(ids)).slice(0, 200));
}

/**
 * Sizes (natural order) and colours that exist in the given
 * categories (all categories when empty).
 */
export async function getAvailableFiltersForCategories(
  categoryIds: string[],
): Promise<{ sizes: string[]; colors: { en: string; ar: string; hex: string }[] }> {
  const facets = await getListingFacets({ scopeCategoryIds: categoryIds.length > 0 ? categoryIds : undefined });
  return {
    sizes: Array.from(new Set(facets.sizes.map((s) => s.value))).sort(compareSizes),
    colors: facets.colors
      .filter((c) => c.hex)
      .map((c) => ({ en: c.name_en, ar: c.name_ar, hex: c.hex as string }))
      .sort((a, b) => a.en.localeCompare(b.en)),
  };
}
