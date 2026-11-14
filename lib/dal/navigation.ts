import "server-only";

/* ══════════════════════════════════════════════════════════════
   DAL — storefront navigation and the signed-in visitor
   ──────────────────────────────────────────────────────────────
   getNavigation(): the category tree (top level + sub-categories)
   with an editorial image per top-level category, plus active
   collections. Only branches with products are returned.
   getViewer(): who is browsing (name, email, admin or not).
   Both are cached per request (React cache), so the header,
   footer, home page and 404 page share one set of queries.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import { createServerClient } from "@/lib/supabase/server";
import { buildNavTree, type CategoryRow, type Navigation, type NavCollection } from "@/components/layout/shell-rules";

export type { Navigation, NavCategory, NavCollection, NavLink } from "@/components/layout/shell-rules";

type ImageRow = { url: string; is_primary: boolean | null; sort_order: number | null };
type ProductRow = { category_id: string; product_images: ImageRow[] | null };

/** First product photo per category: featured and newest products first. */
function firstImages(products: ProductRow[]): Map<string, string> {
  const images = new Map<string, string>();
  for (const p of products) {
    if (images.has(p.category_id)) continue;
    const img = (p.product_images ?? [])
      .slice()
      .sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    if (img?.url) images.set(p.category_id, img.url);
  }
  return images;
}

export const getNavigation = cache(async (): Promise<Navigation> => {
  try {
    const db = getPublicClient();
    const [cats, counts, photos, cols] = await Promise.all([
      db.from("categories").select("id, parent_id, slug, name_en, name_ar, image_url, sort_order, is_featured"),
      // Visible (active) products per category: RLS hides inactive ones from the public client.
      db.from("categories").select("id, products(count)"),
      db
        .from("products")
        .select("category_id, product_images(url, is_primary, sort_order)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(120),
      db
        .from("collections")
        .select("slug, title_en, title_ar, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8),
    ]);

    if (cats.error) throw cats.error;
    const rows = (cats.data ?? []) as CategoryRow[];

    const countById = new Map<string, number>();
    for (const row of (counts.data ?? []) as { id: string; products: { count: number }[] | null }[]) {
      countById.set(row.id, row.products?.[0]?.count ?? 0);
    }

    // Product photos roll up to the top-level category.
    const parentOf = new Map(rows.map((r) => [r.id, r.parent_id] as const));
    const topOf = (id: string) => {
      let cur = id;
      for (let i = 0; i < 5 && parentOf.get(cur); i++) cur = parentOf.get(cur)!;
      return cur;
    };
    const byCategory = firstImages((photos.data ?? []) as ProductRow[]);
    const byTop = new Map<string, string>();
    for (const [catId, url] of byCategory) if (!byTop.has(topOf(catId))) byTop.set(topOf(catId), url);

    const categories = buildNavTree(
      rows,
      (id) => countById.get(id) ?? 0,
      (id) => byTop.get(id) ?? null,
    );

    const collections: NavCollection[] = cols.error
      ? []
      : ((cols.data ?? []) as { slug: string; title_en: string; title_ar: string; image_url: string | null }[]).map((c) => ({
          slug: c.slug,
          title: { en: c.title_en, ar: c.title_ar },
          image: c.image_url,
        }));

    return { categories, collections };
  } catch (err) {
    console.error("[DAL:getNavigation]", err instanceof Error ? err.message : err);
    return { categories: [], collections: [] };
  }
});

export interface Viewer {
  name: string;
  email: string;
  /** Staff (admin) or the store owner (super admin). */
  isAdmin: boolean;
}

/** The signed-in visitor, or null. Never throws (the header must always render). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const meta = user.user_metadata ?? {};
    const metaName = `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
    return {
      name: (profile?.full_name as string | null)?.trim() || metaName || "",
      email: user.email ?? "",
      isAdmin: profile?.role === "admin" || profile?.role === "super_admin",
    };
  } catch {
    return null;
  }
});
