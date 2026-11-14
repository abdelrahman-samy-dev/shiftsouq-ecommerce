import "server-only";

/* ══════════════════════════════════════════════════════════════
   DAL — home page blocks
   ──────────────────────────────────────────────────────────────
   New arrivals, best sellers and the featured collection. Product
   rows carry only what ProductCard needs (they are serialised to
   the client), with up to two photos for the hover swap.
   Errors return empty lists: a section hides, the page stays up.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type { ListingProduct, ListingVariant } from "@/lib/dal/products";
import type { ProductImage } from "@/lib/types";

/** Only the columns ProductCard reads: every byte here is sent to the browser twice (HTML + RSC payload). */
const CARD_SELECT = `id, slug, name_en, name_ar, base_price, sale_price, is_new,
  product_images(id, url, alt_text_en, alt_text_ar, is_primary, sort_order),
  variants:product_variants(id, size, color_en, color_ar, color_hex, stock, price_override)`;

type CardRow = Record<string, unknown> & { id: string; product_images?: ProductImage[] | null };

function toCard(raw: CardRow): ListingProduct {
  const images = (raw.product_images ?? [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const withId = (img: ProductImage | undefined) => (img ? { ...img, product_id: raw.id } : null);
  const { product_images: _images, ...rest } = raw;
  void _images;
  return {
    ...(rest as unknown as ListingProduct),
    category: null,
    store: null,
    variants: (raw.variants as ListingVariant[]) ?? [],
    primary_image: withId(images[0]),
    secondary_image: withId(images[1]),
  };
}

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function query(build: (q: ReturnType<typeof base>) => QueryResult): Promise<ListingProduct[]> {
  try {
    const { data, error } = await build(base());
    if (error) throw error;
    return ((data ?? []) as unknown as CardRow[]).map(toCard);
  } catch (err) {
    console.error("[DAL:home]", err instanceof Error ? err.message : err);
    return [];
  }
}

function base() {
  return getPublicClient().from("products").select(CARD_SELECT).eq("is_active", true);
}

function uniqueById(lists: ListingProduct[][], limit: number, exclude: ReadonlySet<string> = new Set()): ListingProduct[] {
  const seen = new Set(exclude);
  const out: ListingProduct[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Products marked "new", newest first; topped up with the latest products. */
export const getNewArrivals = cache(async (limit = 10): Promise<ListingProduct[]> => {
  const [marked, latest] = await Promise.all([
    query((q) => q.eq("is_new", true).order("created_at", { ascending: false }).limit(limit)),
    query((q) => q.order("created_at", { ascending: false }).limit(limit)),
  ]);
  return uniqueById([marked, latest], limit);
});

/** Most ordered products; featured products fill the grid while sales are few. */
export const getBestSellers = cache(async (limit = 8, excludeIds: readonly string[] = []): Promise<ListingProduct[]> => {
  const [sold, featured, rest] = await Promise.all([
    query((q) => q.gt("total_orders", 0).order("total_orders", { ascending: false }).limit(limit + excludeIds.length)),
    query((q) => q.eq("is_featured", true).order("created_at", { ascending: false }).limit(limit + excludeIds.length)),
    query((q) => q.order("rating", { ascending: false }).limit(limit + excludeIds.length)),
  ]);
  const exclude = new Set(excludeIds);
  const picked = uniqueById([sold, featured, rest], limit, exclude);
  // A small catalogue: rather repeat a new arrival than show a half-empty grid.
  return picked.length >= Math.min(4, limit) ? picked : uniqueById([sold, featured, rest], limit);
});

export interface HomeCollection {
  slug: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  image: string | null;
  productCount: number;
}

/** The first active collection (by sort order) for the editorial block. */
export const getFeaturedCollection = cache(async (): Promise<HomeCollection | null> => {
  try {
    const { data, error } = await getPublicClient()
      .from("collections")
      .select("slug, title_en, title_ar, description_en, description_ar, image_url, collection_products(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, unknown> & { collection_products?: { count: number }[] };
    return {
      slug: String(row.slug),
      title: { en: String(row.title_en ?? ""), ar: String(row.title_ar ?? "") },
      description: { en: String(row.description_en ?? ""), ar: String(row.description_ar ?? "") },
      image: (row.image_url as string | null) ?? null,
      productCount: row.collection_products?.[0]?.count ?? 0,
    };
  } catch (err) {
    console.error("[DAL:getFeaturedCollection]", err instanceof Error ? err.message : err);
    return null;
  }
});

/** First photo of a collection's products, when the collection has no image of its own. */
export async function getCollectionCover(slug: string): Promise<string | null> {
  try {
    const { data } = await getPublicClient()
      .from("collections")
      .select("collection_products(position, products(is_active, product_images(url, is_primary, sort_order)))")
      .eq("slug", slug)
      .maybeSingle();
    const items = ((data as { collection_products?: unknown[] } | null)?.collection_products ?? []) as {
      position: number;
      products: { is_active: boolean; product_images: { url: string; is_primary: boolean; sort_order: number }[] } | null;
    }[];
    for (const item of items.sort((a, b) => a.position - b.position)) {
      const imgs = item.products?.is_active ? item.products.product_images ?? [] : [];
      const img = imgs.slice().sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
      if (img?.url) return img.url;
    }
    return null;
  } catch {
    return null;
  }
}
