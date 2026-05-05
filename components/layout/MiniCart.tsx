"use client";

/* ══════════════════════════════════════════════════════════════
   MiniCart — Floating Cart Dropdown (Client Component)
   ──────────────────────────────────────────────────────────────
   Premium floating dropdown shown when hovering the cart icon.
   Displays up to 3 recently added items, a subtotal, and CTA
   buttons for "View Cart" and "Checkout".

   Animated via Framer Motion (scale + fade).
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag } from "lucide-react";
import { useCartStore, selectCartSubtotal, type CartItem } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

interface MiniCartProps {
  items: CartItem[];
  locale: string;
  onClose: () => void;
}

/**
 * MiniCart — A premium dropdown showing the 3 most recently added
 * cart items with product thumbnail, name, variant info, and price.
 */
export function MiniCart({ items, locale, onClose }: MiniCartProps) {
  const isAr = locale === "ar";
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore(selectCartSubtotal);

  /* Show up to 3 most recently added items */
  const recentItems = [...items].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3);
  const remainingCount = items.length - recentItems.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="absolute end-0 top-full mt-2 w-[360px] z-50 dropdown-panel"
      style={{ transformOrigin: isAr ? "top left" : "top right" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <ShoppingBag size={16} strokeWidth={2} />
          {isAr ? "سلة التسوق" : "Shopping Cart"}
          <span className="text-text-faint font-normal">
            ({items.length} {isAr ? "عناصر" : items.length === 1 ? "item" : "items"})
          </span>
        </h3>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-5 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--surface-elevated)" }}
          >
            <ShoppingBag size={28} strokeWidth={1.5} className="text-text-faint" />
          </div>
          <p className="text-sm text-text-muted text-center">
            {isAr ? "سلتك فارغة" : "Your cart is empty"}
          </p>
          <Link
            href="/shop"
            className="btn-secondary text-xs h-9 px-4"
            onClick={onClose}
          >
            {isAr ? "تصفح المنتجات" : "Browse Products"}
          </Link>
        </div>
      ) : (
        <>
          <div className="max-h-[260px] overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1">
            {recentItems.map((item) => (
              <div
                key={item.cartKey}
                className="flex items-start gap-3 px-5 py-3 hover:bg-surface transition-colors"
              >
                {/* Thumbnail */}
                <Link
                  href={`/product/${item.slug}`}
                  className="w-14 h-14 rounded-xl overflow-hidden bg-surface-inset flex-shrink-0 relative"
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={isAr ? item.name_ar : item.name_en}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-faint text-xs">
                      N/A
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    className="block text-sm font-semibold text-text-primary leading-tight line-clamp-1 hover:text-accent transition-colors"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                  >
                    {isAr ? item.name_ar : item.name_en}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.color_hex && (
                      <span
                        className="w-3 h-3 rounded-full inline-block border border-border"
                        style={{ backgroundColor: item.color_hex }}
                      />
                    )}
                    {item.size && (
                      <span className="text-xs text-text-muted">{item.size}</span>
                    )}
                    {(item.color_hex || item.size) && (
                      <span className="text-text-faint text-xs">·</span>
                    )}
                    <span className="text-xs text-text-muted">×{item.quantity}</span>
                  </div>
                  <p className="text-sm font-bold text-text-primary mt-1">
                    {formatPrice(item.price * item.quantity, locale as Locale)}
                  </p>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeItem(item.cartKey)}
                  className="p-1.5 rounded-lg text-text-faint hover:text-destructive hover:bg-destructive-bg transition-colors flex-shrink-0"
                  aria-label={isAr ? "إزالة" : "Remove"}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}

            {remainingCount > 0 && (
              <p className="text-xs text-text-muted text-center py-2">
                {isAr
                  ? `و ${remainingCount} عناصر أخرى`
                  : `and ${remainingCount} more ${remainingCount === 1 ? "item" : "items"}`}
              </p>
            )}
          </div>

          {/* Subtotal + CTAs */}
          <div className="border-t border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {isAr ? "المجموع الفرعي" : "Subtotal"}
              </span>
              <span className="text-base font-bold text-text-primary">
                {formatPrice(subtotal, locale as Locale)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                className="btn-secondary h-10 text-sm justify-center"
                onClick={onClose}
              >
                {isAr ? "عرض السلة" : "View Cart"}
              </Link>
              <Link
                href="/checkout"
                className="btn-primary h-10 text-sm justify-center"
                onClick={onClose}
              >
                {isAr ? "الدفع" : "Checkout"}
              </Link>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
