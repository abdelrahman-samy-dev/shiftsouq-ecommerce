"use client";

/* ══════════════════════════════════════════════════════════════
   CartPageContent — Cart Page Client Shell
   ──────────────────────────────────────────────────────────────
   Client component that reads from the Zustand cart store and
   renders either the cart items + order summary or the empty
   state. Handles hydration guard for SSR.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, Trash2 } from "lucide-react";
import { useCartStore, selectCartTotalItems } from "@/lib/store/useCartStore";
import { CartItemRow } from "./CartItemRow";
import { OrderSummary } from "./OrderSummary";

interface CartPageContentProps {
  locale: string;
}

/**
 * CartPageContent — The main cart page body.
 *
 * Renders a 2-column layout on desktop (items left, summary right)
 * and stacked layout on mobile. Includes a beautiful empty state.
 */
export function CartPageContent({ locale }: CartPageContentProps) {
  const isAr = locale === "ar";
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const itemCount = useCartStore(selectCartTotalItems);

  /* ── Hydration guard ───────────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-5 py-5">
                <div className="skeleton-block w-28 h-28 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton-block h-5 w-2/3 rounded-lg" />
                  <div className="skeleton-block h-4 w-1/3 rounded-lg" />
                  <div className="skeleton-block h-10 w-32 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
          <div className="skeleton-block h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isEmpty = items.length === 0;

  /* ── Empty State ───────────────────────────────────────── */
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto px-4 py-20 text-center"
      >
        {/* Icon */}
        <div
          className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <ShoppingBag
            size={40}
            strokeWidth={1.2}
            className="text-text-faint"
          />
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {isAr ? "سلتك فارغة" : "Your cart is empty"}
        </h2>
        <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto">
          {isAr
            ? "يبدو أنك لم تضف أي منتجات بعد. تصفح مجموعتنا واعثر على ما تحب!"
            : "Looks like you haven't added any products yet. Browse our collection and find something you love!"}
        </p>

        <Link
          href="/shop"
          className="btn-primary h-12 px-8 text-base font-bold gap-2 inline-flex"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
          {isAr ? "تصفح المنتجات" : "Continue Shopping"}
        </Link>
      </motion.div>
    );
  }

  /* ── Cart Content ──────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
        {/* Left: Cart Items */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                {isAr ? "سلة التسوق" : "Shopping Cart"}
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                {itemCount} {isAr ? "عناصر" : itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-lg hover:bg-destructive-bg"
              aria-label={isAr ? "مسح السلة" : "Clear Cart"}
            >
              <Trash2 size={14} strokeWidth={1.5} />
              {isAr ? "مسح الكل" : "Clear All"}
            </button>
          </div>

          {/* Items */}
          <div className="card-elevated px-4 sm:px-6">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartItemRow key={item.cartKey} item={item} locale={locale} />
              ))}
            </AnimatePresence>
          </div>

          {/* Continue Shopping Link */}
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors group"
          >
            <ArrowLeft
              size={16}
              className="rtl:rotate-180 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
            />
            {isAr ? "متابعة التسوق" : "Continue Shopping"}
          </Link>
        </motion.div>

        {/* Right: Order Summary */}
        <OrderSummary locale={locale} />
      </div>
    </div>
  );
}
