/* ══════════════════════════════════════════════════════════════
   Search results
   Route: /search?q=…
   ──────────────────────────────────────────────────────────────
   Arabic-aware, typo-tolerant results (search_products()) with
   the same toolbar, filters and grid as every listing. Without
   a query: the search box, popular categories and best sellers.
   Always noindex, follow (SEO decision); canonical /search.
   ══════════════════════════════════════════════════════════════ */

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { searchListing } from "@/lib/dal/products";
import { discoveryCopy } from "@/lib/search/copy";
import { toGridProduct } from "@/lib/search/card";
import { parseListingParams } from "@/lib/search/listing-params";
import { loadListingFacets, loadListingPage, popularCategories, type ListingScope } from "@/lib/search/listing-server";
import { ListingHeader } from "@/components/shop/ListingHeader";
import { ProductListing } from "@/components/shop/ProductListing";
import { GridSkeleton } from "@/components/shop/ListingSkeleton";
import { SearchPageForm } from "@/components/search/SearchPageForm";
import ProductCard from "@/components/product/ProductCard";
import type { Locale } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SEARCH: ListingScope = { kind: "search" };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const { q } = parseListingParams(params);
  const seo = SEO_COPY[locale];
  return buildPageMetadata({
    locale,
    title: q ? seo.searchTitle(q.slice(0, 60)) : discoveryCopy(locale).search,
    description: seo.shopDescription,
    path: "/search",
    noindex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const state = parseListingParams(params);
  const copy = discoveryCopy(locale);
  const crumbs = [{ label: copy.home, href: "/" }, { label: copy.search }];

  if (!state.q) {
    return (
      <>
        <ListingHeader
          breadcrumbs={crumbs}
          title={copy.search}
          aside={<SearchPageForm key="" locale={locale} initialQuery="" />}
        />
        <Suspense
          fallback={
            <div className="container-x border-t border-border pt-10 pb-24 md:pt-14">
              <GridSkeleton cards={4} />
            </div>
          }
        >
          <SearchStarters locale={locale} />
        </Suspense>
      </>
    );
  }

  const filters = loadListingFacets(SEARCH, state);
  const listing = await loadListingPage(SEARCH, state);
  if (state.page > 1 && listing.products.length === 0) notFound();

  return (
    <>
      <ListingHeader
        breadcrumbs={crumbs}
        eyebrow={copy.search}
        title={copy.resultsFor(state.q)}
        // No count beside "Results for …" when the empty state below already says nothing matched.
        count={listing.total > 0 ? copy.productCount(listing.total) : undefined}
        aside={<SearchPageForm key={state.q} locale={locale} initialQuery={state.q} />}
      />
      <ProductListing
        listing={listing}
        filters={filters}
        scope={SEARCH}
        state={state}
        basePath="/search"
        locale={locale}
        popular={popularCategories}
      />
    </>
  );
}

/** Before a search: popular categories and best sellers. */
async function SearchStarters({ locale }: { locale: Locale }) {
  const copy = discoveryCopy(locale);
  const [categories, best] = await Promise.all([popularCategories(), searchListing({ sort: "bestselling" }, 1, 4)]);
  return (
    <div className="container-x flex flex-col gap-14 border-t border-border pt-10 pb-24 md:gap-20 md:pt-14 md:pb-32">
      {categories.length > 0 ? (
        <nav aria-labelledby="search-popular">
          <h2 id="search-popular" className="t-eyebrow">
            {copy.popularCategories}
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${encodeURIComponent(c.slug)}`}
                  className="inline-flex h-10 items-center rounded-sm border border-border px-4 text-[0.8125rem] text-text-primary transition-colors hover:border-text-primary"
                >
                  {locale === "ar" ? c.name_ar : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {best.products.length > 0 ? (
        <section aria-labelledby="search-best">
          <h2 id="search-best" className="t-h2 mb-8">
            {copy.trending}
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-4">
            {best.products.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={toGridProduct(p)}
                  locale={locale}
                  sizes="(min-width: 1600px) 400px, (min-width: 768px) 25vw, 50vw"
                  priority={i < 2}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
