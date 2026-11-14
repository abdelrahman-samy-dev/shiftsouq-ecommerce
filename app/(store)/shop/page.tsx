/* ══════════════════════════════════════════════════════════════
   Shop — every product
   Route: /shop
   ──────────────────────────────────────────────────────────────
   Title + count, links to the main categories, sticky toolbar
   (filters, chips, sort, density) and the grid. All state is in
   the URL (lib/search/listing-params). The cards render with the
   page (first photos in the first HTML); filter options stream
   into the toolbar behind a same-size skeleton.

   Canonical rules (lib/seo):
   - /shop?category=x (one category, nothing else) → /category/x.
   - Pagination keeps ?page=N; sort and filters point to /shop.
   - /shop?q=… moves to /search?q=… (search pages are noindex).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getCategories } from "@/lib/dal/categories";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { discoveryCopy } from "@/lib/search/copy";
import { activeFilterCount, parseListingParams } from "@/lib/search/listing-params";
import { loadListingFacets, loadListingPage, popularCategories, type ListingScope } from "@/lib/search/listing-server";
import { ListingHeader } from "@/components/shop/ListingHeader";
import { ProductListing } from "@/components/shop/ProductListing";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SHOP: ListingScope = { kind: "shop" };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const copy = SEO_COPY[locale];
  const state = parseListingParams(params);

  // One category and nothing else duplicates its category page.
  if (state.categories.length === 1 && activeFilterCount(state) === 1 && !state.q) {
    const tree = await getCategories();
    const match = [...tree, ...tree.flatMap((c) => c.children)].find((c) => c.slug === state.categories[0]);
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

  const baseTitle = state.isNew ? copy.newArrivalsTitle : copy.shopTitle;
  return buildPageMetadata({
    locale,
    title: state.page > 1 ? `${baseTitle} — ${copy.pageSuffix(state.page)}` : baseTitle,
    description: copy.shopDescription,
    path: state.page > 1 ? `/shop?page=${state.page}` : "/shop",
  });
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, locale] = await Promise.all([searchParams, getRequestLocale()]);

  // Searches live on /search (noindex); keep old /shop?q= links working.
  const rawQuery = params.q;
  if (typeof rawQuery === "string" && rawQuery.trim()) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) qs.append(key, v);
    }
    permanentRedirect(`/search?${qs.toString()}`);
  }

  const state = parseListingParams(params);
  const filters = loadListingFacets(SHOP, state);
  const [listing, tree] = await Promise.all([loadListingPage(SHOP, state), getCategories()]);
  // A page past the end is not a page.
  if (state.page > 1 && listing.products.length === 0) notFound();

  const copy = discoveryCopy(locale);
  const title = state.isNew ? copy.newArrivals : copy.allProducts;

  return (
    <>
      <ListingHeader
        breadcrumbs={[{ label: copy.home, href: "/" }, { label: copy.shop }]}
        title={title}
        count={copy.productCount(listing.total)}
        linksLabel={copy.category}
        links={tree.map((c) => ({
          label: locale === "ar" ? c.name_ar : c.name_en,
          href: `/category/${encodeURIComponent(c.slug)}`,
        }))}
      />
      <ProductListing
        listing={listing}
        filters={filters}
        scope={SHOP}
        state={state}
        basePath="/shop"
        locale={locale}
        popular={popularCategories}
      />
    </>
  );
}
