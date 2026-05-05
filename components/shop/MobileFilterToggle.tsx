/* ══════════════════════════════════════════════════════════════
   MobileFilterToggle — Filter button + slide-over drawer (mobile)
   
   Shows a filter icon button on mobile/tablet. When clicked,
   opens a slide-over panel containing ShopFilters.
   Hidden on desktop (lg breakpoint) where the sidebar is visible.

   Accepts an optional `availableSizes` prop to forward to
   ShopFilters, ensuring category-aware size filtering on mobile.
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useState, useCallback, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import ShopFilters from "./ShopFilters";
import type { CategoryWithChildren } from "@/lib/types";

interface MobileFilterToggleProps {
  categories: CategoryWithChildren[];
  locale: string;
  basePath?: string;
  /** Forward to ShopFilters so the mobile drawer hides sizes for non-clothing categories */
  availableSizes?: string[] | null;
  /** Forward to ShopFilters so the mobile drawer shows available colors */
  availableColors?: { en: string; ar: string; hex: string }[] | null;
  /** Explicitly passed active category (used on dedicated category pages). */
  currentCategorySlug?: string;
}

export default function MobileFilterToggle({
  categories,
  locale,
  basePath,
  availableSizes,
  availableColors,
  currentCategorySlug,
}: MobileFilterToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAr = locale === "ar";

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /* Lock body scroll when drawer is open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* ── Trigger Button (visible only on mobile/tablet) ─── */}
      <button
        type="button"
        onClick={open}
        className="mobile-filter-trigger lg:hidden"
        aria-label={isAr ? "فتح الفلاتر" : "Open filters"}
      >
        <SlidersHorizontal size={18} strokeWidth={2} />
      </button>

      {/* ── Backdrop + Drawer ─────────────────────────────── */}
      {isOpen && (
        <div className="mobile-filter-overlay" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="mobile-filter-backdrop"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="mobile-filter-drawer">
            {/* Drawer Header */}
            <div className="mobile-filter-drawer-header">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {isAr ? "الفلاتر" : "Filters"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="btn-icon w-10 h-10"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="mobile-filter-drawer-content">
              <ShopFilters
                categories={categories}
                locale={locale}
                basePath={basePath}
                availableSizes={availableSizes}
                availableColors={availableColors}
                currentCategorySlug={currentCategorySlug}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
