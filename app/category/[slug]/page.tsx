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
import { cookies } from "next/headers";
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
import type { Locale } from "@/lib/types";
import { APP_NAME, PRODUCTS_PER_PAGE } from "@/lib/constants";
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
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("slug");

  return (data ?? []).map((cat) => ({
    slug: cat.slug,
  }));
}

/* ── Dynamic Metadata (SEO + OpenGraph) ───────────────────── */

/**
 * Generates dynamic metadata for category pages.
 * Includes the category name and description in the title/description
 * tags, with OpenGraph support for social sharing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryWithDescendantIds(slug);

  if (!result) {
    return {
      title: `Category Not Found | ${APP_NAME}`,
      description: "The requested category could not be found.",
    };
  }

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const isAr = locale === "ar";
  const name = isAr ? result.category.name_ar : result.category.name_en;
  const description = isAr
    ? result.category.description_ar ?? `تسوق ${name} في شيفت سوق`
    : result.category.description_en ??
      `Shop ${name} at ${APP_NAME} — premium quality, modern design.`;

  return {
    title: `${name} | ${APP_NAME}`,
    description,
    openGraph: {
      title: `${name} | ${APP_NAME}`,
      description,
      type: "website",
    },
  };
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

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const isAr = locale === "ar";

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
      sortBy: sortBy as any,
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

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Category Hero Banner ────────────────────────────── */}
      <section
        className="relative w-full h-[240px] sm:h-[300px] overflow-hidden"
        aria-label={categoryName}
      >
        <Image
          src={heroImage}
          alt={categoryName}
          fill
          priority
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up">
                {products.map((product, index) => (
                  <AnimatedProductCard key={product.id} index={index}>
                    <ProductCard
                      product={product}
                      locale={locale}
                      dict={dict as any}
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
