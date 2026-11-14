/* ══════════════════════════════════════════════════════════════
   JSON-LD builders (schema.org)
   ──────────────────────────────────────────────────────────────
   Product, BreadcrumbList, Organization and WebSite. Offers use
   the same pricing rule as checkout (see ./pricing).
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";
import { SEO_COPY } from "./copy";
import { SITE_URL, absoluteUrl } from "./site";
import { unitPrice, variantInStock, type PricedProduct, type PricedVariant } from "./pricing";

const CURRENCY = "EGP";
const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";
const NEW_CONDITION = "https://schema.org/NewCondition";

type JsonLdObject = Record<string, unknown>;

/** Serialises JSON-LD for a <script> tag; `<` is escaped so data can't close the tag. */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org prices are plain decimals with at most two places. */
function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

/* ── Breadcrumbs ─────────────────────────────────────────────── */

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/* ── Organization + WebSite (home page) ─────────────────────── */

export function organizationJsonLd(locale: Locale): JsonLdObject {
  const copy = SEO_COPY[locale];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SEO_COPY.en.siteName,
    alternateName: SEO_COPY.ar.siteName,
    url: `${SITE_URL}/`,
    logo: absoluteUrl("/apple-icon"),
    description: copy.homeDescription,
    areaServed: { "@type": "Country", name: "Egypt" },
  };
}

export function webSiteJsonLd(locale: Locale): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SEO_COPY.en.siteName,
    alternateName: SEO_COPY.ar.siteName,
    url: `${SITE_URL}/`,
    inLanguage: locale === "ar" ? "ar-EG" : "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/* ── Product ─────────────────────────────────────────────────── */

export interface ProductJsonLdInput {
  product: PricedProduct & {
    slug: string;
    brand: string | null;
    rating?: number | null;
    review_count?: number | null;
  };
  variants: (PricedVariant & {
    sku: string;
    size: string | null;
    color_en: string | null;
    color_ar: string | null;
  })[];
  locale: Locale;
  name: string;
  description: string;
  images: string[];
  categoryName: string | null;
}

export function productJsonLd(input: ProductJsonLdInput): JsonLdObject {
  const { product, variants, locale, name } = input;
  const url = absoluteUrl(`/product/${product.slug}`);
  const isAr = locale === "ar";

  const offerFor = (variant: (typeof variants)[number] | null): JsonLdObject => ({
    "@type": "Offer",
    url,
    priceCurrency: CURRENCY,
    price: money(unitPrice(product, variant)),
    availability: variant && variantInStock(variant) ? IN_STOCK : OUT_OF_STOCK,
    itemCondition: NEW_CONDITION,
    seller: { "@id": `${SITE_URL}/#organization` },
    ...(variant
      ? {
          sku: variant.sku,
          name: [variant.size, isAr ? variant.color_ar ?? variant.color_en : variant.color_en]
            .filter(Boolean)
            .join(" / ") || undefined,
        }
      : {}),
  });

  let offers: JsonLdObject;
  if (variants.length <= 1) {
    offers = offerFor(variants[0] ?? null);
  } else {
    const prices = variants.map((v) => unitPrice(product, v));
    offers = {
      "@type": "AggregateOffer",
      url,
      priceCurrency: CURRENCY,
      lowPrice: money(Math.min(...prices)),
      highPrice: money(Math.max(...prices)),
      offerCount: variants.length,
      availability: variants.some(variantInStock) ? IN_STOCK : OUT_OF_STOCK,
      offers: variants.map((v) => offerFor(v)),
    };
  }

  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    name,
    description: input.description,
    image: input.images.map((src) => absoluteUrl(src)),
    sku: variants.length === 1 ? variants[0].sku : product.slug.toUpperCase(),
    offers,
  };

  if (product.brand) data.brand = { "@type": "Brand", name: product.brand };
  if (input.categoryName) data.category = input.categoryName;
  if (product.review_count && product.review_count > 0 && product.rating) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(product.rating).toFixed(1),
      reviewCount: product.review_count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return data;
}
