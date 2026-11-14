/* ══════════════════════════════════════════════════════════════
   Category Page — Products by Category
   Route: /category/[slug]
   ──────────────────────────────────────────────────────────────
   Server component displaying products within a specific category.

   Same 2-column layout as /shop:
   Sidebar filters (desktop) / toggle drawer (mobile)
   + product grid with smart pagination.

   Key difference from /shop: The categoryId is fixed from the URL
   slug. The sidebar still shows all categories for cross-navigation
   but the product query is scoped to this category + its children.

   All filter state is URL-driven via searchParams for SSR + sharing.
   ══════════════════════════════════════════════════════════════ */

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ChevronRight, Package } from "lucide-react";

import {
  getProducts,
  getCategories,
  getCategoryWithDescendantIds,
  getAvailableFiltersForCategories,
} from "@/lib/dal";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { ProductFilters } from "@/lib/types";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import JsonLd from "@/lib/seo/JsonLd";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import Pagination from "@/components/shared/Pagination";
import SortSelect from "@/components/shop/SortSelect";
import ShopFilters from "@/components/shop/ShopFilters";
import MobileFilterToggle from "@/components/shop/MobileFilterToggle";

/* ── Static Generation (SSG) ─────────────────────────────────── */

import { getPublicClient } from "@/lib/supabase/public";

/**
 * Pre-renders all category pages at build time.
 */
export async function generateStaticParams() {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("categories")
      .select("slug");

    return (data ?? []).map((cat) => ({
      slug: cat.slug,
    }));
  } catch (error) {
    console.warn("⚠️ Build Warning: Failed to fetch categories for static generation. Missing database credentials?", error);
    return [];
  }
}

/* ── Dynamic Metadata (SEO + OpenGraph) ───────────────────── */

/** Grid: one column on phones, two on tablets, three beside the sidebar. */
const CATEGORY_CARD_SIZES = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 330px";

/**
 * Title, description, canonical URL (keeps ?page=N, drops sort and
 * filters) and share cards in the visitor's language.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getRequestLocale()]);
  const copy = SEO_COPY[locale];
  const result = await getCategoryWithDescendantIds(slug);

  // Throwing here (not only in the page) lets crawlers, which get blocking
  // metadata, receive a real 404 instead of a soft 404 behind the loading shell.
  if (!result) notFound();

  const { category } = result;
  const name = locale === "ar" ? category.name_ar : category.name_en;
  const ownDescription = locale === "ar" ? category.description_ar : category.description_en;
  const page = Number.parseInt(typeof query.page === "string" ? query.page : "1", 10);
  const pageNumber = Number.isFinite(page) && page > 1 ? page : 1;
  const path = `/category/${encodeURIComponent(category.slug)}`;

  return buildPageMetadata({
    locale,
    title: pageNumber > 1 ? `${name} — ${copy.pageSuffix(pageNumber)}` : name,
    description: ownDescription?.trim() ? ownDescription : copy.categoryDescription(name),
    path: pageNumber > 1 ? `${path}?page=${pageNumber}` : path,
    image: { url: category.image_url || getCategoryHeroImage(category.slug), alt: name },
  });
}

/* ── Category Hero Image Fallback Map ─────────────────────── */

/**
 * Returns a hero banner image URL for a category slug.
 * Uses the category's own `image_url` first, falling back to
 * curated Unsplash images per known slug.
 *
 * @param slug - The category slug.
 * @returns URL string for the hero banner image.
 */
function getCategoryHeroImage(slug: string): string {
  const map: Record<string, string> = {
    men: "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=2000&auto=format&fit=crop",
    sneakers:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=2000&auto=format&fit=crop",
    accessories:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=2000&auto=format&fit=crop",
    tech: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2000&auto=format&fit=crop",
    beauty:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=2000&auto=format&fit=crop",
    home: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=2000&auto=format&fit=crop",
    collections:
      "https://images.unsplash.com/photo-1505022610485-0249ba5b3675?q=80&w=2000&auto=format&fit=crop",
  };
  return (
    map[slug] ??
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop"
  );
}



/* ── Page Component ────────────────────────────────────────── */

/**
 * CategoryPage — Displays products filtered by a specific category.
 *
 * @param params       - URL params containing the category slug.
 * @param searchParams - URL search params for filters, sort, and pagination.
 */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedParams = await searchParams;

  const locale = await getRequestLocale();
  const isAr = locale === "ar";
  const copy = SEO_COPY[locale];

  /* Parallel data fetching */
  const [categoryResult, dict, allCategories] = await Promise.all([
    getCategoryWithDescendantIds(slug),
    getDictionary(locale),
    getCategories(),
  ]);

  /* 404 guard */
  if (!categoryResult) notFound();

  const { category, ids: categoryIds } = categoryResult;
  const basePath = `/category/${slug}`;

  /* ── Extract & Normalize Filter Params ────────────────── */
  const sortBy =
    typeof resolvedParams.sort === "string"
      ? resolvedParams.sort
      : undefined;
  const pageParam =
    typeof resolvedParams.page === "string"
      ? parseInt(resolvedParams.page, 10)
      : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const minPrice =
    typeof resolvedParams.minPrice === "string"
      ? parseFloat(resolvedParams.minPrice)
      : undefined;
  const maxPrice =
    typeof resolvedParams.maxPrice === "string"
      ? parseFloat(resolvedParams.maxPrice)
      : undefined;
  const sizes =
    typeof resolvedParams.sizes === "string"
      ? resolvedParams.sizes.split(",").filter(Boolean)
      : undefined;
  const colors =
    typeof resolvedParams.colors === "string"
      ? resolvedParams.colors.split(",").filter(Boolean)
      : undefined;

  /* ── Fetch Dynamic Available Filters ─────────────────── */
  const availableFilters = await getAvailableFiltersForCategories(categoryIds);

  /* ── Fetch Products ──────────────────────────────────── */
  const { products, count } = await getProducts(
    {
      categoryIds,
      sortBy: sortBy as ProductFilters["sortBy"],
      minPrice: minPrice && !isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice && !isNaN(maxPrice) ? maxPrice : undefined,
      sizes: sizes && sizes.length > 0 ? sizes : undefined,
      colors: colors && colors.length > 0 ? colors : undefined,
    },
    { page, pageSize: PRODUCTS_PER_PAGE }
  );

  const totalPages = Math.ceil(count / PRODUCTS_PER_PAGE);
  const categoryName = isAr ? category.name_ar : category.name_en;
  const categoryDescription = isAr
    ? category.description_ar
    : category.description_en;

  /* ── Compute "Showing X–Y of Z" ─────────────────────── */
  const fromItem = count === 0 ? 0 : (page - 1) * PRODUCTS_PER_PAGE + 1;
  const toItem = Math.min(page * PRODUCTS_PER_PAGE, count);

  /* ── Flatten searchParams for child components ───────── */
  const flatParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string") {
      flatParams[key] = value;
    }
  }

  const heroImage = category.image_url || getCategoryHeroImage(slug);

  const breadcrumbs = breadcrumbJsonLd([
    { name: copy.home, path: "/" },
    { name: copy.shop, path: "/shop" },
    { name: categoryName, path: basePath },
  ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <JsonLd data={breadcrumbs} />
      {/* ── Category Hero Banner ────────────────────────────── */}
      <section
        className="relative w-full h-[240px] sm:h-[300px] overflow-hidden"
        aria-label={categoryName}
      >
        {/* Decorative banner and the page's LCP: fetched eagerly, high priority. */}
        <Image
          src={heroImage}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"
          aria-hidden="true"
        />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            {/* Breadcrumb on hero */}
            <nav
              className="flex items-center gap-1.5 text-sm mb-3 flex-wrap"
              aria-label="Breadcrumb"
            >
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition-colors"
              >
                {isAr ? "الرئيسية" : "Home"}
              </Link>
              <ChevronRight
                size={14}
                className="flex-shrink-0 rtl:rotate-180 text-gray-500"
                aria-hidden="true"
              />
              <Link
                href="/shop"
                className="text-gray-300 hover:text-white transition-colors"
              >
                {isAr ? "المتجر" : "Shop"}
              </Link>
              <ChevronRight
                size={14}
                className="flex-shrink-0 rtl:rotate-180 text-gray-500"
                aria-hidden="true"
              />
              <span className="text-white font-medium" aria-current="page">
                {categoryName}
              </span>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
              {categoryName}
            </h1>
            {categoryDescription && (
              <p className="text-base text-gray-200 mt-1.5 max-w-2xl drop-shadow-sm">
                {categoryDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Content: Sidebar + Grid ───────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="shop-layout">
          {/* ── Sidebar Filters (Desktop) ────────────────── */}
          <div className="shop-sidebar">
            <ShopFilters
              categories={allCategories}
              locale={locale}
              basePath={basePath}
              availableSizes={availableFilters.sizes}
              availableColors={availableFilters.colors}
              currentCategorySlug={slug}
            />
          </div>

          {/* ── Main Content ─────────────────────────────── */}
          <div className="shop-content">
            {/* ── Header Bar ─────────────────────────────── */}
            <div className="shop-header">
              <div className="shop-header-left">
                <MobileFilterToggle
                  categories={allCategories}
                  locale={locale}
                  basePath={basePath}
                  availableSizes={availableFilters.sizes}
                  availableColors={availableFilters.colors}
                  currentCategorySlug={slug}
                />

                <div>
                  <h2 className="shop-page-title">{categoryName}</h2>
                  <p className="shop-results-count">
                    {count > 0
                      ? isAr
                        ? `عرض ${fromItem}–${toItem} من ${count} منتج`
                        : `Showing ${fromItem}–${toItem} of ${count} products`
                      : isAr
                        ? "لا توجد نتائج"
                        : "No results"}
                  </p>
                </div>
              </div>
              <SortSelect locale={locale} basePath={basePath} />
            </div>

            {/* ── Divider ────────────────────────────────── */}
            <div className="divider mb-6" />

            {/* ── Products Grid ──────────────────────────── */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product, index) => (
                  <AnimatedProductCard key={product.id} index={index}>
                    <ProductCard
                      product={product}
                      locale={locale}
                      dict={dict}
                      sizes={CATEGORY_CARD_SIZES}
                    />
                  </AnimatedProductCard>
                ))}
              </div>
            ) : (
              /* ── Empty State ──────────────────────────── */
              <div
                className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in"
                style={{ color: "var(--text-muted)" }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <Package size={28} strokeWidth={1} aria-hidden="true" />
                </div>
                <p
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isAr
                    ? "لا توجد منتجات في هذه الفئة"
                    : "No products in this category"}
                </p>
                <p className="text-sm text-center max-w-sm">
                  {isAr
                    ? "تصفح فئات أخرى أو عد إلى المتجر"
                    : "Browse other categories or go back to the shop"}
                </p>
                <Link href="/shop" className="btn-primary mt-2">
                  {isAr ? "المتجر" : "Back to Shop"}
                </Link>
              </div>
            )}

            {/* ── Pagination ─────────────────────────────── */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              searchParams={flatParams}
              basePath={basePath}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
