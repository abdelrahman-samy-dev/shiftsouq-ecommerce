"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutSidebar — Persistent Order Summary
   ──────────────────────────────────────────────────────────────
   Sticky sidebar showing cart items, subtotal, shipping cost,
   and total. Visible on desktop, collapsible on mobile.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingBag, Package, Truck, Tag } from "lucide-react";
import { useCartStore, selectCartSubtotal, selectCartTotalItems } from "@/lib/store/useCartStore";
import { useCheckoutStore } from "@/lib/store/useCheckoutStore";
import { formatPrice, cn, getLocalizedField } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

interface CheckoutSidebarProps {
  locale: string;
}

export function CheckoutSidebar({ locale }: CheckoutSidebarProps) {
  const isAr = locale === "ar";
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const itemCount = useCartStore(selectCartTotalItems);
  const shippingCost = useCheckoutStore((s) => s.shippingCost);
  const total = subtotal + shippingCost;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="card-elevated overflow-hidden lg:sticky lg:top-24"
    >
      {/* Mobile Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between p-4 text-start"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <ShoppingBag size={16} className="text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {isAr ? "ملخص الطلب" : "Order Summary"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {itemCount} {isAr ? "عناصر" : itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {formatPrice(total, locale as Locale)}
          </span>
          <ChevronDown
            size={18}
            className={cn(
              "text-[var(--text-muted)] transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Content */}
      <div className={cn("hidden lg:block", isExpanded && "!block")}>
        <div className="p-5 lg:p-6">
          {/* Desktop Title */}
          <h2 className="hidden lg:flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] mb-5">
            <ShoppingBag size={18} strokeWidth={2} />
            {isAr ? "ملخص الطلب" : "Order Summary"}
          </h2>

          {/* Items List */}
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.cartKey}
                className="flex gap-3 py-3"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {/* Thumbnail */}
                <Link
                  href={`/product/${item.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-14 h-14 flex-shrink-0 group/thumb"
                >
                  <div
                    className="w-full h-full rounded-lg overflow-hidden relative transition-opacity group-hover/thumb:opacity-80"
                    style={{ background: "var(--surface)" }}
                  >
                    <Image
                      src={item.image}
                      alt={isAr ? item.name_ar : item.name_en}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  {/* Quantity badge */}
                  <span
                    className={cn(
                      "absolute -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-950 z-10",
                      isAr ? "-left-2" : "-right-2"
                    )}
                  >
                    {item.quantity}
                  </span>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--accent)] transition-colors"
                  >
                    {isAr ? item.name_ar : item.name_en}
                  </Link>
                  {(item.size || item.color_en) && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {[
                        item.size,
                        isAr ? item.color_ar : item.color_en,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  )}
                </div>

                {/* Price */}
                <span className="text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                  {formatPrice(item.price * item.quantity, locale as Locale)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="divider my-4" />

          {/* Summary Lines */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Package size={14} className="text-[var(--text-faint)]" />
                {isAr ? "المجموع الفرعي" : "Subtotal"}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatPrice(subtotal, locale as Locale)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Truck size={14} className="text-[var(--text-faint)]" />
                {isAr ? "الشحن" : "Shipping"}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {isFreeShipping ? (
                  <span className="text-success">{isAr ? "مجانًا" : "Free"}</span>
                ) : shippingCost > 0 ? (
                  formatPrice(shippingCost, locale as Locale)
                ) : (
                  <span className="text-[var(--text-faint)] text-xs font-normal">
                    {isAr ? "يحدد لاحقاً" : "Calculated next"}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="divider my-4" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-[var(--text-primary)]">
              {isAr ? "الإجمالي" : "Total"}
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {formatPrice(total, locale as Locale)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
