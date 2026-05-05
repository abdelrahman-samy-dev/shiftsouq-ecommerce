"use client";

/* ══════════════════════════════════════════════════════════════
   HeaderActions — Cart & Wishlist Navbar Icons (Client)
   ──────────────────────────────────────────────────────────────
   Client component that reads from Zustand stores to display
   real-time badge counts on the Wishlist (Heart) and Cart
   (Shopping Bag) icons in the header.

   REACTIVITY FIX: Selects raw `items` / `productIds` arrays
   (actual state) instead of method references. Zustand only
   triggers re-renders when the selected value changes by
   reference — method references are stable and never change.
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore, selectCartTotalItems } from "@/lib/store/useCartStore";
import { useWishlistStore, selectWishlistCount } from "@/lib/store/useWishlistStore";
import { MiniCart } from "./MiniCart";

interface HeaderActionsProps {
  locale: string;
}

/**
 * HeaderActions — Renders the Wishlist + Cart icon buttons with
 * animated badges and a MiniCart dropdown for the cart icon.
 */
export function HeaderActions({ locale }: HeaderActionsProps) {
  const isAr = locale === "ar";

  /* ── Store reads (reactive selectors) ───────────────────── */
  const cartItems = useCartStore((s) => s.items);
  const cartCount = useCartStore(selectCartTotalItems);
  const wishCount = useWishlistStore(selectWishlistCount);

  /* ── Hydration guard for SSR ─────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── MiniCart hover/click logic ──────────────────────────── */
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMiniCart = () => {
    // Disable hover dropdown on mobile (navigate to /cart instead)
    if (window.innerWidth < 768) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setMiniCartOpen(true);
  };

  const closeMiniCart = () => {
    hoverTimeout.current = setTimeout(() => setMiniCartOpen(false), 200);
  };

  /* ── Close on click outside ─────────────────────────────── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setMiniCartOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Before hydration, show 0 to avoid flash mismatch */
  const displayCartCount = mounted ? cartCount : 0;
  const displayWishCount = mounted ? wishCount : 0;

  return (
    <>
      {/* Wishlist Icon */}
      <Link
        href="/wishlist"
        className="h-[46px] px-2.5 sm:px-3.5 flex items-center gap-2 sm:gap-2.5 border border-border rounded-lg hover:border-text-primary transition-colors bg-background shadow-xs relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={isAr ? `قائمة الرغبات (${displayWishCount})` : `Wishlist (${displayWishCount})`}
      >
        <Heart size={20} strokeWidth={1.8} className="flex-shrink-0" />
        <span className="text-sm font-bold hidden sm:block">{displayWishCount}</span>
        <AnimatePresence>
          {displayWishCount > 0 && (
            <motion.span
              key={`wish-badge-${displayWishCount}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -end-1.5 w-4.5 h-4.5 bg-destructive rounded-full flex items-center justify-center z-10"
            >
              <span className="text-[10px] font-bold text-white leading-none">
                {displayWishCount > 9 ? "9+" : displayWishCount}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Cart Icon + MiniCart */}
      <div
        ref={cartRef}
        className="relative"
        onMouseEnter={openMiniCart}
        onMouseLeave={closeMiniCart}
      >
        <Link
          href="/cart"
          className="h-[46px] px-2.5 sm:px-3.5 flex items-center gap-2 sm:gap-2.5 border border-border rounded-lg hover:border-text-primary transition-colors bg-background shadow-xs relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={isAr ? `سلة التسوق (${displayCartCount})` : `Cart (${displayCartCount})`}
        >
          <ShoppingBag size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-bold hidden sm:block">{displayCartCount}</span>
          <AnimatePresence>
            {displayCartCount > 0 && (
              <motion.span
                key={`cart-badge-${displayCartCount}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -end-1.5 w-4.5 h-4.5 bg-accent rounded-full flex items-center justify-center z-10"
              >
                <span className="text-[10px] font-bold text-white leading-none">
                  {displayCartCount > 9 ? "9+" : displayCartCount}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* MiniCart Dropdown (Desktop Only) */}
        <AnimatePresence>
          {miniCartOpen && mounted && (
            <MiniCart
              items={cartItems}
              locale={locale}
              onClose={() => setMiniCartOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
