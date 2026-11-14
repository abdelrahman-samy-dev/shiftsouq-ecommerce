/* ══════════════════════════════════════════════════════════════
   Shop Page — Full Product Listing with Filtering & Pagination
   Route: /shop
   ──────────────────────────────────────────────────────────────
   Server component rendering the main shop view with:
   - Sidebar filters (desktop) / toggle drawer (mobile)
   - Product grid with smart pagination
   - Sort control

   All state is URL-driven via searchParams for SSR + link sharing.
   No client-side state management needed.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Package } from "lucide-react";

import { getProducts, getCategories, getAvailableFiltersForCategories } from "@/lib/dal";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { ProductFilters } from "@/lib/types";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import Pagination from "@/components/shared/Pagination";
import SortSelect from "@/components/shop/SortSelect";
import ShopFilters from "@/components/shop/ShopFilters";
import MobileFilterToggle from "@/components/shop/MobileFilterToggle";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Grid: two columns below lg, three columns beside the filter sidebar above. */
const SHOP_CARD_SIZES = "(max-width: 1023px) 50vw, 330px";

const first = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

/* ── Metadata (visitor's language) ─────────────────────────
   Canonical rules:
   - /shop?category=x duplicates /category/x → canonical there.
   - Pagination keeps ?page=N; sort/price/size/colour filters
     point to the unfiltered list.
   - Search results are noindex (follow) with canonical /shop.  */

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const copy = SEO_COPY[locale];

  const category = first(params.category);
  const query = first(params.q)?.trim();
  const isNew = params.isNew === "true";
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const pageNumber = Number.isFinite(page) && page > 1 ? page : 1;

  if (category) {
    const categories = await getCategories();
    const match =
      categories.find((c) => c.slug === category) ??
      categories.flatMap((c) => c.children).find((c) => c.slug === category);
    if (match) {
      const name = locale === "ar" ? match.name_ar : match.name_en;
      return buildPageMetadata({
        locale,
        title: name,
        description: copy.categoryDescription(name),
        path: `/category/${encodeURIComponent(match.slug)}`,
      });
    }
  }

  const baseTitle = query
    ? copy.searchTitle(query.slice(0, 60))
    : isNew
      ? copy.newArrivalsTitle
      : copy.shopTitle;

  return buildPageMetadata({
    locale,
    title: pageNumber > 1 ? `${baseTitle} — ${copy.pageSuffix(pageNumber)}` : baseTitle,
    description: copy.shopDescription,
    path: pageNumber > 1 && !query ? `/shop?page=${pageNumber}` : "/shop",
    noindex: Boolean(query),
  });
}

/* ── Page Component ────────────────────────────────────────── */

/**
 * ShopPage — The main product listing page.
 *
 * Extracts filter/sort/pagination params from the URL, fetches
 * matching products from the DAL, and renders the results in a
 * responsive grid layout.
 *
 * @param searchParams - URL search params (filters, sort, page).
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const locale = await getRequestLocale();
  const isAr = locale === "ar";

  const [dict, categories] = await Promise.all([
    getDictionary(locale),
    getCategories(),
  ]);

  /* ── Extract & Normalize Filter Params ────────────────── */
  const categorySlug =
    typeof resolvedParams.category === "string"
      ? resolvedParams.category
      : undefined;
  const sortBy =
    typeof resolvedParams.sort === "string"
      ? resolvedParams.sort
      : undefined;
  const isNew = resolvedParams.isNew === "true";
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
  const searchQuery =
    typeof resolvedParams.q === "string"
      ? resolvedParams.q
      : undefined;

  /* ── Fetch Dynamic Available Filters ─────────────────── */
  // If a category is selected, fetch filters for that category. Otherwise, fetch all available globally.
  let filterCategoryIds: string[] = [];
  if (categorySlug) {
    const parent = categories.find((c) => c.slug === categorySlug);
    const child = parent
      ? undefined
      : categories.flatMap((c) => c.children).find((c) => c.slug === categorySlug);
    if (parent) {
      filterCategoryIds = [parent.id, ...parent.children.map((c) => c.id)];
    } else if (child) {
      filterCategoryIds = [child.id];
    }
  }
  const availableFilters = await getAvailableFiltersForCategories(filterCategoryIds);

  /* ── Fetch Products ──────────────────────────────────── */
  const { products, count } = await getProducts(
    {
      categorySlug,
      sortBy: sortBy as ProductFilters["sortBy"],
      isNew: isNew || undefined,
      minPrice: minPrice && !isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice && !isNaN(maxPrice) ? maxPrice : undefined,
      sizes: sizes && sizes.length > 0 ? sizes : undefined,
      colors: colors && colors.length > 0 ? colors : undefined,
      search: searchQuery,
    },
    { page, pageSize: PRODUCTS_PER_PAGE }
  );

  const totalPages = Math.ceil(count / PRODUCTS_PER_PAGE);

  /* ── Compute "Showing X–Y of Z" ─────────────────────── */
  const fromItem = count === 0 ? 0 : (page - 1) * PRODUCTS_PER_PAGE + 1;
  const toItem = Math.min(page * PRODUCTS_PER_PAGE, count);

  /* ── Active Category Name ────────────────────────────── */
  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug) ??
      categories.flatMap((c) => c.children).find((c) => c.slug === categorySlug)
    : null;
  let activeCategoryName = activeCategory
    ? isAr
      ? activeCategory.name_ar
      : activeCategory.name_en
    : null;

  if (!activeCategoryName && isNew) {
    activeCategoryName = isAr ? "وصل حديثاً" : "New Arrivals";
  } else if (!activeCategoryName && searchQuery) {
    activeCategoryName = isAr
      ? `نتائج البحث عن "${searchQuery}"`
      : `Search results for "${searchQuery}"`;
  }

  /* ── Flatten searchParams for child components ───────── */
  const flatParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string") {
      flatParams[key] = value;
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* ── Breadcrumb ──────────────────────────────────── */}
        <nav
          className="flex items-center gap-1.5 text-sm mb-8 flex-wrap animate-fade-in"
          aria-label="Breadcrumb"
          style={{ color: "var(--text-muted)" }}
        >
          <Link
            href="/"
            className="hover:text-text-primary transition-colors"
          >
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight
            size={14}
            className="flex-shrink-0 rtl:rotate-180"
            style={{ color: "var(--border)" }}
            aria-hidden="true"
          />
          <span
            className="font-medium"
            style={{ color: "var(--text-primary)" }}
            aria-current="page"
          >
            {activeCategoryName || (isAr ? "المتجر" : "Shop")}
          </span>
        </nav>

        {/* ── Shop Layout: Sidebar + Content ───────────────── */}
        <div className="shop-layout">
          {/* ── Sidebar Filters (Desktop) ──────────────── */}
          <div className="shop-sidebar">
            <ShopFilters 
              categories={categories} 
              locale={locale} 
              availableSizes={availableFilters.sizes}
              availableColors={availableFilters.colors}
            />
          </div>

          {/* ── Main Content ───────────────────────────── */}
          <div className="shop-content">
            {/* ── Header Bar ───────────────────────────── */}
            <div className="shop-header">
              <div className="shop-header-left">
                {/* Mobile Filter Toggle */}
                <MobileFilterToggle
                  categories={categories}
                  locale={locale}
                  availableSizes={availableFilters.sizes}
                  availableColors={availableFilters.colors}
                />

                <div>
                  <h1 className="shop-page-title">
                    {activeCategoryName ||
                      (isAr ? "جميع المنتجات" : "All Products")}
                  </h1>
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
              <SortSelect locale={locale} />
            </div>

            {/* ── Divider ──────────────────────────────── */}
            <div className="divider mb-6" />

            {/* ── Products Grid ────────────────────────── */}
            <h2 className="sr-only">{isAr ? "المنتجات" : "Products"}</h2>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {products.map((product, index) => (
                  <AnimatedProductCard key={product.id} index={index}>
                    <ProductCard
                      product={product}
                      locale={locale}
                      dict={dict}
                      sizes={SHOP_CARD_SIZES}
                    />
                  </AnimatedProductCard>
                ))}
              </div>
            ) : (
              /* ── Empty State ────────────────────────── */
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
                  {isAr ? "لا توجد منتجات" : "No products found"}
                </p>
                <p className="text-sm text-center max-w-sm">
                  {isAr
                    ? "جرب تصفية مختلفة أو تصفح جميع المنتجات"
                    : "Try adjusting your filters or browse all products"}
                </p>
                <Link href="/shop" className="btn-primary mt-2">
                  {isAr ? "عرض الكل" : "View All"}
                </Link>
              </div>
            )}

            {/* ── Pagination ──────────────────────────── */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              searchParams={flatParams}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
