/* ══════════════════════════════════════════════════════════════
   DAL – Collections
   ──────────────────────────────────────────────────────────────
   Curated product sets (collections + collection_products).
   Public reads: RLS shows active collections only. A collection
   without active products is left out of the index so visitors
   never land on an empty page from it.
   ══════════════════════════════════════════════════════════════ */

import "server-only";

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";

export interface Collection {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number;
  updated_at: string | null;
}

export interface CollectionSummary extends Collection {
  productCount: number;
  /** The collection's own image, or the first product's photo. */
  cover: { url: string; alt_en: string | null; alt_ar: string | null } | null;
}

const COLLECTION_COLUMNS = "id, slug, title_en, title_ar, description_en, description_ar, image_url, sort_order, updated_at";

interface MemberRow {
  collection_id: string;
  position: number;
  product: {
    is_active: boolean;
    product_images: { url: string; alt_text_en: string | null; alt_text_ar: string | null; is_primary: boolean; sort_order: number }[] | null;
  } | null;
}

/** Active collections that hold at least one active product, in display order. */
export const getCollections = cache(async (): Promise<CollectionSummary[]> => {
  try {
    const supabase = getPublicClient();
    const { data: collections, error } = await supabase
      .from("collections")
      .select(COLLECTION_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[DAL:getCollections]", error.message);
      return [];
    }
    const list = (collections ?? []) as Collection[];
    if (list.length === 0) return [];

    const { data: members, error: membersError } = await supabase
      .from("collection_products")
      .select("collection_id, position, product:products!inner(is_active, product_images(url, alt_text_en, alt_text_ar, is_primary, sort_order))")
      .in(
        "collection_id",
        list.map((c) => c.id),
      )
      .eq("product.is_active", true)
      .order("position", { ascending: true });
    if (membersError) console.error("[DAL:getCollections] members:", membersError.message);

    const rows = (members ?? []) as unknown as MemberRow[];
    return list
      .map((c) => {
        const own = rows.filter((m) => m.collection_id === c.id && m.product?.is_active);
        const firstImage = own
          .flatMap((m) =>
            (m.product?.product_images ?? [])
              .slice()
              .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
              .slice(0, 1),
          )
          .at(0);
        const cover = c.image_url
          ? { url: c.image_url, alt_en: null, alt_ar: null }
          : firstImage
            ? { url: firstImage.url, alt_en: firstImage.alt_text_en, alt_ar: firstImage.alt_text_ar }
            : null;
        return { ...c, productCount: own.length, cover };
      })
      .filter((c) => c.productCount > 0);
  } catch (err) {
    console.error("[DAL:getCollections] unexpected:", err);
    return [];
  }
});

/** One active collection by slug, or null. */
export const getCollectionBySlug = cache(async (slug: string): Promise<Collection | null> => {
  try {
    const { data, error } = await getPublicClient()
      .from("collections")
      .select(COLLECTION_COLUMNS)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[DAL:getCollectionBySlug]", error.message);
      return null;
    }
    return (data as Collection | null) ?? null;
  } catch (err) {
    console.error("[DAL:getCollectionBySlug] unexpected:", err);
    return null;
  }
});
