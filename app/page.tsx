import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/dal";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import { HeroSlider } from "@/components/home/HeroSlider";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PromoBanners } from "@/components/home/PromoBanners";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/types";
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

/** Home grids: two columns below lg, four columns of a 1280px container above. */
const HOME_CARD_SIZES = "(max-width: 1023px) 50vw, 300px";

/* ── Home Page (Server Component) ──────────────────────────── */

export default async function Home() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const copy = SEO_COPY[locale];

  return (
    <>
      <JsonLd data={[organizationJsonLd(locale), webSiteJsonLd(locale)]} />

      {/* The page's main heading: store name + what it sells (hero slides use h2). */}
      <h1 className="sr-only">
        {copy.siteName} — {copy.tagline}
      </h1>

      {/* ── Hero Section ───────────────────────────────────── */}
      <HeroSlider dict={dict} locale={locale} />

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-10 sm:gap-16">
        {/* ── Shop by Category ─────────────────────────────── */}
        <section>
          <SectionHeader
            title={dict.home?.shopByCategory || "Shop by Category"}
            href="/shop"
            viewMoreText={dict.home?.viewMore || "View more"}
            locale={locale}
          />
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoriesSection dict={dict} locale={locale} />
          </Suspense>
        </section>

        {/* ── Section 1: New Arrivals ──────────────────────── */}
        <section>
          <SectionHeader
            title={dict.home?.newArrivals || "New Arrivals"}
            href="/shop?isNew=true"
            viewMoreText={dict.home?.viewMore || "View more"}
            locale={locale}
          />
          <Suspense fallback={<ProductsSkeleton count={8} />}>
            <NewArrivalsSection dict={dict} locale={locale} />
          </Suspense>
        </section>

        {/* ── Section 2: Featured Sneakers ─────────────────── */}
        <section>
          <SectionHeader
            title={dict.home?.featuredSneakers || "Featured Sneakers"}
            href="/category/sneakers"
            viewMoreText={dict.home?.viewMore || "View more"}
            locale={locale}
          />
          <Suspense fallback={<ProductsSkeleton count={4} />}>
            <FeaturedSneakersSection dict={dict} locale={locale} />
          </Suspense>
        </section>

        {/* ── Section 3: Premium Collections ───────────────── */}
        <Suspense fallback={<section><ProductsSkeleton count={4} /></section>}>
          <PremiumCollectionsSection dict={dict} locale={locale} />
        </Suspense>

        {/* ── Section 4: Promo Banners ─────────────────────── */}
        <section className="pb-16">
          <PromoBanners dict={dict} locale={locale} />
        </section>
      </div>
    </>
  );
}

/* ── Async Server Components ───────────────────────────────── */

interface SectionProps {
  dict: Dictionary;
  locale: Locale;
}

async function CategoriesSection({ dict, locale }: SectionProps) {
  const categories = await getCategories();

  if (!categories.length) return null;

  return <CategoryGrid categories={categories} dict={dict} locale={locale} />;
}

async function NewArrivalsSection({ dict, locale }: SectionProps) {
  const { products } = await getProducts({ isNew: true }, { page: 1, pageSize: 8 });

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {products.map((product, index) => (
        <AnimatedProductCard key={product.id} index={index}>
          <ProductCard product={product} dict={dict} locale={locale} sizes={HOME_CARD_SIZES} />
        </AnimatedProductCard>
      ))}
    </div>
  );
}

async function FeaturedSneakersSection({ dict, locale }: SectionProps) {
  const { products } = await getProducts({ isFeatured: true, categorySlug: "sneakers" }, { page: 1, pageSize: 4 });

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {products.map((product, index) => (
        <AnimatedProductCard key={product.id} index={index}>
          <ProductCard product={product} dict={dict} locale={locale} sizes={HOME_CARD_SIZES} />
        </AnimatedProductCard>
      ))}
    </div>
  );
}

async function PremiumCollectionsSection({ dict, locale }: SectionProps) {
  const { products } = await getProducts({ categorySlug: "collections" }, { page: 1, pageSize: 4 });

  if (!products.length) return null;

  return (
    <section>
      <SectionHeader
        title={dict.home?.premiumCollections || "Premium Collections"}
        href="/category/collections"
        viewMoreText={dict.home?.viewMore || "View more"}
        locale={locale}
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {products.map((product, index) => (
          <AnimatedProductCard key={product.id} index={index}>
            <ProductCard product={product} dict={dict} locale={locale} sizes={HOME_CARD_SIZES} />
          </AnimatedProductCard>
        ))}
      </div>
    </section>
  );
}

/* ── Skeleton Loaders ──────────────────────────────────────── */

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block h-48 sm:h-64 md:h-72 w-full rounded-xl sm:rounded-2xl"
        />
      ))}
    </div>
  );
}

function ProductsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-elevated flex flex-col">
          <div className="aspect-[4/5] skeleton-block rounded-none" />
          <div className="p-4 flex flex-col flex-grow gap-3">
            <div className="h-5 w-20 skeleton-block rounded" />
            <div className="h-4 w-full skeleton-block rounded" />
            <div className="h-4 w-2/3 skeleton-block rounded" />
            <div className="mt-auto pt-2 flex gap-2">
              <div className="w-11 h-11 skeleton-block rounded-xl" />
              <div className="flex-1 h-11 skeleton-block rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
