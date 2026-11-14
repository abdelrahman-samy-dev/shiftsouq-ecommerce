"use client";

/* ══════════════════════════════════════════════════════════════
   ProductCard — Product Listing Card (Client Component)
   ──────────────────────────────────────────────────────────────
   Reusable card component for product grids. Displays the
   primary image, price, name, and action buttons (wishlist, cart).

   Now a client component to integrate with Zustand stores for
   real-time wishlist toggle and add-to-cart functionality.

   Used across: homepage sections, shop page, category page,
   wishlist page, and related products sections.

   Performance:
   - `sizes` comes from the grid that renders the card, so phones
     download a half-width image for a two-column grid.

   Pricing: the card shows what checkout charges (variant price
   override, then a valid sale price, then the base price) via
   lib/seo/pricing. A product with a single option is added
   straight to the cart; one with several options opens its page.
   ══════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductWithDetails, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { priceSummary, unitPrice } from "@/lib/seo/pricing";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { useHydrated } from "./use-hydrated";

/* ── Types ───────────────────────────────────────────────────── */

/** Variant fields a card can use; stock/price come from listing queries. */
type CardVariant = Pick<ProductVariant, "id" | "size" | "color_en"> &
  Partial<Pick<ProductVariant, "color_ar" | "color_hex" | "stock" | "price_override">>;

type CardProduct = Omit<ProductWithDetails, "variants"> & { variants?: CardVariant[] };

/** The dictionary keys the card reads (any app dictionary fits). */
type CardDict = {
  products?: Partial<Record<"new" | "sale" | "addToCart" | "addToWishlist", string>>;
};

/** Default `sizes`: two columns on phones/tablets, four on desktop. */
const DEFAULT_SIZES = "(max-width: 1023px) 50vw, 300px";

interface ProductCardProps {
  /** The product data including primary image and category. */
  product: CardProduct;
  /** Current display locale. */
  locale: string;
  /** Localised UI strings dictionary. */
  dict: CardDict;
  /** Image `sizes` matching the grid the card is rendered in. */
  sizes?: string;
}

/* ── Component ───────────────────────────────────────────────── */

/**
 * ProductCard renders a single product tile for listing grids.
 *
 * Features:
 * - Sale/New badges overlaid on the image
 * - Responsive image sizing with Next.js Image
 * - Hover zoom effect on the product image
 * - Localized price formatting with discount display
 * - Zustand-powered wishlist toggle with scale animation
 * - Quick add-to-cart with feedback animation
 * - Accessible action buttons with aria-labels
 *
 * @param product - Product data with relations.
 * @param locale  - Current locale for formatting.
 * @param dict    - Localised UI strings.
 */
export default function ProductCard({
  product,
  locale,
  dict,
  sizes = DEFAULT_SIZES,
}: ProductCardProps) {
  const isAr = locale === "ar";

  /* ── Store integration (reactive selectors) ──────────────── */
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const wishlistIds = useWishlistStore((s) => s.productIds);
  const addItem = useCartStore((s) => s.addItem);

  const hydrated = useHydrated();
  const [addedToCart, setAddedToCart] = useState(false);
  const router = useRouter();

  /* ── Variants, stock and price (same rule as checkout) ─── */
  const variants = product.variants ?? [];
  // Listing queries include stock; other sources may not — then don't claim "out of stock".
  const stockKnown = variants.every((v) => typeof v.stock === "number");
  const summary = priceSummary(
    product,
    stockKnown ? variants : variants.map((v) => ({ ...v, stock: 1 }))
  );
  const singleVariant = variants.length === 1 ? variants[0] : null;
  const hasChoices = variants.length > 1;
  const soldOut = !summary.purchasable || !summary.inStock;

  /* Derive wishlisted from the reactive productIds array */
  const wishlisted = hydrated ? wishlistIds.includes(product.id) : false;

  /* ── Wishlist toggle handler ────────────────────────────── */
  const handleWishlistToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(product.id);
    },
    [toggleWishlist, product.id]
  );

  /* ── Quick add to cart ─────────────────────────────────── */
  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (soldOut) return;

      if (hasChoices || !singleVariant) {
        toast(
          isAr
            ? "برجاء تحديد الخيارات أولاً"
            : "Please select product options (size/color) to continue.",
          {
            description: isAr
              ? "سيتم توجيهك لصفحة المنتج"
              : "Redirecting to product details...",
            duration: 3000,
          }
        );
        router.push(`/product/${product.slug}`);
        return;
      }

      // Single option: add that exact variant at the price checkout will charge.
      addItem({
        productId: product.id,
        variantId: singleVariant.id,
        name_en: product.name_en,
        name_ar: product.name_ar,
        slug: product.slug,
        image: product.primary_image?.url || "",
        size: singleVariant.size || null,
        color_en: singleVariant.color_en || null,
        color_ar: singleVariant.color_ar || null,
        color_hex: singleVariant.color_hex || null,
        price: unitPrice(product, singleVariant),
        quantity: 1,
      });

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1500);
    },
    [addItem, product, soldOut, hasChoices, singleVariant, isAr, router]
  );

  /* ── Price display ──────────────────────────────────────── */
  const hasSale = summary.compareAt !== null;
  const discountPercent = summary.discountPercent;
  const formattedPrice = formatPrice(summary.price, locale as Locale);
  const formattedBasePrice = hasSale
    ? formatPrice(summary.compareAt!, locale as Locale)
    : null;
  const fromLabel = summary.varies ? (isAr ? "يبدأ من" : "From") : null;
  const addLabel = soldOut
    ? isAr
      ? "نفد من المخزون"
      : "Out of stock"
    : hasChoices
      ? isAr
        ? "اختر الخيارات"
        : "Choose options"
      : dict?.products?.addToCart || "Add to cart";

  /* ── Localised text ─────────────────────────────────────── */
  const productName = isAr ? product.name_ar : product.name_en;
  const imageAlt = product.primary_image
    ? isAr
      ? product.primary_image.alt_text_ar || productName
      : product.primary_image.alt_text_en || productName
    : productName;

  return (
    <article className="group card-elevated card-hover flex flex-col h-full w-full">
      {/* ── Image Container ────────────────────────────── */}
      <div className="relative aspect-[4/5] bg-surface dark:bg-surface-inset overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 start-3 z-10 flex flex-col gap-2">
          {product.is_new && (
            <span className="badge badge-new">
              {dict?.products?.new || "New"}
            </span>
          )}
          {hasSale && (
            <span className="badge badge-sale">
              {dict?.products?.sale || "Sale"} {discountPercent}%
            </span>
          )}
          {soldOut && (
            <span className="badge badge-sale">
              {isAr ? "نفد من المخزون" : "Out of stock"}
            </span>
          )}
        </div>

        {/* Link wrapping image */}
        <Link
          href={`/product/${product.slug}`}
          className="block relative w-full h-full"
          aria-label={`${isAr ? "عرض" : "View"} ${productName}`}
        >
          {product.primary_image ? (
            <div className="absolute inset-0 w-full h-full">
              <Image
                src={product.primary_image.url}
                alt={imageAlt}
                fill
                className="object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
                sizes={sizes}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-faint">
              {isAr ? "لا توجد صورة" : "No Image"}
            </div>
          )}
        </Link>
      </div>

      {/* ── Content & Actions ──────────────────────────── */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* Price */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {fromLabel && (
            <span className="text-xs text-text-muted">{fromLabel}</span>
          )}
          <span className="font-bold text-base sm:text-lg text-text-primary">
            {formattedPrice}
          </span>
          {hasSale && (
            <span className="text-sm text-text-muted line-through">
              <span className="sr-only">{isAr ? "السعر قبل الخصم:" : "Was"} </span>
              {formattedBasePrice}
            </span>
          )}
        </div>

        {/* Title */}
        <Link
          href={`/product/${product.slug}`}
          className="block group/link mb-4"
        >
          <h3 className="text-text-secondary text-xs sm:text-sm line-clamp-2 min-h-[32px] sm:min-h-[40px] group-hover/link:text-text-primary transition-colors">
            {productName}
          </h3>
        </Link>

        {/* Actions Row (Pushed to bottom via mt-auto) */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          {/* Wishlist Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={handleWishlistToggle}
            className="btn-icon flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            style={{
              borderColor: wishlisted ? "var(--destructive)" : undefined,
              color: wishlisted ? "var(--destructive)" : "var(--text-secondary)",
              background: wishlisted ? "var(--destructive-bg)" : undefined,
            }}
            aria-label={`${dict?.products?.addToWishlist || "Add to wishlist"}: ${productName}`}
            aria-pressed={wishlisted}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={wishlisted ? "filled" : "empty"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Heart
                  size={20}
                  strokeWidth={1.5}
                  fill={wishlisted ? "currentColor" : "none"}
                />
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Add to Cart Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            disabled={soldOut}
            className={`flex-1 h-9 sm:h-11 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              addedToCart ? "btn-secondary" : "btn-primary"
            }`}
            title={addLabel}
            aria-label={`${addLabel}: ${productName}`}
          >
            <AnimatePresence mode="wait">
              {addedToCart ? (
                <motion.span
                  key="added"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={18} strokeWidth={2.5} className="text-success" />
                  <span className="text-success font-semibold">
                    {isAr ? "تمت الإضافة" : "Added!"}
                  </span>
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingCart size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{addLabel}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </article>
  );
}
