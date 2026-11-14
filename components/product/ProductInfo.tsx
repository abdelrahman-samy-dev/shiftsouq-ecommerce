"use client";

/* ══════════════════════════════════════════════════════════════
   ProductInfo — Product Detail Panel
   ──────────────────────────────────────────────────────────────
   Complete product info panel for the PDP: brand, title, rating,
   price, color/size variant selectors, description, and CTA.

   Variant rules (match checkout, see place_order()):
   - An option with a single value (one colour, one size, or a
     product with one variant) is pre-selected, so the buyer is
     never asked to "select options" when there is no choice.
   - Options with no stock for the current selection are disabled
     and marked "out of stock".
   - The price shown is the price checkout charges: variant
     price_override, else a valid sale price, else base price
     (lib/seo/pricing). Before a full selection, the lowest price
     of the in-stock variants is shown as "From …" when they differ.
   - Add to cart is disabled when the selected variant has no stock.

   Supports LTR/RTL and Dark Mode via CSS custom properties.
   ══════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Heart, Star, CheckCircle, X, Check } from "lucide-react";
import type { ProductVariant, ProductImage } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/shipping";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import { priceSummary, unitPrice } from "@/lib/seo/pricing";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { useHydrated } from "./use-hydrated";

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

type Dict = Record<string, Record<string, string>>;

interface ProductInfoProps {
  product: ProductInfoProduct;
  locale: Locale;
  dict: Dict;
}

/* ── Sub-Components (SRP) ────────────────────────────────────── */

/**
 * Renders a star rating display with partial-fill support.
 * Purely presentational — no interactive behavior.
 */
function StarRating({ rating, max = 5, locale }: { rating: number; max?: number; locale: Locale }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={
        locale === "ar"
          ? `التقييم ${rating.toFixed(1)} من ${max}`
          : `Rating: ${rating.toFixed(1)} out of ${max}`
      }
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
 * Shows the price checkout charges, the struck-through base price
 * when lower, the discount badge and the free-shipping note.
 */
function PriceDisplay({
  price,
  compareAt,
  discountPercent,
  fromPrice,
  locale,
}: {
  price: number;
  compareAt: number | null;
  discountPercent: number;
  /** True when the price is the lowest of several ("From …"). */
  fromPrice: boolean;
  locale: Locale;
}) {
  const isAr = locale === "ar";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        {fromPrice && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isAr ? "يبدأ من" : "From"}
          </span>
        )}
        <span
          className="text-3xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {formatPrice(price, locale)}
        </span>
        {compareAt !== null && (
          <span
            className="text-lg line-through"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="sr-only">{isAr ? "السعر قبل الخصم:" : "Was"} </span>
            {formatPrice(compareAt, locale)}
          </span>
        )}
        {compareAt !== null && discountPercent > 0 && (
          <span
            className="text-sm font-semibold px-2 py-0.5 rounded-lg"
            style={{
              background: "var(--destructive-bg)",
              color: "var(--destructive)",
              border: "1px solid var(--destructive-border)",
            }}
          >
            {isAr ? "وفّر" : "Save"} {discountPercent}%
          </span>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        <span style={{ color: "var(--success)" }} aria-hidden="true">✓</span>{" "}
        {isAr
          ? `شحن مجاني للطلبات من ${formatPrice(FREE_SHIPPING_THRESHOLD, locale)}`
          : `Free shipping on orders from ${formatPrice(FREE_SHIPPING_THRESHOLD, locale)}`}
      </p>
    </div>
  );
}

/** Diagonal line drawn over an option that is out of stock. */
function OutOfStockStrike() {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <span
        className="block w-[120%] h-[1.5px] -rotate-45"
        style={{ background: "var(--text-muted)" }}
      />
    </span>
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
  isAvailable,
  locale,
}: {
  colors: ProductVariant[];
  selectedColor: string | null;
  onSelect: (hex: string | null) => void;
  isAvailable: (hex: string) => boolean;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const single = colors.length === 1;

  const selectedColorName = useMemo(() => {
    if (!selectedColor) return null;
    const variant = colors.find((v) => v.color_hex === selectedColor);
    return variant ? (isAr ? variant.color_ar ?? variant.color_en : variant.color_en) : null;
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
        role="group"
        aria-label={isAr ? "اختيار اللون" : "Color selection"}
      >
        {colors.map((v) => {
          const hex = v.color_hex!;
          const isSelected = selectedColor === hex;
          const available = isAvailable(hex);
          const colorName = (isAr ? v.color_ar ?? v.color_en : v.color_en) ?? hex;
          const oosLabel = isAr ? "غير متوفر" : "out of stock";
          return (
            <button
              key={v.id}
              type="button"
              // A single colour stays selected; otherwise clicking again clears it.
              onClick={() => onSelect(isSelected && !single ? null : hex)}
              title={available ? colorName : `${colorName} — ${oosLabel}`}
              aria-label={`${isAr ? "اللون" : "Color"}: ${colorName}${available ? "" : ` (${oosLabel})`}`}
              aria-pressed={isSelected}
              disabled={!available && !isSelected}
              className={`relative w-9 h-9 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                available ? "" : "opacity-40 cursor-not-allowed"
              }`}
              style={{
                backgroundColor: hex,
                boxShadow: isSelected
                  ? `0 0 0 2px var(--background), 0 0 0 4px var(--primary)`
                  : "0 0 0 1.5px var(--border)",
                transform: isSelected ? "scale(1.15)" : "scale(1)",
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
              {!available && <OutOfStockStrike />}
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
 * Only opens after a click, so it always renders on the client.
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
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const isAr = locale === "ar";
  if (!isOpen) return null;

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
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
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

        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
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
 * with a "Size guide" link that opens the category-aware modal.
 */
function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
  isAvailable,
  locale,
  onOpenSizeGuide,
}: {
  sizes: ProductVariant[];
  selectedSize: string | null;
  onSelect: (size: string | null) => void;
  isAvailable: (size: string) => boolean;
  locale: Locale;
  onOpenSizeGuide: () => void;
}) {
  const isAr = locale === "ar";
  const single = sizes.length === 1;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {isAr ? "المقاس" : "Size"}
        </span>
        <button
          type="button"
          onClick={onOpenSizeGuide}
          className="text-sm underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          {isAr ? "دليل المقاسات" : "Size guide"} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={isAr ? "اختيار المقاس" : "Size selection"}
      >
        {sizes.map((v) => {
          const size = v.size!;
          const isSelected = selectedSize === size;
          const available = isAvailable(size);
          const oosLabel = isAr ? "غير متوفر" : "out of stock";
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(isSelected && !single ? null : size)}
              aria-pressed={isSelected}
              aria-label={`${isAr ? "المقاس" : "Size"} ${size}${available ? "" : ` (${oosLabel})`}`}
              disabled={!available && !isSelected}
              className={`relative h-10 min-w-[3rem] px-4 rounded-xl text-sm font-semibold transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                available ? "" : "opacity-40 cursor-not-allowed"
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
              title={available ? undefined : oosLabel}
            >
              {size}
              {!available && <OutOfStockStrike />}
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
  max,
  onQuantityChange,
  locale,
}: {
  quantity: number;
  max: number;
  onQuantityChange: (q: number) => void;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  return (
    <div
      className="flex items-center rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="w-10 h-12 flex items-center justify-center text-lg font-medium transition-colors hover:bg-surface-elevated disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
        style={{ color: "var(--text-primary)" }}
        aria-label={isAr ? "إنقاص الكمية" : "Decrease quantity"}
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
        aria-label={isAr ? `الكمية: ${quantity}` : `Quantity: ${quantity}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-10 h-12 flex items-center justify-center text-lg font-medium transition-colors hover:bg-surface-elevated disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
        style={{ color: "var(--text-primary)" }}
        aria-label={isAr ? "زيادة الكمية" : "Increase quantity"}
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
  stock,
  locale,
}: {
  stock: number;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const inStock = stock > 0;

  return (
    <div
      className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
      style={{
        background: inStock ? "var(--success-bg)" : "var(--destructive-bg)",
        color: "var(--text-primary)",
        border: `1px solid ${inStock ? "rgba(22,163,74,0.2)" : "var(--destructive-border)"}`,
      }}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-2 h-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`}
        aria-hidden="true"
      />
      {inStock
        ? isAr
          ? `متوفر — ${stock} قطعة`
          : `In stock — ${stock} left`
        : isAr
          ? "نفد من المخزون"
          : "Out of stock"}
    </div>
  );
}

/** Renders plain-text descriptions as paragraphs (no HTML from the database). */
function DescriptionText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <div
      className="text-sm leading-relaxed space-y-2"
      style={{ color: "var(--text-secondary)" }}
    >
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/* ── Variant helpers ─────────────────────────────────────────── */

function uniqueBy(variants: ProductVariant[], key: "color_hex" | "size"): ProductVariant[] {
  const seen = new Set<string>();
  return variants.filter((v) => {
    const value = v[key];
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
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
  const hydrated = useHydrated();

  /* ── Options ────────────────────────────────────────────── */
  const variants = product.variants;
  const uniqueColors = useMemo(() => uniqueBy(variants, "color_hex"), [variants]);
  const uniqueSizes = useMemo(() => uniqueBy(variants, "size"), [variants]);
  const hasColors = uniqueColors.length > 0;
  const hasSizes = uniqueSizes.length > 0;

  /* ── Local state — single options start selected ────────── */
  const [selectedColor, setSelectedColor] = useState<string | null>(() =>
    uniqueColors.length === 1 ? uniqueColors[0].color_hex : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(() =>
    uniqueSizes.length === 1 ? uniqueSizes[0].size : null
  );
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  /* Derive wishlisted from the reactive productIds array */
  const wishlistActive = hydrated ? wishlistIds.includes(product.id) : false;

  const categorySlug = product.category?.slug ?? "";

  /* ── Derived values ─────────────────────────────────────── */
  const name = isAr ? product.name_ar : product.name_en;
  const description = isAr ? product.description_ar : product.description_en;
  const categoryName = product.category
    ? isAr
      ? product.category.name_ar
      : product.category.name_en
    : null;

  /* ── Availability per option, given the other selection ── */
  const isColorAvailable = useCallback(
    (hex: string) =>
      variants.some(
        (v) =>
          v.color_hex === hex &&
          (!hasSizes || !selectedSize || v.size === selectedSize) &&
          v.stock > 0
      ),
    [variants, hasSizes, selectedSize]
  );
  const isSizeAvailable = useCallback(
    (size: string) =>
      variants.some(
        (v) =>
          v.size === size &&
          (!hasColors || !selectedColor || v.color_hex === selectedColor) &&
          v.stock > 0
      ),
    [variants, hasColors, selectedColor]
  );

  /* ── Selected variant (only once every option is chosen) ─ */
  const selectionComplete =
    (!hasColors || selectedColor !== null) && (!hasSizes || selectedSize !== null);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0 || !selectionComplete) return null;
    if (!hasColors && !hasSizes) {
      // Variants without options: pick the first one that can be bought.
      return variants.find((v) => v.stock > 0) ?? variants[0];
    }
    return (
      variants.find(
        (v) =>
          (!hasColors || v.color_hex === selectedColor) &&
          (!hasSizes || v.size === selectedSize)
      ) ?? null
    );
  }, [variants, selectionComplete, hasColors, hasSizes, selectedColor, selectedSize]);

  /* ── Price: exact for the selected variant, else "From" ─── */
  const summary = priceSummary(product, variants);
  const displayPrice = selectedVariant ? unitPrice(product, selectedVariant) : summary.price;
  const compareAt =
    product.base_price > 0 && displayPrice < product.base_price ? product.base_price : null;
  const discountPct = compareAt
    ? Math.round(((compareAt - displayPrice) / compareAt) * 100)
    : 0;
  const fromPrice = !selectedVariant && summary.varies;

  /* ── CTA state ──────────────────────────────────────────── */
  const purchasable = variants.length > 0;
  const needsSelection = purchasable && !selectionComplete;
  const comboUnavailable = purchasable && selectionComplete && !selectedVariant;
  const inStock = selectedVariant
    ? selectedVariant.stock > 0
    : purchasable && !comboUnavailable && summary.inStock;
  const ctaDisabled = !purchasable || needsSelection || comboUnavailable || !inStock;

  const maxQuantity = Math.max(
    1,
    Math.min(MAX_CART_QUANTITY, selectedVariant ? selectedVariant.stock : MAX_CART_QUANTITY)
  );
  const effectiveQuantity = Math.min(quantity, maxQuantity);

  const ctaLabel = !purchasable || (selectedVariant && !inStock)
    ? isAr ? "نفد من المخزون" : "Out of stock"
    : comboUnavailable
      ? isAr ? "غير متوفر" : "Unavailable"
      : needsSelection
        ? isAr ? "اختر الخيارات" : "Select options"
        : !inStock
          ? isAr ? "نفد من المخزون" : "Out of stock"
          : t("common", "addToCart", "Add to cart");

  const missingOptions = [
    hasColors && !selectedColor ? (isAr ? "اللون" : "a color") : null,
    hasSizes && !selectedSize ? (isAr ? "المقاس" : "a size") : null,
  ].filter(Boolean) as string[];

  const closeSizeGuide = useCallback(() => setSizeGuideOpen(false), []);

  /** Toggle wishlist via Zustand store */
  const handleWishlistToggle = useCallback(() => {
    toggleWishlist(product.id);
  }, [toggleWishlist, product.id]);

  /** Add the selected variant to the cart at the price checkout charges. */
  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || selectedVariant.stock <= 0) return;
    const primaryImage = product.images?.[0];

    addCartItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug,
      image: primaryImage?.url || "",
      size: selectedVariant.size || null,
      color_en: selectedVariant.color_en || null,
      color_ar: selectedVariant.color_ar || null,
      color_hex: selectedVariant.color_hex || null,
      price: unitPrice(product, selectedVariant),
      quantity: effectiveQuantity,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, selectedVariant, effectiveQuantity, addCartItem]);

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
          {compareAt !== null && discountPct > 0 && (
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
            <StarRating rating={product.rating} locale={locale} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {product.rating.toFixed(1)}
            </span>
            <span style={{ color: "var(--border)" }} aria-hidden="true">·</span>
            <span
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {product.review_count}{" "}
              {t("product", "reviews", "Reviews")}
            </span>
            {product.total_orders > 0 && (
              <>
                <span style={{ color: "var(--border)" }} aria-hidden="true">·</span>
                <span
                  className="flex items-center gap-1 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <CheckCircle size={14} className="text-success" aria-hidden="true" />
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

      {/* ── Pricing (same rule as checkout) ───────────────────── */}
      <PriceDisplay
        price={displayPrice}
        compareAt={compareAt}
        discountPercent={discountPct}
        fromPrice={fromPrice}
        locale={locale}
      />

      {/* ── Color Selector ────────────────────────────────────── */}
      {hasColors && (
        <ColorSelector
          colors={uniqueColors}
          selectedColor={selectedColor}
          onSelect={setSelectedColor}
          isAvailable={isColorAvailable}
          locale={locale}
        />
      )}

      {/* ── Size Selector ─────────────────────────────────────── */}
      {hasSizes && (
        <SizeSelector
          sizes={uniqueSizes}
          selectedSize={selectedSize}
          onSelect={setSelectedSize}
          isAvailable={isSizeAvailable}
          locale={locale}
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
        />
      )}

      {/* ── Stock Status ──────────────────────────────────────── */}
      {selectedVariant ? (
        <StockStatus stock={selectedVariant.stock} locale={locale} />
      ) : !purchasable ? (
        <StockStatus stock={0} locale={locale} />
      ) : null}

      {/* ── CTA: Add to Cart + Wishlist ─────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        <QuantitySelector
          quantity={effectiveQuantity}
          max={maxQuantity}
          onQuantityChange={setQuantity}
          locale={locale}
        />

        {/* Add to Cart */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={ctaDisabled}
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
                <Check size={20} strokeWidth={2.5} className="text-success" aria-hidden="true" />
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
                <ShoppingCart size={20} strokeWidth={2} aria-hidden="true" />
                <span>{ctaLabel}</span>
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

      {/* ── CTA hint when options are missing ─────────────────── */}
      {needsSelection && missingOptions.length > 0 && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
          role="status"
        >
          {isAr
            ? `يرجى اختيار ${missingOptions.join(" و")} للمتابعة`
            : `Please select ${missingOptions.join(" and ")} to continue`}
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
              style={{ color: "var(--text-muted)" }}
            >
              {t("product", "productRef", "PRODUCT REF.")}{" "}
              {product.slug.toUpperCase()}
            </p>

            {/* Description text */}
            {description ? (
              <DescriptionText text={description} />
            ) : (
              <p
                className="text-sm italic"
                style={{ color: "var(--text-muted)" }}
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
              >
                <span className="underline underline-offset-4 decoration-dashed group-hover/sg:decoration-solid group-hover/sg:text-[var(--text-primary)] transition-colors">
                  {isAr ? "عرض دليل المقاسات" : "View size guide"}
                </span>
                <span className="inline-block ms-1 transition-transform group-hover/sg:translate-x-0.5" aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          )}

          {/* Size Guide Modal */}
          {hasSizes && (
            <SizeGuideModal
              isOpen={sizeGuideOpen}
              onClose={closeSizeGuide}
              categorySlug={categorySlug}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
