import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCategories, getProducts } from "@/lib/dal";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import { HeroSlider } from "@/components/home/HeroSlider";
import { SectionHeader } from "@/components/home/SectionHeader";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PromoBanners } from "@/components/home/PromoBanners";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";

/* ── Home Page (Server Component) ──────────────────────────── */

export default async function Home() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <>
      {/* ── Hero Section ───────────────────────────────────── */}
      <HeroSlider dict={dict} locale={locale} />

      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-10 sm:gap-16">
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
      </main>
    </>
  );
}

/* ── Async Server Components ───────────────────────────────── */

async function CategoriesSection({ dict, locale }: { dict: any; locale: string }) {
  const categories = await getCategories();

  if (!categories.length) return null;

  return <CategoryGrid categories={categories} dict={dict} locale={locale} />;
}

async function NewArrivalsSection({ dict, locale }: { dict: any; locale: string }) {
  const { products } = await getProducts({ isNew: true }, { page: 1, pageSize: 8 });

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {products.map((product, index) => (
        <AnimatedProductCard key={product.id} index={index}>
          <ProductCard product={product} dict={dict} locale={locale} />
        </AnimatedProductCard>
      ))}
    </div>
  );
}

async function FeaturedSneakersSection({ dict, locale }: { dict: any; locale: string }) {
  // Using search for "sneakers" or categorySlug if configured properly
  const { products } = await getProducts({ isFeatured: true, categorySlug: "sneakers" }, { page: 1, pageSize: 4 });

  if (!products.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {products.map((product, index) => (
        <AnimatedProductCard key={product.id} index={index}>
          <ProductCard product={product} dict={dict} locale={locale} />
        </AnimatedProductCard>
      ))}
    </div>
  );
}

async function PremiumCollectionsSection({ dict, locale }: { dict: any; locale: string }) {
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
            <ProductCard product={product} dict={dict} locale={locale} />
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
          className="skeleton-block h-64 sm:h-72 w-full rounded-2xl" 
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
