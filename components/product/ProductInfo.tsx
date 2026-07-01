"use client";

/* ══════════════════════════════════════════════════════════════
   ProductInfo — Product Detail Panel
   ──────────────────────────────────────────────────────────────
   Complete product info panel for the PDP: brand, title, rating,
   price, color/size variant selectors, description, and CTA.

   SRP Refactoring: Sub-components are extracted into focused,
   single-responsibility units (StarRating, PriceDisplay,
   ColorSelector, SizeSelector, QuantitySelector, StockStatus).

   Supports LTR/RTL and Dark Mode via CSS custom properties.
   ══════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Heart, Star, CheckCircle, X, Check } from "lucide-react";
import type { ProductVariant, ProductImage } from "@/lib/types";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";

/* ── Types ───────────────────────────────────────────────────── */

/** Shape of the product object this component expects. */
interface ProductInfoProduct {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  base_price: number;
  sale_price: number | null;
  brand: string | null;
  rating: number;
  review_count: number;
  total_orders: number;
  is_new: boolean;
  slug: string;
  category: { name_en: string; name_ar: string; slug: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

interface ProductInfoProps {
  product: ProductInfoProduct;
  locale: Locale;
  dict: Record<string, Record<string, string>>;
}

/* ── Sub-Components (SRP) ────────────────────────────────────── */

/**
 * Renders a star rating display with partial-fill support.
 * Purely presentational — no interactive behavior.
 */
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Rating: ${rating} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;
        return (
          <span key={i} className="relative inline-flex">
            <Star
              size={15}
              className="text-border"
              fill="currentColor"
              strokeWidth={0}
            />
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{
                  width: filled ? "100%" : `${(rating % 1) * 100}%`,
                }}
              >
                <Star
                  size={15}
                  className="text-warning"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Displays the product price with optional sale styling.
 * Shows original price, sale price, discount badge, and shipping teaser.
 */
function PriceDisplay({
  basePrice,
  salePrice,
  locale,
  dict,
}: {
  basePrice: number;
  salePrice: number | null;
  locale: Locale;
  dict: Record<string, Record<string, string>>;
}) {
  const isAr = locale === "ar";
  const hasSale = salePrice !== null && salePrice < basePrice;
  const displayPrice = hasSale ? salePrice! : basePrice;
  const discountPct = hasSale
    ? getDiscountPercentage(basePrice, salePrice!)
    : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {formatPrice(displayPrice, locale)}
        </span>
        {hasSale && (
          <span
            className="text-lg line-through"
            style={{ color: "var(--text-faint)" }}
          >
            {formatPrice(basePrice, locale)}
          </span>
        )}
        {hasSale && (
          <span
            className="text-sm font-semibold px-2 py-0.5 rounded-lg"
            style={{
              background: "var(--destructive-bg)",
              color: "var(--destructive)",
              border: "1px solid var(--destructive-border)",
            }}
          >
            {dict?.common?.save ?? "Save"} {discountPct}%
          </span>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--success)" }}>
        ✓{" "}
        {isAr
          ? "شحن مجاني للطلبات فوق 500 ج.م"
          : "Free shipping on orders over EGP 500"}
      </p>
    </div>
  );
}

/**
 * Color swatch selector with visual ring indicator.
 * Each swatch is a circular button with the color as background.
 */
function ColorSelector({
  colors,
  selectedColor,
  onSelect,
  locale,
}: {
  colors: ProductVariant[];
  selectedColor: string | null;
  onSelect: (hex: string | null) => void;
  locale: Locale;
}) {
  const isAr = locale === "ar";

  const selectedColorName = useMemo(() => {
    if (!selectedColor) return null;
    const variant = colors.find((v) => v.color_hex === selectedColor);
    return variant ? (isAr ? variant.color_ar : variant.color_en) : null;
  }, [selectedColor, colors, isAr]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {isAr ? "اللون" : "Color"}
        </span>
        {selectedColorName && (
          <span
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            — {selectedColorName}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-2.5 flex-wrap"
        role="radiogroup"
        aria-label={isAr ? "اختيار اللون" : "Color selection"}
      >
        {colors.map((v) => {
          const isSelected = selectedColor === v.color_hex;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() =>
                onSelect(isSelected ? null : v.color_hex!)
              }
              title={isAr ? v.color_ar ?? "" : v.color_en ?? ""}
              aria-label={`Color: ${isAr ? v.color_ar : v.color_en}`}
              aria-pressed={isSelected}
              className="relative w-9 h-9 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              style={{
                backgroundColor: v.color_hex ?? "#ccc",
                boxShadow: isSelected
                  ? `0 0 0 2px var(--background), 0 0 0 4px var(--primary)`
                  : "0 0 0 1.5px var(--border)",
                transform: isSelected ? "scale(1.15)" : "scale(1)",
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Size Guide Chart Data ──────────────────────────────────── */

const CLOTHING_SIZE_CHART = [
  { size: "S", chest: "86–91 cm", waist: "71–76 cm", hip: "86–91 cm" },
  { size: "M", chest: "96–101 cm", waist: "81–86 cm", hip: "96–101 cm" },
  { size: "L", chest: "106–111 cm", waist: "91–96 cm", hip: "106–111 cm" },
  { size: "XL", chest: "116–121 cm", waist: "101–106 cm", hip: "116–121 cm" },
];

const SHOE_SIZE_CHART = [
  { eu: "40", us: "7", uk: "6", cm: "25.0" },
  { eu: "41", us: "8", uk: "7", cm: "25.5" },
  { eu: "42", us: "9", uk: "8", cm: "26.5" },
  { eu: "43", us: "10", uk: "9", cm: "27.5" },
  { eu: "44", us: "11", uk: "10", cm: "28.5" },
];

/**
 * SizeGuideModal — Displays a category-specific size chart.
 * Shows clothing measurements for 'men', shoe conversions for 'sneakers'.
 */
function SizeGuideModal({
  isOpen,
  onClose,
  categorySlug,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  categorySlug: string;
  locale: Locale;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isAr = locale === "ar";
  if (!isOpen || !mounted) return null;

  const isSneakers = categorySlug === "sneakers";
  const title = isSneakers
    ? isAr ? "دليل مقاسات الأحذية" : "Shoe Size Guide"
    : isAr ? "دليل مقاسات الملابس" : "Clothing Size Guide";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 animate-fade-in-up"
        style={{
          background: "var(--background)",
          borderColor: "var(--border)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
            aria-label={isAr ? "إغلاق" : "Close"}
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
          {isSneakers ? (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-elevated)" }}>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>EU</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>US</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>UK</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>CM</th>
                </tr>
              </thead>
              <tbody>
                {SHOE_SIZE_CHART.map((row) => (
                  <tr key={row.eu} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2.5 font-medium text-start" style={{ color: "var(--text-primary)" }}>{row.eu}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.us}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.uk}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-elevated)" }}>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>{isAr ? "المقاس" : "Size"}</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>{isAr ? "الصدر" : "Chest"}</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>{isAr ? "الخصر" : "Waist"}</th>
                  <th className="px-4 py-3 text-start font-semibold" style={{ color: "var(--text-primary)" }}>{isAr ? "الورك" : "Hip"}</th>
                </tr>
              </thead>
              <tbody>
                {CLOTHING_SIZE_CHART.map((row) => (
                  <tr key={row.size} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2.5 font-medium text-start" style={{ color: "var(--text-primary)" }}>{row.size}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.chest}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.waist}</td>
                    <td className="px-4 py-2.5 text-start" style={{ color: "var(--text-secondary)" }}>{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs mt-4" style={{ color: "var(--text-faint)" }}>
          {isAr
            ? "* القياسات تقريبية وقد تختلف حسب التصميم."
            : "* Measurements are approximate and may vary by style."}
        </p>
      </div>
    </div>,
    document.body
  );
}

/**
 * Size pill selector — renders a row of toggleable size buttons
 * with a dynamic "Size guide" link that opens the category-aware modal.
 */
function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
  locale,
  dict,
  categorySlug,
  onOpenSizeGuide,
}: {
  sizes: ProductVariant[];
  selectedSize: string | null;
  onSelect: (size: string | null) => void;
  locale: Locale;
  dict: Record<string, Record<string, string>>;
  categorySlug: string;
  onOpenSizeGuide: () => void;
}) {
  const isAr = locale === "ar";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {isAr ? "المقاس" : "Size guide"}
        </span>
        <button
          type="button"
          onClick={onOpenSizeGuide}
          className="text-sm underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label={isAr ? "دليل المقاسات" : "Size guide"}
        >
          {isAr ? "دليل المقاسات" : "Size guide"} ↗
        </button>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={isAr ? "اختيار المقاس" : "Size selection"}
      >
        {sizes.map((v) => {
          const isSelected = selectedSize === v.size;
          const isOos = v.stock === 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : v.size!)}
              aria-pressed={isSelected}
              disabled={isOos}
              className={`relative h-10 min-w-[3rem] px-4 rounded-xl text-sm font-semibold transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isOos ? "opacity-40 cursor-not-allowed" : ""
              }`}
              style={{
                background: isSelected
                  ? "var(--primary)"
                  : "var(--background)",
                color: isSelected
                  ? "var(--primary-foreground)"
                  : "var(--text-primary)",
                borderColor: isSelected
                  ? "var(--primary)"
                  : "var(--border)",
                boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                transform: isSelected ? "scale(1.05)" : "scale(1)",
              }}
              title={isOos ? (isAr ? "غير متوفر" : "Out of stock") : undefined}
            >
              {v.size}
              {/* Diagonal strikethrough for out-of-stock */}
              {isOos && (
                <span
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  aria-hidden="true"
                >
                  <span
                    className="block w-[120%] h-[1.5px] -rotate-45"
                    style={{ background: "var(--text-faint)" }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Quantity stepper control with increment/decrement buttons.
 */
function QuantitySelector({
  quantity,
  onQuantityChange,
}: {
  quantity: number;
  onQuantityChange: (q: number) => void;
}) {
  return (
    <div
      className="flex items-center rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        className="w-10 h-12 flex items-center justify-center text-lg font-medium transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
        style={{ color: "var(--text-primary)" }}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className="w-10 h-12 flex items-center justify-center text-sm font-bold border-x"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
        aria-live="polite"
        aria-label={`Quantity: ${quantity}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onQuantityChange(quantity + 1)}
        className="w-10 h-12 flex items-center justify-center text-lg font-medium transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
        style={{ color: "var(--text-primary)" }}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/**
 * Inline stock status indicator showing availability
 * for the currently selected variant.
 */
function StockStatus({
  variant,
  locale,
}: {
  variant: ProductVariant;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const inStock = variant.stock > 0;

  return (
    <div
      className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
      style={{
        background: inStock ? "var(--success-bg)" : "var(--destructive-bg)",
        color: inStock ? "var(--success)" : "var(--destructive)",
        border: `1px solid ${inStock ? "rgba(22,163,74,0.2)" : "var(--destructive-border)"}`,
      }}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-2 h-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`}
      />
      {inStock
        ? isAr
          ? `متوفر — ${variant.stock} قطعة`
          : `In stock — ${variant.stock} left`
        : isAr
          ? "نفد من المخزون"
          : "Out of stock"}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

/**
 * ProductInfo — The primary product detail information panel.
 *
 * Manages variant selection state (color, size, quantity) and
 * delegates rendering of each logical section to focused
 * sub-components for maintainability.
 *
 * @param product - The product data with images and variants.
 * @param locale  - Current display locale.
 * @param dict    - Localised dictionary for UI strings.
 */
export default function ProductInfo({
  product,
  locale,
  dict,
}: ProductInfoProps) {
  const isAr = locale === "ar";
  const t = (section: string, key: string, fallback: string) =>
    dict?.[section]?.[key] ?? fallback;

  /* ── Store integration (reactive selectors) ───────────────── */
  const addCartItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const wishlistIds = useWishlistStore((s) => s.productIds);

  /* ── Local state ────────────────────────────────────────── */
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Derive wishlisted from the reactive productIds array */
  const wishlistActive = mounted ? wishlistIds.includes(product.id) : false;

  const categorySlug = product.category?.slug ?? "";

  /* ── Derived values ─────────────────────────────────────── */
  const name = isAr ? product.name_ar : product.name_en;
  const description = isAr ? product.description_ar : product.description_en;
  const categoryName = product.category
    ? isAr
      ? product.category.name_ar
      : product.category.name_en
    : null;

  const hasSale =
    product.sale_price !== null && product.sale_price < product.base_price;
  const discountPct = hasSale
    ? getDiscountPercentage(product.base_price, product.sale_price!)
    : 0;

  /* ── Unique variant extraction (memoised) ───────────────── */
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    return product.variants.filter((v) => {
      if (!v.color_hex) return false;
      if (seen.has(v.color_hex)) return false;
      seen.add(v.color_hex);
      return true;
    });
  }, [product.variants]);

  const uniqueSizes = useMemo(() => {
    const seen = new Set<string>();
    return product.variants.filter((v) => {
      if (!v.size) return false;
      if (seen.has(v.size)) return false;
      seen.add(v.size);
      return true;
    });
  }, [product.variants]);

  const hasVariants = product.variants.length > 0;
  const hasColors = uniqueColors.length > 0;
  const hasSizes = uniqueSizes.length > 0;

  /* ── CTA state logic ────────────────────────────────────── */
  const ctaDisabled =
    hasVariants &&
    ((hasColors && !selectedColor) || (hasSizes && !selectedSize));

  /** Find the variant matching the current color + size selection */
  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      product.variants.find((v) => {
        const colorMatch = !selectedColor || v.color_hex === selectedColor;
        const sizeMatch = !selectedSize || v.size === selectedSize;
        return colorMatch && sizeMatch;
      }) ?? null
    );
  }, [product.variants, selectedColor, selectedSize, hasVariants]);

  const inStock = !selectedVariant || selectedVariant.stock > 0;

  /** Toggle wishlist via Zustand store */
  const handleWishlistToggle = useCallback(() => {
    toggleWishlist(product.id);
  }, [toggleWishlist, product.id]);

  /** Add to cart via Zustand store */
  const handleAddToCart = useCallback(() => {
    const currentPrice = hasSale ? product.sale_price! : product.base_price;
    const primaryImage = product.images?.[0];

    addCartItem({
      productId: product.id,
      variantId: selectedVariant?.id || "default",
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug,
      image: primaryImage?.url || "",
      size: selectedVariant?.size || null,
      color_en: selectedVariant?.color_en || null,
      color_ar: selectedVariant?.color_ar || null,
      color_hex: selectedVariant?.color_hex || null,
      price: selectedVariant?.price_override || currentPrice,
      quantity: quantity,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, selectedVariant, quantity, hasSale, addCartItem]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* ── Header: Badges + Brand + Name ───────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Top badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {categoryName && (
            <span
              className="badge"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {categoryName}
            </span>
          )}
          {product.is_new && (
            <span className="badge badge-new">
              {t("products", "new", "New")}
            </span>
          )}
          {hasSale && (
            <span className="badge badge-sale">
              {t("products", "sale", "Sale")} −{discountPct}%
            </span>
          )}
        </div>

        {/* Brand */}
        {product.brand && (
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {product.brand}
          </p>
        )}

        {/* Product Name */}
        <h1
          className="text-2xl sm:text-3xl font-bold leading-tight"
          style={{
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {name}
        </h1>

        {/* Rating + Orders */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating rating={product.rating} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {product.rating.toFixed(1)}
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {product.review_count}{" "}
              {t("product", "reviews", "Reviews")}
            </span>
            {product.total_orders > 0 && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span
                  className="flex items-center gap-1 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <CheckCircle size={14} className="text-success" />
                  {product.total_orders}{" "}
                  {t(
                    "product",
                    "ordersLastWeek",
                    "orders in last week"
                  )}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="divider" />

      {/* ── Pricing (extracted sub-component) ─────────────────── */}
      <PriceDisplay
        basePrice={product.base_price}
        salePrice={product.sale_price}
        locale={locale}
        dict={dict}
      />

      {/* ── Color Selector (extracted sub-component) ──────────── */}
      {hasColors && (
        <ColorSelector
          colors={uniqueColors}
          selectedColor={selectedColor}
          onSelect={setSelectedColor}
          locale={locale}
        />
      )}

      {/* ── Size Selector (extracted sub-component) ───────────── */}
      {hasSizes && (
        <SizeSelector
          sizes={uniqueSizes}
          selectedSize={selectedSize}
          onSelect={setSelectedSize}
          locale={locale}
          dict={dict}
          categorySlug={categorySlug}
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
        />
      )}

      {/* ── Stock Status (extracted sub-component) ────────────── */}
      {selectedVariant && (
        <StockStatus variant={selectedVariant} locale={locale} />
      )}

      {/* ── CTA: Add to Cart + Wishlist ─────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        <QuantitySelector quantity={quantity} onQuantityChange={setQuantity} />

        {/* Add to Cart */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={ctaDisabled || !inStock}
          onClick={handleAddToCart}
          className={`flex-1 h-10 sm:h-12 text-sm sm:text-base font-bold gap-1.5 sm:gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            addedToCart ? "btn-secondary" : "btn-primary"
          }`}
        >
          <AnimatePresence mode="wait">
            {addedToCart ? (
              <motion.span
                key="added"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check size={20} strokeWidth={2.5} className="text-success" />
                <span className="text-success">
                  {isAr ? "تمت الإضافة!" : "Added to Cart!"}
                </span>
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <ShoppingCart size={20} strokeWidth={2} />
                <span>
                  {!inStock
                    ? isAr
                      ? "نفد من المخزون"
                      : "Out of Stock"
                    : ctaDisabled
                      ? isAr
                        ? "اختر الخيارات"
                        : "Select options"
                      : t("common", "addToCart", "Add to cart")}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Wishlist */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleWishlistToggle}
          className="btn-icon w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          style={{
            borderColor: wishlistActive
              ? "var(--destructive)"
              : "var(--border)",
            color: wishlistActive
              ? "var(--destructive)"
              : "var(--text-secondary)",
            background: wishlistActive
              ? "var(--destructive-bg)"
              : "var(--background)",
          }}
          aria-label={t("products", "addToWishlist", "Add to wishlist")}
          aria-pressed={wishlistActive}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={wishlistActive ? "filled" : "empty"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Heart
                size={20}
                strokeWidth={1.5}
                fill={wishlistActive ? "currentColor" : "none"}
              />
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── CTA hint when disabled ───────────────────────────── */}
      {ctaDisabled && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
          role="alert"
        >
          {isAr
            ? `يرجى اختيار ${hasColors && !selectedColor ? "اللون" : ""} ${hasSizes && !selectedSize ? "والمقاس" : ""} للمتابعة`
            : `Please select ${hasColors && !selectedColor ? "a color" : ""} ${hasSizes && !selectedSize ? "and a size" : ""} to continue`}
        </p>
      )}

      <div className="divider" />

      {/* ── Description ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className={`grid grid-cols-1 ${hasSizes ? 'sm:grid-cols-2' : ''} gap-x-8 gap-y-6`}>
          {/* Description block */}
          <div className="flex flex-col gap-3">
            <h2
              className="text-base font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("product", "description", "Description")}
            </h2>

            {/* Product ref */}
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "var(--text-faint)" }}
            >
              {t("product", "productRef", "PRODUCT REF.")}{" "}
              {product.slug.toUpperCase()}
            </p>

            {/* Description text */}
            {description ? (
              <div
                className="text-sm leading-relaxed space-y-2"
                style={{ color: "var(--text-secondary)" }}
                dangerouslySetInnerHTML={{
                  __html: description
                    .replace(/\n\n/g, "</p><p>")
                    .replace(/\n/g, "<br/>")
                    .replace(/^/, "<p>")
                    .replace(/$/, "</p>"),
                }}
              />
            ) : (
              <p
                className="text-sm italic"
                style={{ color: "var(--text-faint)" }}
              >
                {isAr ? "لا يوجد وصف متاح" : "No description available"}
              </p>
            )}
          </div>

          {/* Size Guide — only shown if product has size variants */}
          {hasSizes && (
            <div className="flex flex-col gap-3">
              <h2
                className="text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {t("product", "sizeGuide", "Size guide")}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(
                  "product",
                  "sizeGuideTip",
                  "To choose your size, please refer to our size guide."
                )}
              </p>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-sm font-semibold self-start transition-colors group/sg"
                style={{ color: "var(--text-muted)" }}
                aria-label={isAr ? "عرض دليل المقاسات" : "View size guide"}
              >
                <span className="underline underline-offset-4 decoration-dashed group-hover/sg:decoration-solid group-hover/sg:text-[var(--text-primary)] transition-colors">
                  {isAr ? "عرض دليل المقاسات" : "View size guide"}
                </span>
                <span className="inline-block ms-1 transition-transform group-hover/sg:translate-x-0.5">
                  ↗
                </span>
              </button>
            </div>
          )}

          {/* Size Guide Modal */}
          {hasSizes && (
            <SizeGuideModal
              isOpen={sizeGuideOpen}
              onClose={() => setSizeGuideOpen(false)}
              categorySlug={categorySlug}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
