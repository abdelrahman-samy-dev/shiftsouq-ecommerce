/* ══════════════════════════════════════════════════════════════
   Product Details Page
   Route: /product/[slug]
   ──────────────────────────────────────────────────────────────
   Server component handling data fetching, 404 guards, and
   dynamic SEO metadata for individual products.

   Architecture:
   - `generateMetadata` provides dynamic title, description,
     and OpenGraph tags for SEO and social sharing.
   - Related products are fetched by `category_id` at the DB level
     (no client-side filtering of the full catalogue).
   - Client sub-components (ProductGallery, ProductInfo) receive
     only the data they need — no raw Supabase types leak to UI.
   ══════════════════════════════════════════════════════════════ */

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";

import { getProductBySlug, getProducts } from "@/lib/dal";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";

import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import { getPublicClient } from "@/lib/supabase/public";

/* ── Static Generation (SSG) ─────────────────────────────────── */

/**
 * Pre-renders all active product pages at build time.
 * Pages are revalidated on-demand when product data changes.
 */
export async function generateStaticParams() {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  return (data ?? []).map((product) => ({
    slug: product.slug,
  }));
}

/* ── Dynamic Metadata (SEO + OpenGraph + Twitter) ─────────── */

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://shiftsouq.com");

/**
 * Generates dynamic page metadata for SEO and social sharing.
 *
 * Includes:
 * - Localized title and description
 * - Full OpenGraph tags (product type, price, availability, images)
 * - Twitter card (summary_large_image)
 * - Canonical URL
 *
 * Uses `getProductBySlug` which is wrapped in `React.cache()`,
 * so this call and the page component share the same DB result
 * without duplicate queries.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: `Product Not Found | ${APP_NAME}`,
      description: "The requested product could not be found.",
    };
  }

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const isAr = locale === "ar";

  const name = isAr ? product.name_ar : product.name_en;
  const description = isAr
    ? product.description_ar ?? product.description_en
    : product.description_en ?? product.description_ar;

  const primaryImage = product.images?.[0]?.url;
  const productUrl = `${BASE_URL}/product/${slug}`;
  const displayPrice = product.sale_price ?? product.base_price;

  return {
    title: `${name} | ${APP_NAME}`,
    description: description?.slice(0, 160) ?? undefined,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: name,
      description: description?.slice(0, 160) ?? undefined,
      url: productUrl,
      siteName: APP_NAME,
      locale: isAr ? "ar_EG" : "en_US",
      type: "website",
      images: primaryImage
        ? [
            {
              url: primaryImage,
              width: 800,
              height: 800,
              alt: name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${APP_NAME}`,
      description: description?.slice(0, 160) ?? undefined,
      images: primaryImage ? [primaryImage] : undefined,
    },
    other: {
      "product:price:amount": String(displayPrice),
      "product:price:currency": "EGP",
      "product:availability": "in stock",
      ...(product.brand ? { "product:brand": product.brand } : {}),
    },
  };
}

/* ── Page Component ────────────────────────────────────────── */

/**
 * ProductPage — The Product Detail Page (PDP).
 *
 * Renders a two-column layout (gallery | info) with a related
 * products section below. All data is fetched server-side.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* Locale from cookie */
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const isAr = locale === "ar";

  /* Parallel data fetching — dict + product */
  const [product, dict] = await Promise.all([
    getProductBySlug(slug),
    getDictionary(locale),
  ]);

  /* 404 guard */
  if (!product) notFound();

  /* Localized helpers */
  const name = isAr ? product.name_ar : product.name_en;
  const categoryName = product.category
    ? isAr
      ? product.category.name_ar
      : product.category.name_en
    : null;

   /* Related products are loaded asynchronously via Suspense below */

  /* Safe cast: images & variants are always arrays from the DAL */
  const images = (product.images ?? []) as typeof product.images &
    {
      id: string;
      url: string;
      alt_text_en: string | null;
      alt_text_ar: string | null;
      is_primary: boolean;
      sort_order: number;
      created_at: string;
      product_id: string;
    }[];

  const variants = (product.variants ?? []) as typeof product.variants &
    {
      id: string;
      product_id: string;
      size: string | null;
      color_en: string | null;
      color_ar: string | null;
      color_hex: string | null;
      sku: string;
      stock: number;
      price_override: number | null;
      created_at: string;
    }[];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <nav
          className="flex items-center gap-1.5 text-sm mb-8 flex-wrap animate-fade-in"
          aria-label="Breadcrumb"
          style={{ color: "var(--text-muted)" }}
        >
          <Link
            href="/"
            className="hover:text-text-primary transition-colors"
          >
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight
            size={14}
            className="flex-shrink-0 rtl:rotate-180"
            style={{ color: "var(--border)" }}
            aria-hidden="true"
          />
          {categoryName && product.category && (
            <>
              <Link
                href={`/category/${product.category.slug}`}
                className="hover:text-text-primary transition-colors"
              >
                {categoryName}
              </Link>
              <ChevronRight
                size={14}
                className="flex-shrink-0 rtl:rotate-180"
                style={{ color: "var(--border)" }}
                aria-hidden="true"
              />
            </>
          )}
          <span
            className="max-w-[200px] truncate font-medium"
            style={{ color: "var(--text-primary)" }}
            aria-current="page"
          >
            {name}
          </span>
        </nav>

        {/* ── Main PDP Grid: Gallery | Info ─────────────────── */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16"
          aria-label={name}
        >
          {/* Left: Gallery */}
          <div className="animate-fade-in">
            <ProductGallery
              images={images}
              productName={name}
              locale={locale}
            />
          </div>

          {/* Right: Info */}
          <div className="animate-fade-in-up delay-100">
            <ProductInfo
              product={{
                id: product.id,
                name_en: product.name_en,
                name_ar: product.name_ar,
                description_en: product.description_en,
                description_ar: product.description_ar,
                base_price: product.base_price,
                sale_price: product.sale_price,
                brand: product.brand,
                rating: product.rating,
                review_count: product.review_count,
                total_orders: product.total_orders,
                is_new: product.is_new,
                slug: product.slug,
                category: product.category ?? null,
                images,
                variants,
              }}
              locale={locale}
              dict={
                dict as unknown as Record<string, Record<string, string>>
              }
            />
          </div>
        </section>

        {/* ── Related Products (Streamed via Suspense) ──────── */}
        <Suspense fallback={<RelatedProductsSkeleton />}>
          <RelatedProducts
            categoryId={product.category_id}
            currentProductId={product.id}
            categorySlug={product.category?.slug}
            locale={locale}
            dict={dict}
            isAr={isAr}
          />
        </Suspense>
      </div>
    </div>
  );
}

/* ── Related Products — Async Streaming Component ────────────── */

/**
 * Async server component that fetches related products.
 * Wrapped in <Suspense> so the main PDP renders immediately.
 */
async function RelatedProducts({
  categoryId,
  currentProductId,
  categorySlug,
  locale,
  dict,
  isAr,
}: {
  categoryId: string | null;
  currentProductId: string;
  categorySlug?: string;
  locale: Locale;
  dict: any;
  isAr: boolean;
}) {
  const relatedResult = await getProducts(
    categoryId ? { categoryIds: [categoryId] } : undefined,
    { page: 1, pageSize: 5 }
  );
  const relatedProducts = relatedResult.products
    .filter((p) => p.id !== currentProductId)
    .slice(0, 4);

  if (relatedProducts.length === 0) return null;

  return (
    <section
      className="animate-fade-in-up"
      aria-label={isAr ? "منتجات ذات صلة" : "Related products"}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className="section-title"
          style={{ color: "var(--text-primary)" }}
        >
          {dict.product?.relatedProducts ??
            (isAr ? "منتجات ذات صلة" : "Related products")}
        </h2>
        {categorySlug && (
          <Link
            href={`/category/${categorySlug}`}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-70"
            style={{ color: "var(--text-primary)" }}
          >
            {isAr ? "عرض المزيد" : "View more"}
            <ChevronRight
              size={16}
              className="rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {relatedProducts.map((p, index) => (
          <AnimatedProductCard key={p.id} index={index}>
            <ProductCard
              product={p}
              locale={locale}
              dict={dict as any}
            />
          </AnimatedProductCard>
        ))}
      </div>
    </section>
  );
}

/* ── Related Products Skeleton ───────────────────────────────── */

function RelatedProductsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-40 skeleton-block rounded-xl" />
        <div className="h-5 w-24 skeleton-block rounded-md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
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
    </div>
  );
}
