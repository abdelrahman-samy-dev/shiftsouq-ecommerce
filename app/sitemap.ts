/* ══════════════════════════════════════════════════════════════
   Dynamic Sitemap — /sitemap.xml
   ──────────────────────────────────────────────────────────────
   Generates a comprehensive XML sitemap for search engines
   including all static pages, product pages, and category pages.
   Fetched from the database to always reflect current inventory.

   R1 from the Security & SEO Audit.
   ══════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from "next";
import { getPublicClient } from "@/lib/supabase/public";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://shiftsouq.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getPublicClient();

  /* ── Fetch all active products ──────────────────────────────── */
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  /* ── Fetch all categories ───────────────────────────────────── */
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, updated_at, created_at");

  /* ── Static Pages ───────────────────────────────────────────── */
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  /* ── Product Pages ──────────────────────────────────────────── */
  const productPages: MetadataRoute.Sitemap = (products ?? []).map(
    (product) => ({
      url: `${BASE_URL}/product/${product.slug}`,
      lastModified: new Date(product.updated_at || product.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  /* ── Category Pages ─────────────────────────────────────────── */
  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map(
    (category) => ({
      url: `${BASE_URL}/category/${category.slug}`,
      lastModified: new Date(category.updated_at || category.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  return [...staticPages, ...productPages, ...categoryPages];
}
