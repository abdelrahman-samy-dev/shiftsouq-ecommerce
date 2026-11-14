/* ══════════════════════════════════════════════════════════════
   Collection — a curated product set
   Route: /collections/[slug]
   ──────────────────────────────────────────────────────────────
   Editorial header (with the collection's image when it has
   one), then the same toolbar and grid as every listing. The
   default order is the curated one. Unknown or hidden
   collections answer with a real 404.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCollectionBySlug } from "@/lib/dal/collections";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import JsonLd from "@/lib/seo/JsonLd";
import { discoveryCopy } from "@/lib/search/copy";
import { parseListingParams } from "@/lib/search/listing-params";
import { loadListingFacets, loadListingPage, popularCategories, type ListingScope } from "@/lib/search/listing-server";
import { ListingHeader } from "@/components/shop/ListingHeader";
import { ProductListing } from "@/components/shop/ProductListing";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getRequestLocale()]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const copy = SEO_COPY[locale];
  const title = locale === "ar" ? collection.title_ar : collection.title_en;
  const description = (locale === "ar" ? collection.description_ar : collection.description_en)?.trim();
  const { page } = parseListingParams(query);
  const path = `/collections/${encodeURIComponent(collection.slug)}`;

  return buildPageMetadata({
    locale,
    title: page > 1 ? `${title} — ${copy.pageSuffix(page)}` : title,
    description: description || copy.categoryDescription(title),
    path: page > 1 ? `${path}?page=${page}` : path,
    image: collection.image_url ? { url: collection.image_url, alt: title } : null,
  });
}

export default async function CollectionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, query, locale] = await Promise.all([params, searchParams, getRequestLocale()]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const state = parseListingParams(query);
  const scope: ListingScope = { kind: "collection", collection };
  const filters = loadListingFacets(scope, state);
  const listing = await loadListingPage(scope, state);
  if (state.page > 1 && listing.products.length === 0) notFound();

  const copy = discoveryCopy(locale);
  const seo = SEO_COPY[locale];
  const title = locale === "ar" ? collection.title_ar : collection.title_en;
  const description = locale === "ar" ? collection.description_ar : collection.description_en;
  const path = `/collections/${encodeURIComponent(collection.slug)}`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: seo.home, path: "/" },
          { name: copy.collections, path: "/collections" },
          { name: title, path },
        ])}
      />
      <ListingHeader
        breadcrumbs={[{ label: copy.home, href: "/" }, { label: copy.collections, href: "/collections" }, { label: title }]}
        eyebrow={copy.collection}
        title={title}
        description={description}
        count={copy.productCount(listing.total)}
        aside={
          collection.image_url && state.page === 1 ? (
            <div className="relative mt-8 aspect-[4/5] overflow-hidden bg-surface sm:aspect-[16/9] md:mt-12 lg:aspect-[21/9]">
              <Image
                src={collection.image_url}
                alt=""
                fill
                sizes="(min-width: 1600px) 1504px, 100vw"
                loading="eager"
                fetchPriority="high"
                className="object-cover"
              />
            </div>
          ) : null
        }
      />
      <ProductListing
        listing={listing}
        filters={filters}
        scope={scope}
        state={state}
        basePath={path}
        locale={locale}
        popular={popularCategories}
      />
    </>
  );
}
