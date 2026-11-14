/* ══════════════════════════════════════════════════════════════
   Category — products in a category and its subcategories
   Route: /category/[slug]
   ──────────────────────────────────────────────────────────────
   The category is looked up before anything streams, so an
   unknown slug answers with a real 404 (no route-level
   loading.tsx here). The cards render with the page; filter
   options stream into the toolbar inside <Suspense>.
   Parent categories link to their subcategories; subcategories
   link to their siblings.

   Canonical: /category/<slug>, keeping ?page=N; sort and filters
   point to the unfiltered page.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategories, getCategoryBySlug } from "@/lib/dal/categories";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import JsonLd from "@/lib/seo/JsonLd";
import { discoveryCopy } from "@/lib/search/copy";
import { parseListingParams } from "@/lib/search/listing-params";
import { loadListingFacets, loadListingPage, popularCategories, type ListingScope } from "@/lib/search/listing-server";
import { ListingHeader, type QuickLink } from "@/components/shop/ListingHeader";
import { ProductListing } from "@/components/shop/ProductListing";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getRequestLocale()]);
  const category = await getCategoryBySlug(slug);
  // Crawlers that get blocking metadata receive the 404 here too.
  if (!category) notFound();

  const copy = SEO_COPY[locale];
  const name = locale === "ar" ? category.name_ar : category.name_en;
  const ownDescription = locale === "ar" ? category.description_ar : category.description_en;
  const { page } = parseListingParams(query);
  const path = `/category/${encodeURIComponent(category.slug)}`;

  return buildPageMetadata({
    locale,
    title: page > 1 ? `${name} — ${copy.pageSuffix(page)}` : name,
    description: ownDescription?.trim() ? ownDescription : copy.categoryDescription(name),
    path: page > 1 ? `${path}?page=${page}` : path,
    image: category.image_url ? { url: category.image_url, alt: name } : null,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getRequestLocale()]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const state = parseListingParams(query);
  const scope: ListingScope = { kind: "category", category };
  const filters = loadListingFacets(scope, state);
  const listing = await loadListingPage(scope, state);
  // A page past the end is not a page.
  if (state.page > 1 && listing.products.length === 0) notFound();

  const copy = discoveryCopy(locale);
  const seo = SEO_COPY[locale];
  const name = (c: { name_en: string; name_ar: string }) => (locale === "ar" ? c.name_ar : c.name_en);
  const href = (s: string) => `/category/${encodeURIComponent(s)}`;

  const tree = await getCategories();
  const top = tree.find((c) => c.id === category.id);
  const parent = category.parent_id ? tree.find((c) => c.id === category.parent_id) ?? null : null;

  // Parent: "All" + its subcategories. Subcategory: its parent's "All" + siblings.
  let links: QuickLink[] = [];
  if (top && top.children.length > 0) {
    links = [{ label: copy.all, href: href(top.slug), active: true }, ...top.children.map((c) => ({ label: name(c), href: href(c.slug) }))];
  } else if (parent) {
    links = [
      { label: copy.all, href: href(parent.slug) },
      ...parent.children.map((c) => ({ label: name(c), href: href(c.slug), active: c.id === category.id })),
    ];
  }

  const crumbs = [
    { label: copy.home, href: "/" },
    { label: copy.shop, href: "/shop" },
    ...(parent ? [{ label: name(parent), href: href(parent.slug) }] : []),
    { label: name(category) },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: seo.home, path: "/" },
          { name: seo.shop, path: "/shop" },
          ...(parent ? [{ name: name(parent), path: href(parent.slug) }] : []),
          { name: name(category), path: href(category.slug) },
        ])}
      />
      <ListingHeader
        breadcrumbs={crumbs}
        title={name(category)}
        description={locale === "ar" ? category.description_ar : category.description_en}
        count={copy.productCount(listing.total)}
        links={links}
        linksLabel={copy.subcategories}
      />
      <ProductListing
        listing={listing}
        filters={filters}
        scope={scope}
        state={state}
        basePath={href(category.slug)}
        locale={locale}
        popular={popularCategories}
      />
    </>
  );
}
