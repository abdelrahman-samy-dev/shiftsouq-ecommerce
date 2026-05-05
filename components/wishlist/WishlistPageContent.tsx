"use client";

/* ══════════════════════════════════════════════════════════════
   WishlistPageContent — Client Shell for Wishlist Page
   ──────────────────────────────────────────────────────────────
   Reads wishlist productIds from Zustand, fetches product data
   via a server action, and renders a grid of product cards.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Trash2 } from "lucide-react";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { fetchWishlistProducts } from "@/lib/actions/wishlist";
import type { ProductWithDetails, Locale } from "@/lib/types";
import ProductCard from "@/components/product/ProductCard";
import AnimatedProductCard from "@/components/product/AnimatedProductCard";
import { getDictionary } from "@/lib/i18n/get-dictionary";

interface WishlistPageContentProps {
  locale: string;
}

/**
 * WishlistPageContent — Displays a grid of wishlisted products.
 *
 * Since wishlist IDs are client-side (localStorage), we:
 * 1. Read IDs from Zustand after mount
 * 2. Call a server action to fetch product data
 * 3. Render the grid with AnimatedProductCard wrappers
 */
export function WishlistPageContent({ locale }: WishlistPageContentProps) {
  const isAr = locale === "ar";
  const productIds = useWishlistStore((s) => s.productIds);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dict, setDict] = useState<Record<string, Record<string, string>>>({});

  /* ── Fetch dictionary ─────────────────────────────────── */
  useEffect(() => {
    getDictionary(locale as Locale).then((d) => setDict(d as any));
  }, [locale]);

  /* ── Hydration guard ──────────────────────────────────── */
  useEffect(() => setMounted(true), []);

  /* ── Fetch products by IDs ────────────────────────────── */
  const fetchProducts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchWishlistProducts(ids);
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch wishlist products:", error);
      setProducts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchProducts(productIds);
    }
  }, [mounted, productIds, fetchProducts]);

  /* ── Loading skeleton ─────────────────────────────────── */
  if (!mounted || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="skeleton-block h-8 w-48 rounded-lg" />
          <div className="skeleton-block h-6 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton-block aspect-[4/5] rounded-xl" />
              <div className="skeleton-block h-5 w-20 rounded-lg" />
              <div className="skeleton-block h-4 w-full rounded-lg" />
              <div className="skeleton-block h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = products.length === 0;

  /* ── Empty State ──────────────────────────────────────── */
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto px-4 py-20 text-center"
      >
        <div
          className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <Heart size={40} strokeWidth={1.2} className="text-text-faint" />
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {isAr ? "قائمة الرغبات فارغة" : "Your wishlist is empty"}
        </h2>
        <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto">
          {isAr
            ? "لم تقم بإضافة أي منتجات إلى قائمة الرغبات بعد. تصفح متجرنا وأضف المنتجات التي تعجبك!"
            : "You haven't saved any products yet. Browse our store and heart the items you love!"}
        </p>

        <Link
          href="/shop"
          className="btn-primary h-12 px-8 text-base font-bold gap-2 inline-flex"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
          {isAr ? "تصفح المنتجات" : "Start Shopping"}
        </Link>
      </motion.div>
    );
  }

  /* ── Wishlist Grid ─────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            {isAr ? "قائمة الرغبات" : "My Wishlist"}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {products.length}{" "}
            {isAr
              ? "منتجات محفوظة"
              : products.length === 1
                ? "saved product"
                : "saved products"}
          </p>
        </div>
        <button
          type="button"
          onClick={clearWishlist}
          className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors px-3 py-2 rounded-lg hover:bg-destructive-bg"
          aria-label={isAr ? "مسح القائمة" : "Clear Wishlist"}
        >
          <Trash2 size={14} strokeWidth={1.5} />
          {isAr ? "مسح الكل" : "Clear All"}
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              layout
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            >
              <AnimatedProductCard index={index}>
                <ProductCard
                  product={product}
                  locale={locale}
                  dict={dict}
                />
              </AnimatedProductCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Continue Shopping */}
      <div className="text-center mt-10">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="rtl:rotate-180 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
          />
          {isAr ? "متابعة التسوق" : "Continue Shopping"}
        </Link>
      </div>
    </div>
  );
}
