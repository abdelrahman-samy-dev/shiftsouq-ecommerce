/* ══════════════════════════════════════════════════════════════
   Product page — /product/[slug]
   ──────────────────────────────────────────────────────────────
   • The product is read (and a missing one answered with
     notFound()) before anything streams, so missing products get
     a real HTTP 404. There is deliberately no loading.tsx here.
   • Above the fold renders in one pass: gallery + buy panel
     (client, components/product/ProductDetail) with server-made
     breadcrumbs, title and accordions passed in.
   • Below the fold streams behind Suspense: complete the look,
     reviews, related products. Recently viewed is client-only.
   • SEO: generateMetadata (product SEO fields when set), Product +
     BreadcrumbList JSON-LD; every price follows lib/seo/pricing.
   ══════════════════════════════════════════════════════════════ */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { Accordion, Breadcrumbs, Rating } from "@/components/ds";
import ProductCard from "@/components/product/ProductCard";
import ProductDetail from "@/components/product/ProductDetail";
import ProductRail from "@/components/product/ProductRail";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import ReviewsSection from "@/components/product/ReviewsSection";
import { RailSkeleton, ReviewsSkeleton } from "@/components/product/PdpSkeletons";
import { pdpCopy, reviewsCopy } from "@/components/product/pdp-copy";
import { initialColour, splitLines, splitParagraphs, type PdpImage } from "@/components/product/pdp-logic";

import {
  getActiveProductSlugs,
  getCompleteTheLook,
  getProductPage,
  getRelatedProducts,
  type ProductPageData,
} from "@/lib/dal/product-page";
import { getStoreSettings, type StoreSettings } from "@/lib/settings";
import type { Locale } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata, toMetaDescription } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { priceSummary } from "@/lib/seo/pricing";
import JsonLd from "@/lib/seo/JsonLd";
import { brand as storeBrand } from "@/lib/brand/config";

type Params = { params: Promise<{ slug: string }> };

/* ── Pre-rendering hints ─────────────────────────────────────── */

export async function generateStaticParams() {
  const slugs = await getActiveProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

/* ── Localised fields ────────────────────────────────────────── */

function localize(product: ProductPageData, locale: Locale) {
  const isAr = locale === "ar";
  const pick = (en: string | null, ar: string | null) => (isAr ? ar || en : en || ar);
  const name = pick(product.name_en, product.name_ar) ?? product.slug;
  const category = product.category;
  return {
    name,
    description: pick(product.description_en, product.description_ar),
    details: pick(product.details_en, product.details_ar),
    care: pick(product.care_en, product.care_ar),
    seoTitle: pick(product.seo_title_en, product.seo_title_ar),
    seoDescription: pick(product.seo_description_en, product.seo_description_ar),
    categoryName: category ? (isAr ? category.name_ar : category.name_en) : null,
    parentName: category?.parent ? (isAr ? category.parent.name_ar : category.parent.name_en) : null,
  };
}

function breadcrumbTrail(product: ProductPageData, locale: Locale) {
  const { name, categoryName, parentName } = localize(product, locale);
  const cat = product.category;
  return [
    { name: SEO_COPY[locale].home, path: "/" },
    ...(cat?.parent && parentName ? [{ name: parentName, path: `/category/${encodeURIComponent(cat.parent.slug)}` }] : []),
    ...(cat && categoryName ? [{ name: categoryName, path: `/category/${encodeURIComponent(cat.slug)}` }] : []),
    { name, path: `/product/${encodeURIComponent(product.slug)}` },
  ];
}

/* ── Metadata ────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([getProductPage(slug), getRequestLocale()]);
  // Thrown here too, so crawlers that wait for metadata get the 404 as well.
  if (!product) notFound();

  const { name, description, seoTitle, seoDescription } = localize(product, locale);
  const summary = priceSummary(product, product.variants);
  const image = product.images[0];

  return buildPageMetadata({
    locale,
    title: seoTitle || name,
    description:
      seoDescription || (description?.trim() ? description : SEO_COPY[locale].productDescription(name, formatPrice(summary.price, locale))),
    path: `/product/${encodeURIComponent(product.slug)}`,
    image: image ? { url: image.url, alt: (locale === "ar" ? image.alt_text_ar : image.alt_text_en) || name } : null,
    other: {
      "product:price:amount": summary.price.toFixed(2),
      "product:price:currency": "EGP",
      "product:availability": summary.inStock ? "in stock" : "out of stock",
      "product:condition": "new",
      ...(product.brand ? { "product:brand": product.brand } : {}),
    },
  });
}

/* ── Page ────────────────────────────────────────────────────── */

export default async function ProductPage({ params, searchParams }: Params & { searchParams: Promise<{ color?: string | string[] }> }) {
  const { slug } = await params;
  const [product, locale, settings, query] = await Promise.all([
    getProductPage(slug),
    getRequestLocale(),
    getStoreSettings(),
    searchParams,
  ]);
  // Before any Suspense boundary: a missing product is a real 404.
  if (!product) notFound();

  const copy = pdpCopy(locale);
  const isAr = locale === "ar";
  const text = localize(product, locale);
  const summary = priceSummary(product, product.variants);

  const images: PdpImage[] = product.images.map((img) => ({
    id: img.id,
    url: img.url,
    alt: (isAr ? img.alt_text_ar || img.alt_text_en : img.alt_text_en || img.alt_text_ar) || text.name,
    colour: img.color_en,
  }));
  const requested = typeof query.color === "string" ? query.color : null;
  const trail = breadcrumbTrail(product, locale);
  // The maker's name is worth showing only when it isn't the store's own brand.
  const ownNames = [storeBrand.name.en, storeBrand.name.ar].map((n) => n.toLowerCase());
  const maker = product.brand && !ownNames.includes(product.brand.trim().toLowerCase()) ? product.brand : null;

  const structuredData = [
    productJsonLd({
      product,
      variants: product.variants,
      locale,
      name: text.name,
      description: toMetaDescription(
        text.description ?? SEO_COPY[locale].productDescription(text.name, formatPrice(summary.price, locale)),
        5000,
      ),
      images: product.images.map((img) => img.url),
      categoryName: text.categoryName,
    }),
    breadcrumbJsonLd(trail),
  ];

  const intro = (
    <div className="flex flex-col gap-5">
      <Breadcrumbs items={trail.map((t, i) => ({ label: t.name, href: i < trail.length - 1 ? t.path : undefined }))} />
      <div className="flex flex-col gap-3">
        {maker || product.is_new ? (
          <p className="t-eyebrow flex flex-wrap gap-x-3">
            {maker ? <span>{maker}</span> : null}
            {product.is_new ? <span className="text-accent">{isAr ? "جديد" : "New"}</span> : null}
          </p>
        ) : null}
        <h1 className="t-h1 lg:text-[clamp(2rem,2.6vw,2.75rem)]!">{text.name}</h1>
        {product.review_count > 0 ? (
          <a href="#reviews" className="group inline-flex items-center gap-2 self-start text-[0.8125rem] text-text-secondary">
            <Rating value={product.rating} locale={locale} />
            <span className="underline decoration-border-hover underline-offset-4 group-hover:decoration-text-primary">
              {copy.reviewsCount(product.review_count)}
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );

  const info = <ProductAccordions text={text} settings={settings} locale={locale} />;

  return (
    <>
      <JsonLd data={structuredData} />

      <div className="container-x pb-16 lg:pt-8 lg:pb-24">
        <ProductDetail
          locale={locale}
          product={{
            id: product.id,
            slug: product.slug,
            name_en: product.name_en,
            name_ar: product.name_ar,
            base_price: product.base_price,
            sale_price: product.sale_price,
            sizeSystem: product.size_system,
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              color_en: v.color_en,
              color_ar: v.color_ar,
              color_hex: v.color_hex,
              stock: v.stock,
              price_override: v.price_override,
              position: v.position,
            })),
            images,
          }}
          initialColour={initialColour(product.variants, images, requested)}
          settings={{
            shipping: settings.shipping,
            cod: settings.payments.cod,
            returnDays: settings.policies.returnDays,
            lowStockThreshold: settings.inventory.lowStockThreshold,
          }}
          intro={intro}
          info={info}
        />
      </div>

      <Suspense fallback={null}>
        <CompleteTheLook productId={product.id} locale={locale} />
      </Suspense>

      <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-[calc(var(--header-height)+1rem)] border-t border-border">
        <div className="container-x py-14 md:py-20">
          <h2 id="reviews-title" className="t-h2 mb-8 md:mb-10">
            {reviewsCopy(locale).heading}
          </h2>
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewsSection productId={product.id} slug={product.slug} locale={locale} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<RailSkeleton />}>
        <RelatedRail product={product} locale={locale} />
      </Suspense>

      <RecentlyViewed
        locale={locale}
        current={{
          id: product.id,
          slug: product.slug,
          name_en: product.name_en,
          name_ar: product.name_ar,
          image: product.images[0]?.url ?? null,
          price: summary.price,
          compareAt: summary.compareAt,
          varies: summary.varies,
        }}
      />
      {/* End of the product content: the phone "Add to bag" bar hides from here on. */}
      <div id="pdp-end" aria-hidden="true" />
    </>
  );
}

/* ── Accordions (description, details, care, delivery & returns) ─ */

function ProductAccordions({
  text,
  settings,
  locale,
}: {
  text: ReturnType<typeof localize>;
  settings: StoreSettings;
  locale: Locale;
}) {
  const copy = pdpCopy(locale);
  const paragraphs = splitParagraphs(text.description);
  const details = splitLines(text.details);
  const care = splitLines(text.care);
  const { shipping } = settings;
  const fees = Object.values(shipping.zones).filter((f) => f > 0);
  const lowestFee = fees.length ? Math.min(...fees, shipping.defaultFee) : shipping.defaultFee;

  const list = (lines: string[]) => (
    <ul className="flex list-disc flex-col gap-1.5 ps-4 marker:text-text-faint">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );

  const items = [
    paragraphs.length
      ? {
          title: copy.description,
          open: true,
          content: (
            <div className="flex flex-col gap-3">
              {paragraphs.map((lines, i) => (
                <p key={i} className="whitespace-pre-line">
                  {lines.join("\n")}
                </p>
              ))}
            </div>
          ),
        }
      : null,
    details.length ? { title: copy.details, content: list(details) } : null,
    care.length ? { title: copy.care, content: list(care) } : null,
    {
      title: copy.deliveryReturns,
      content: (
        <div className="flex flex-col gap-3">
          <p>
            {copy.deliveryInfo(shipping.etaDays.min, shipping.etaDays.max)}{" "}
            {copy.deliveryFees(
              formatPrice(lowestFee, locale),
              shipping.freeThreshold > 0 ? formatPrice(shipping.freeThreshold, locale) : null,
            )}
          </p>
          {settings.payments.cod ? <p>{copy.codInfo}</p> : null}
          {settings.policies.returnDays > 0 ? <p>{copy.returnsInfo(settings.policies.returnDays)}</p> : null}
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/shipping" className="text-text-primary underline decoration-border-hover underline-offset-4 hover:decoration-text-primary">
              {copy.deliveryPage}
            </Link>
            <Link href="/refund-policy" className="text-text-primary underline decoration-border-hover underline-offset-4 hover:decoration-text-primary">
              {copy.returnsPage}
            </Link>
          </p>
        </div>
      ),
    },
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return <Accordion items={items} />;
}

/* ── Streamed rails ──────────────────────────────────────────── */

const RAIL_SIZES = "(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 23vw";

async function CompleteTheLook({ productId, locale }: { productId: string; locale: Locale }) {
  const look = await getCompleteTheLook(productId);
  if (!look) return null;
  const copy = pdpCopy(locale);
  return (
    <ProductRail
      id="complete-the-look-title"
      title={copy.completeTheLook}
      eyebrow={locale === "ar" ? look.title_ar : look.title_en}
      locale={locale}
      className="border-t border-border"
    >
      {look.products.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} sizes={RAIL_SIZES} />
      ))}
    </ProductRail>
  );
}

async function RelatedRail({ product, locale }: { product: ProductPageData; locale: Locale }) {
  const look = await getCompleteTheLook(product.id);
  const related = await getRelatedProducts(product, look?.products.map((p) => p.id) ?? []);
  if (related.length === 0) return null;
  const copy = pdpCopy(locale);
  const cat = product.category;
  return (
    <ProductRail
      id="related-title"
      title={copy.related}
      locale={locale}
      action={cat ? { href: `/category/${encodeURIComponent(cat.slug)}`, label: copy.viewAll } : undefined}
      className="border-t border-border"
    >
      {related.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} sizes={RAIL_SIZES} />
      ))}
    </ProductRail>
  );
}
