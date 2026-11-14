/* ══════════════════════════════════════════════════════════════
   Sitemap — /sitemap.xml
   ──────────────────────────────────────────────────────────────
   Home, shop, the public information pages, every active product
   (with its images) and every category that has active products.

   lastModified comes from the data: products use updated_at,
   categories (which have no updated_at column) use the newest
   product change inside them. Regenerated at most once an hour.
   ══════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from "next";
import { getPublicClient } from "@/lib/supabase/public";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 3600;

const INFO_PAGES = ["/contact", "/shipping", "/refund-policy", "/privacy-policy", "/terms"];

interface ProductRow {
  slug: string;
  category_id: string;
  updated_at: string | null;
  created_at: string;
  product_images: { url: string; is_primary: boolean; sort_order: number }[] | null;
}

interface CategoryRow {
  id: string;
  parent_id: string | null;
  slug: string;
  created_at: string;
}

function latest(dates: (string | null | undefined)[]): Date | undefined {
  const times = dates
    .map((d) => (d ? Date.parse(d) : NaN))
    .filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getPublicClient();

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("products")
      .select("slug, category_id, updated_at, created_at, product_images(url, is_primary, sort_order)")
      .eq("is_active", true)
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, parent_id, slug, created_at"),
  ]);

  if (productsRes.error) console.error("[sitemap] products:", productsRes.error.message);
  if (categoriesRes.error) console.error("[sitemap] categories:", categoriesRes.error.message);

  const products = (productsRes.data ?? []) as ProductRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const catalogueUpdated = latest(products.map((p) => p.updated_at ?? p.created_at));

  /* ── Static pages ───────────────────────────────────────────── */
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: catalogueUpdated, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: catalogueUpdated, changeFrequency: "daily", priority: 0.9 },
    ...INFO_PAGES.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  /* ── Product pages ──────────────────────────────────────────── */
  const productPages: MetadataRoute.Sitemap = products.map((product) => {
    const images = [...(product.product_images ?? [])]
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
      .map((img) => absoluteUrl(img.url));
    return {
      url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`),
      lastModified: latest([product.updated_at, product.created_at]),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(images.length ? { images } : {}),
    };
  });

  /* ── Category pages (only those with active products) ──────── */
  const productsByCategory = new Map<string, ProductRow[]>();
  for (const p of products) {
    const list = productsByCategory.get(p.category_id) ?? [];
    list.push(p);
    productsByCategory.set(p.category_id, list);
  }

  const categoryPages: MetadataRoute.Sitemap = [];
  for (const category of categories) {
    const childIds = categories.filter((c) => c.parent_id === category.id).map((c) => c.id);
    const inCategory = [category.id, ...childIds].flatMap((id) => productsByCategory.get(id) ?? []);
    if (inCategory.length === 0) continue;
    categoryPages.push({
      url: absoluteUrl(`/category/${encodeURIComponent(category.slug)}`),
      lastModified: latest(inCategory.map((p) => p.updated_at ?? p.created_at)) ?? latest([category.created_at]),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
