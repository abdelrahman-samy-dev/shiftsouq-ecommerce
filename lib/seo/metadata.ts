/* ══════════════════════════════════════════════════════════════
   Page metadata builder
   ──────────────────────────────────────────────────────────────
   Produces title, description, canonical URL, OpenGraph and
   Twitter tags in the visitor's language. Titles are absolute so
   Arabic pages end with the Arabic store name instead of the
   English root-layout template.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { SEO_COPY } from "./copy";
import { SITE_URL, absoluteUrl } from "./site";

/** Default share image (public/og-image.png, 1200×630, brand mark + tagline). */
export const DEFAULT_OG_IMAGE = {
  url: absoluteUrl("/og-image.png"),
  width: 1200,
  height: 630,
};

export interface PageMetadataInput {
  locale: Locale;
  /** Page title without the store name; omit for the home page. */
  title?: string;
  /** Full title used as-is (home page). */
  fullTitle?: string;
  description: string;
  /** Site path of the canonical URL, e.g. "/shop?page=2". */
  path: string;
  image?: { url: string; alt?: string; width?: number; height?: number } | null;
  /** Keep the page out of the index but let crawlers follow its links. */
  noindex?: boolean;
  other?: Metadata["other"];
}

/** Collapses whitespace and keeps a description short enough for result snippets. */
export function toMetaDescription(text: string | null | undefined, max = 160): string {
  return truncate((text ?? "").replace(/\s+/g, " ").trim(), max);
}

export function ogLocale(locale: Locale): string {
  return locale === "ar" ? "ar_EG" : "en_US";
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const copy = SEO_COPY[input.locale];
  const title = input.fullTitle ?? `${input.title} | ${copy.siteName}`;
  const description = toMetaDescription(input.description);
  const url = absoluteUrl(input.path);
  const image = input.image
    ? { ...input.image, url: absoluteUrl(input.image.url), alt: input.image.alt ?? title }
    : { ...DEFAULT_OG_IMAGE, alt: `${copy.siteName} — ${copy.tagline}` };

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: copy.siteName,
      title,
      description,
      locale: ogLocale(input.locale),
      alternateLocale: [ogLocale(input.locale === "ar" ? "en" : "ar")],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
    ...(input.other ? { other: input.other } : {}),
  };
}
