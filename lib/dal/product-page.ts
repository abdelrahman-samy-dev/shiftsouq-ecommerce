import "server-only";

/* ══════════════════════════════════════════════════════════════
   DAL — product page
   ──────────────────────────────────────────────────────────────
   Everything /product/[slug] reads: the product with its colour
   photos, ordered variants and category path; approved reviews
   and their summary; whether the visitor may review; related
   products and "complete the look".

   Public reads use the cookie-free client (RLS: active products,
   approved reviews only). The visitor's own state uses their
   session, so RLS limits it to their own orders and review.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import { createServerClient } from "@/lib/supabase/server";
import { getProducts, getProductsByIds, type ListingProduct } from "./products";
import { toSizeSystem, type PdpVariant, type RatingSummary, type SizeSystem } from "@/components/product/pdp-logic";

/* ── Types ───────────────────────────────────────────────────── */

export interface ProductPageCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  parent: { slug: string; name_en: string; name_ar: string } | null;
}

export interface ProductPageImage {
  id: string;
  url: string;
  alt_text_en: string | null;
  alt_text_ar: string | null;
  is_primary: boolean;
  sort_order: number;
  /** Colour the photo shows (English name); null = every colour. */
  color_en: string | null;
}

export interface ProductPageVariant extends PdpVariant {
  sku: string;
  position: number;
}

export interface ProductPageData {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  details_en: string | null;
  details_ar: string | null;
  care_en: string | null;
  care_ar: string | null;
  base_price: number;
  sale_price: number | null;
  brand: string | null;
  rating: number;
  review_count: number;
  is_new: boolean;
  size_system: SizeSystem;
  category_id: string | null;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  category: ProductPageCategory | null;
  images: ProductPageImage[];
  variants: ProductPageVariant[];
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  /** "Mona B." — null when the buyer has no name on file. */
  author: string | null;
  verified: boolean;
  date: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewerState =
  | { status: "guest" }
  | {
      status: "signed_in";
      /** The visitor has a delivered order containing this product. */
      canReview: boolean;
      existing: { rating: number; title: string | null; comment: string | null; status: ReviewStatus } | null;
    };

/* ── Helpers ─────────────────────────────────────────────────── */

const n = (v: unknown, fallback = 0): number => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const nOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : n(v));
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

const PRODUCT_SELECT = `
  id, slug, name_en, name_ar, description_en, description_ar, details_en, details_ar, care_en, care_ar,
  base_price, sale_price, brand, rating, review_count, is_new, size_system, category_id,
  seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
  category:categories!category_id(id, slug, name_en, name_ar, parent:parent_id(slug, name_en, name_ar)),
  images:product_images(id, url, alt_text_en, alt_text_ar, is_primary, sort_order, color_en),
  variants:product_variants(id, size, color_en, color_ar, color_hex, sku, stock, price_override, position, created_at)`;

function reshape(raw: Record<string, unknown>): ProductPageData {
  const cat = raw.category as Record<string, unknown> | null;
  const parent = cat?.parent as Record<string, unknown> | null | undefined;

  const images = ((raw.images as Record<string, unknown>[] | null) ?? [])
    .map(
      (i): ProductPageImage => ({
        id: String(i.id),
        url: String(i.url),
        alt_text_en: s(i.alt_text_en),
        alt_text_ar: s(i.alt_text_ar),
        is_primary: i.is_primary === true,
        sort_order: n(i.sort_order),
        color_en: s(i.color_en)?.trim() ?? null,
      }),
    )
    .filter((i) => i.url)
    // Same order as the product cards: main photo first, then the saved order.
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

  const variants = ((raw.variants as Record<string, unknown>[] | null) ?? [])
    .map((v) => ({
      variant: {
        id: String(v.id),
        size: s(v.size)?.trim() ?? null,
        color_en: s(v.color_en)?.trim() ?? null,
        color_ar: s(v.color_ar)?.trim() ?? null,
        color_hex: s(v.color_hex),
        sku: String(v.sku ?? ""),
        stock: Math.max(0, Math.floor(n(v.stock))),
        price_override: nOrNull(v.price_override),
        position: n(v.position),
      } satisfies ProductPageVariant,
      created: String(v.created_at ?? ""),
    }))
    .sort((a, b) => a.variant.position - b.variant.position || a.created.localeCompare(b.created))
    .map((x) => x.variant);

  return {
    id: String(raw.id),
    slug: String(raw.slug),
    name_en: String(raw.name_en ?? ""),
    name_ar: String(raw.name_ar ?? raw.name_en ?? ""),
    description_en: s(raw.description_en),
    description_ar: s(raw.description_ar),
    details_en: s(raw.details_en),
    details_ar: s(raw.details_ar),
    care_en: s(raw.care_en),
    care_ar: s(raw.care_ar),
    base_price: n(raw.base_price),
    sale_price: nOrNull(raw.sale_price),
    brand: s(raw.brand),
    rating: n(raw.rating),
    review_count: n(raw.review_count),
    is_new: raw.is_new === true,
    size_system: toSizeSystem(raw.size_system),
    category_id: s(raw.category_id),
    seo_title_en: s(raw.seo_title_en),
    seo_title_ar: s(raw.seo_title_ar),
    seo_description_en: s(raw.seo_description_en),
    seo_description_ar: s(raw.seo_description_ar),
    category: cat
      ? {
          id: String(cat.id),
          slug: String(cat.slug),
          name_en: String(cat.name_en ?? ""),
          name_ar: String(cat.name_ar ?? cat.name_en ?? ""),
          parent: parent && parent.slug
            ? { slug: String(parent.slug), name_en: String(parent.name_en ?? ""), name_ar: String(parent.name_ar ?? parent.name_en ?? "") }
            : null,
        }
      : null,
    images,
    variants,
  };
}

/* ── Product ─────────────────────────────────────────────────── */

/**
 * One active product by slug, or null. Wrapped in React.cache() so
 * generateMetadata and the page share a single query.
 */
export const getProductPage = cache(async (slug: string): Promise<ProductPageData | null> => {
  if (!slug || slug.length > 200) return null;
  try {
    const { data, error } = await getPublicClient()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[DAL:getProductPage]", error.message);
      return null;
    }
    return data ? reshape(data as Record<string, unknown>) : null;
  } catch (err) {
    console.error("[DAL:getProductPage] unexpected:", err);
    return null;
  }
});

/** True when the product exists and is on sale. */
export async function isActiveProduct(productId: string): Promise<boolean> {
  const { data } = await getPublicClient()
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

/** Slugs of every active product (pre-rendering hints). */
export async function getActiveProductSlugs(): Promise<string[]> {
  try {
    const { data } = await getPublicClient().from("products").select("slug").eq("is_active", true);
    return (data ?? []).map((p) => String((p as { slug: string }).slug));
  } catch {
    return [];
  }
}

/* ── Reviews ─────────────────────────────────────────────────── */

/** Reviews shown at first and added by each "Show more". */
export const REVIEWS_PAGE_SIZE = 6;

/** Average, count and 5 → 1 distribution of approved reviews (one count query per star). */
export async function getReviewSummary(productId: string): Promise<RatingSummary> {
  const db = getPublicClient();
  try {
    const counts = await Promise.all(
      [5, 4, 3, 2, 1].map(async (stars) => {
        const { count, error } = await db
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("product_id", productId)
          .eq("status", "approved")
          .eq("rating", stars);
        if (error) throw error;
        return { stars, count: count ?? 0 };
      }),
    );
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const average = total ? Math.round((counts.reduce((sum, c) => sum + c.stars * c.count, 0) / total) * 10) / 10 : 0;
    return { average, count: total, distribution: counts };
  } catch (err) {
    console.error("[DAL:getReviewSummary]", err instanceof Error ? err.message : err);
    return { average: 0, count: 0, distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })) };
  }
}

/** A page of approved reviews, newest first. */
export async function getApprovedReviews(
  productId: string,
  offset: number,
  limit: number,
): Promise<{ reviews: PublicReview[]; total: number }> {
  try {
    const { data, count, error } = await getPublicClient()
      .from("reviews")
      .select("id, rating, title, comment, author_name, is_verified, created_at", { count: "exact" })
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return {
      total: count ?? 0,
      reviews: (data ?? []).map((r) => ({
        id: String(r.id),
        rating: n(r.rating),
        title: s(r.title),
        comment: s(r.comment),
        author: s(r.author_name),
        verified: r.is_verified === true,
        date: String(r.created_at),
      })),
    };
  } catch (err) {
    console.error("[DAL:getApprovedReviews]", err instanceof Error ? err.message : err);
    return { reviews: [], total: 0 };
  }
}

/* ── The visitor ─────────────────────────────────────────────── */

export interface SignedInProfile {
  profileId: string;
  fullName: string | null;
}

/** The signed-in visitor's profile (via their session), or null. */
export async function getSignedInProfile(): Promise<SignedInProfile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { profileId: String(profile.id), fullName: s(profile.full_name) };
}

/**
 * True when this buyer has a delivered order containing the product.
 * Runs with the buyer's session (RLS: own orders only) and filters by
 * their profile as well, so an admin session can't borrow other orders.
 */
export async function hasReceivedProduct(profileId: string, productId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, orders!inner(user_id, status), product_variants!inner(product_id)")
    .eq("orders.user_id", profileId)
    .eq("orders.status", "delivered")
    .eq("product_variants.product_id", productId)
    .limit(1);
  if (error) {
    console.error("[DAL:hasReceivedProduct]", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

/** What the reviews section offers this visitor: sign in, write / edit, or nothing. */
export async function getReviewerState(productId: string): Promise<ReviewerState> {
  try {
    const profile = await getSignedInProfile();
    if (!profile) return { status: "guest" };
    const supabase = await createServerClient();
    const [canReview, own] = await Promise.all([
      hasReceivedProduct(profile.profileId, productId),
      supabase
        .from("reviews")
        .select("rating, title, comment, status")
        .eq("user_id", profile.profileId)
        .eq("product_id", productId)
        .maybeSingle(),
    ]);
    const r = own.data;
    return {
      status: "signed_in",
      canReview,
      existing: r
        ? {
            rating: n(r.rating),
            title: s(r.title),
            comment: s(r.comment),
            status: (["pending", "approved", "rejected"].includes(String(r.status)) ? r.status : "pending") as ReviewStatus,
          }
        : null,
    };
  } catch (err) {
    console.error("[DAL:getReviewerState]", err instanceof Error ? err.message : err);
    return { status: "guest" };
  }
}

/* ── More products ───────────────────────────────────────────── */

/**
 * Only what a product card shows. Listing rows carry every product column
 * (descriptions, details, SEO text…); sending all of that to the browser for
 * a rail of cards made the page several times heavier than needed.
 */
function toCard(p: ListingProduct): ListingProduct {
  return {
    id: p.id,
    category_id: p.category_id,
    store_id: p.store_id,
    name_en: p.name_en,
    name_ar: p.name_ar,
    slug: p.slug,
    description_en: null,
    description_ar: null,
    base_price: p.base_price,
    sale_price: p.sale_price,
    brand: p.brand,
    rating: p.rating,
    review_count: p.review_count,
    total_orders: p.total_orders,
    is_featured: p.is_featured,
    is_new: p.is_new,
    is_active: p.is_active,
    created_at: p.created_at,
    updated_at: p.updated_at,
    category: p.category,
    store: null,
    primary_image: p.primary_image,
    secondary_image: p.secondary_image ?? null,
    variants: p.variants,
  };
}

export interface LookCollection {
  slug: string;
  title_en: string;
  title_ar: string;
  products: ListingProduct[];
}

/**
 * "Complete the look": other products from the first active collection
 * this product belongs to, in the collection's order. Null when none.
 */
export const getCompleteTheLook = cache(async (productId: string, limit = 8): Promise<LookCollection | null> => {
  try {
    const db = getPublicClient();
    const { data: links, error } = await db
      .from("collection_products")
      .select("collection_id, collections!inner(slug, title_en, title_ar, sort_order, is_active)")
      .eq("product_id", productId)
      .eq("collections.is_active", true);
    if (error) throw error;
    const collections = (links ?? [])
      .map((l) => ({ id: String(l.collection_id), meta: l.collections as unknown as Record<string, unknown> }))
      .filter((l) => l.meta)
      .sort((a, b) => n(a.meta.sort_order) - n(b.meta.sort_order));
    const first = collections[0];
    if (!first) return null;

    const { data: members, error: mErr } = await db
      .from("collection_products")
      .select("product_id, position")
      .eq("collection_id", first.id)
      .neq("product_id", productId)
      .order("position", { ascending: true })
      .limit(limit * 2);
    if (mErr) throw mErr;
    const ids = (members ?? []).map((m) => String(m.product_id));
    if (ids.length === 0) return null;

    const products = await getProductsByIds(ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    const sorted = products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).slice(0, limit);
    if (sorted.length === 0) return null;
    return {
      slug: String(first.meta.slug),
      title_en: String(first.meta.title_en ?? ""),
      title_ar: String(first.meta.title_ar ?? first.meta.title_en ?? ""),
      products: sorted.map(toCard),
    };
  } catch (err) {
    console.error("[DAL:getCompleteTheLook]", err instanceof Error ? err.message : err);
    return null;
  }
});

/**
 * Related products: best sellers from the same category, topped up from
 * the parent category when the category is small. Excludes this product
 * and anything already shown in "complete the look".
 */
export async function getRelatedProducts(
  product: Pick<ProductPageData, "id" | "category_id" | "category">,
  exclude: readonly string[] = [],
  limit = 8,
): Promise<ListingProduct[]> {
  const skip = new Set([product.id, ...exclude]);
  const pageSize = limit + skip.size;
  const out: ListingProduct[] = [];
  const add = (list: ListingProduct[]) => {
    for (const p of list) {
      if (out.length >= limit) break;
      if (skip.has(p.id)) continue;
      skip.add(p.id);
      out.push(p);
    }
  };

  if (product.category_id) {
    const { products } = await getProducts({ categoryIds: [product.category_id], sortBy: "popular" }, { page: 1, pageSize });
    add(products);
  }
  const parentSlug = product.category?.parent?.slug;
  if (out.length < 4 && parentSlug) {
    const { products } = await getProducts({ categorySlug: parentSlug, sortBy: "popular" }, { page: 1, pageSize: pageSize + out.length });
    add(products);
  }
  return out.map(toCard);
}
