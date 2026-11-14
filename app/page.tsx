/* ══════════════════════════════════════════════════════════════
   Home — server component
   ──────────────────────────────────────────────────────────────
   Hero → category tiles → new arrivals rail → editorial split
   (first collection) → best sellers → values strip. The footer's
   newsletter closes the page. Content comes from the database
   (categories, products, collections) and store settings; every
   section hides itself when it has nothing to show.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import ProductCard from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ds";
import { Hero, type HeroContent } from "@/components/home/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { ProductRail } from "@/components/home/ProductRail";
import { EditorialSplit } from "@/components/home/EditorialSplit";
import { ValuesStrip, type ValueItem } from "@/components/home/ValuesStrip";
import { homeCopy } from "@/components/home/copy";
import { categoryHref, collectionHref, dayCount, NEW_IN_HREF, safeHref } from "@/components/layout/shell-rules";
import { getNavigation } from "@/lib/dal/navigation";
import { getBestSellers, getCollectionCover, getFeaturedCollection, getNewArrivals } from "@/lib/dal/home";
import { getStoreSettings } from "@/lib/settings";
import { brand, t } from "@/lib/brand/config";
import { formatPrice } from "@/lib/utils";
import { getRequestLocale } from "@/lib/seo/locale";
import { SEO_COPY } from "@/lib/seo/copy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/json-ld";
import JsonLd from "@/lib/seo/JsonLd";

/* ── Metadata (visitor's language) ─────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = SEO_COPY[locale];
  return buildPageMetadata({
    locale,
    fullTitle: copy.homeTitle,
    description: copy.homeDescription,
    path: "/",
  });
}

/** ProductCard `sizes` for the rail (≈2.2 / 3.25 / 4 cards across). */
const RAIL_SIZES = "(max-width: 767px) 45vw, (max-width: 1279px) 31vw, 24vw";
/** ProductCard `sizes` for the best-seller grid (2 / 3 / 4 columns). */
const GRID_SIZES = "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw";

export default async function Home() {
  const locale = await getRequestLocale();
  const isAr = locale === "ar";
  const copy = homeCopy(locale);
  const seo = SEO_COPY[locale];
  const pick = (v: { en: string; ar: string }) => (isAr ? v.ar || v.en : v.en || v.ar);

  const [settings, nav, newArrivals, collection] = await Promise.all([
    getStoreSettings(),
    getNavigation(),
    getNewArrivals(10),
    getFeaturedCollection(),
  ]);
  const [bestSellers, collectionCover] = await Promise.all([
    getBestSellers(8, newArrivals.map((p) => p.id)),
    collection && !collection.image ? getCollectionCover(collection.slug) : Promise.resolve(null),
  ]);

  /* ── Hero: settings first, then the brand line on a featured category photo ── */
  const featured = nav.categories.filter((c) => c.featured);
  const fallbackImage =
    featured.find((c) => c.image)?.image ??
    nav.categories.find((c) => c.image)?.image ??
    newArrivals.find((p) => p.primary_image)?.primary_image?.url ??
    null;
  const heroSettings = settings.home.hero;
  const hero: HeroContent = {
    image: heroSettings?.image || fallbackImage,
    imageAlt: "",
    title: (heroSettings && pick(heroSettings.title)) || t(brand.tagline, locale),
    srPrefix: seo.siteName,
    subtitle: heroSettings ? pick(heroSettings.subtitle) : t(brand.description, locale),
    cta: {
      label: (heroSettings && pick(heroSettings.ctaLabel)) || copy.shopNow,
      href: safeHref(heroSettings?.ctaHref) ?? "/shop",
    },
  };

  /* ── Category tiles: featured top-level categories, else all of them ── */
  const tileSource = featured.length >= 2 ? featured : nav.categories;
  const tileCount = tileSource.length >= 8 ? 8 : tileSource.length >= 4 ? 4 : tileSource.length;
  const tiles = tileSource.slice(0, tileCount).map((c) => ({ href: categoryHref(c.slug), name: pick(c.name), image: c.image }));

  /* ── Values strip: numbers from settings ── */
  const { shipping, payments, policies } = settings;
  const values: ValueItem[] = [
    {
      icon: "truck",
      title:
        shipping.freeThreshold > 0
          ? copy.freeDelivery(formatPrice(shipping.freeThreshold, locale))
          : copy.delivery,
      body:
        shipping.etaDays.max > 0
          ? copy.deliveryEta(shipping.etaDays.min, shipping.etaDays.max)
          : copy.deliveryFrom(formatPrice(Math.min(shipping.defaultFee, ...Object.values(shipping.zones)), locale)),
    },
    payments.cod
      ? { icon: "cash", title: copy.cod, body: copy.codBody }
      : { icon: "card", title: copy.securePay, body: copy.securePayBody },
    ...(policies.returnDays > 0
      ? [{ icon: "returns" as const, title: copy.returns(dayCount(policies.returnDays, locale)), body: copy.returnsBody }]
      : []),
  ];

  return (
    <>
      <JsonLd data={[organizationJsonLd(locale), webSiteJsonLd(locale)]} />

      <Hero content={hero} />

      <CategoryTiles tiles={tiles} eyebrow={copy.categoriesEyebrow} title={copy.categoriesTitle} cta={copy.shopCategory} />

      {newArrivals.length ? (
        <ProductRail
          id="home-new"
          eyebrow={copy.newEyebrow}
          title={copy.newTitle}
          action={{ href: NEW_IN_HREF, label: copy.newAction }}
          labels={{ prev: copy.prev, next: copy.next }}
        >
          {newArrivals.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale} sizes={RAIL_SIZES} />
            </li>
          ))}
        </ProductRail>
      ) : null}

      {collection ? (
        <EditorialSplit
          content={{
            href: collectionHref(collection.slug),
            eyebrow: copy.collectionEyebrow,
            title: pick(collection.title),
            body: pick(collection.description),
            meta: collection.productCount ? copy.pieces(collection.productCount) : undefined,
            cta: copy.collectionCta,
            image: collection.image ?? collectionCover,
          }}
        />
      ) : null}

      {bestSellers.length ? (
        <section aria-labelledby="home-best" className="py-16 md:py-24">
          <div className="container-x">
            <SectionHeader
              eyebrow={copy.bestEyebrow}
              title={<span id="home-best">{copy.bestTitle}</span>}
              action={{ href: "/shop?sort=popular", label: copy.bestAction }}
            />
            <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-4 xl:grid-cols-4 xl:gap-x-5 max-xl:[&>li:nth-child(n+7)]:hidden">
              {bestSellers.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} sizes={GRID_SIZES} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <ValuesStrip items={values} label={copy.valuesTitle} />
    </>
  );
}
