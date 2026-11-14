"use client";

/* ══════════════════════════════════════════════════════════════
   CartItemRow — Individual Cart Item Display
   ──────────────────────────────────────────────────────────────
   Renders a single cart item with product image, name, variant
   info, price, custom quantity stepper, and remove button.
   Animated entrance/exit via Framer Motion.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Minus, Plus } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

interface CartItemRowProps {
  item: CartItem;
  locale: Locale;
}

/**
 * CartItemRow — Premium cart item display with quantity stepper.
 *
 * Features:
 * - Large product image with hover link
 * - Variant details (size, color swatch)
 * - Custom +/- quantity stepper
 * - Unit price × quantity total
 * - Animated trash/remove button
 */
export function CartItemRow({ item, locale }: CartItemRowProps) {
  const isAr = locale === "ar";
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const name = isAr ? item.name_ar : item.name_en;
  const colorLabel = isAr ? item.color_ar : item.color_en;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isAr ? 40 : -40, transition: { duration: 0.2 } }}
      className="flex gap-4 sm:gap-5 py-5 border-b border-border last:border-b-0"
    >
      {/* Product Image */}
      <Link
        href={`/product/${item.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-xl overflow-hidden bg-surface-inset flex-shrink-0 group"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 96px, 128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-faint text-sm">
            {isAr ? "لا توجد صورة" : "No Image"}
          </div>
        )}
      </Link>

      {/* Info Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: Name + Variant — entire block is a link for large click target */}
        <Link
          href={`/product/${item.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="block group/info"
        >
          <span className="block text-sm sm:text-base font-semibold text-text-primary leading-snug line-clamp-2 group-hover/info:text-accent transition-colors">
            {name}
          </span>

          {/* Variant details */}
          <span className="flex items-center gap-2 mt-1.5 flex-wrap">
            {item.color_hex && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-border inline-block"
                  style={{ backgroundColor: item.color_hex }}
                />
                {colorLabel && (
                  <span className="text-xs text-text-muted">{colorLabel}</span>
                )}
              </span>
            )}
            {item.size && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-md"
                style={{
                  background: "var(--surface-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {isAr ? "مقاس" : "Size"}: {item.size}
              </span>
            )}
          </span>
        </Link>

        {/* Bottom: Price + Quantity + Remove */}
        <div className="flex items-end justify-between mt-3 gap-3">
          {/* Custom Quantity Stepper */}
          <div
            className="flex items-center rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-colors hover:bg-surface-elevated"
              style={{ color: "var(--text-primary)" }}
              aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"}
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <span
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold border-x"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-colors hover:bg-surface-elevated"
              style={{ color: "var(--text-primary)" }}
              aria-label={isAr ? "زيادة الكمية" : "Increase quantity"}
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Price + Remove */}
          <div className="flex items-center gap-3">
            <p className="text-base sm:text-lg font-bold text-text-primary whitespace-nowrap">
              {formatPrice(item.price * item.quantity, locale as Locale)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.cartKey)}
              className="p-2 rounded-xl text-text-faint hover:text-destructive hover:bg-destructive-bg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`${isAr ? "إزالة" : "Remove"}: ${name}`}
            >
              <Trash2 size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
