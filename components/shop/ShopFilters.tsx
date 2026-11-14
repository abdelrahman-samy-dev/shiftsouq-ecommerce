/* ══════════════════════════════════════════════════════════════
   ShopFilters — Sidebar Filters Component
   
   Renders category list, price range inputs, and size toggles.
   All filter state is URL-driven via searchParams for SSR/link sharing.
   
   On mobile: hidden by default, toggled via parent's state.
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryWithChildren } from "@/lib/types";

/* ── Types ──────────────────────────────────────────────────── */

interface ShopFiltersProps {
  categories: CategoryWithChildren[];
  locale: string;
  basePath?: string;
  /** When provided, only these sizes are shown. If empty array, the size section is hidden entirely. */
  availableSizes?: string[] | null;
  /** Available colors for the current category or context. */
  availableColors?: { en: string; ar: string; hex: string }[] | null;
  /** Explicitly passed active category (used on dedicated category pages). */
  currentCategorySlug?: string;
}

/* ── Component ─────────────────────────────────────────────── */

export default function ShopFilters({
  categories,
  locale,
  basePath = "/shop",
  availableSizes: availableSizesProp,
  availableColors,
  currentCategorySlug,
}: ShopFiltersProps) {
  const isAr = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /* ── Derive current filter state from URL/Props ──────── */
  const activeCategory = currentCategorySlug || searchParams.get("category") || "";
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";
  const sizesParam = searchParams.get("sizes");
  const colorsParam = searchParams.get("colors");
  const activeSizes = useMemo(() => sizesParam?.split(",").filter(Boolean) ?? [], [sizesParam]);
  const activeColors = useMemo(() => colorsParam?.split(",").filter(Boolean) ?? [], [colorsParam]);

  /* Local state for price inputs (so they don't jump while typing) */
  const [minPrice, setMinPrice] = useState(activeMinPrice);
  const [maxPrice, setMaxPrice] = useState(activeMaxPrice);

  /* ── URL Update Helper ──────────────────────────────── */
  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Always reset to page 1 when filters change
      params.delete("page");

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${basePath}?${qs}` : basePath);
      });
    },
    [searchParams, router, basePath, startTransition]
  );

  /* ── Category Click ─────────────────────────────────── */
  const handleCategoryClick = useCallback(
    (slug: string) => {
      if (basePath.startsWith("/category/")) {
        // If we are on a dedicated category page, clicking a category routes to that page.
        if (slug === activeCategory) {
          // Deselecting the category takes us back to the general shop
          startTransition(() => {
            router.push("/shop");
          });
        } else {
          startTransition(() => {
            router.push(`/category/${slug}`);
          });
        }
      } else {
        // We are on /shop, just update search params
        pushParams({
          category: slug === activeCategory ? null : slug,
        });
      }
    },
    [pushParams, activeCategory, basePath, router, startTransition]
  );

  /* ── Size Toggle ────────────────────────────────────── */
  const handleSizeToggle = useCallback(
    (size: string) => {
      const newSizes = activeSizes.includes(size)
        ? activeSizes.filter((s) => s !== size)
        : [...activeSizes, size];

      pushParams({
        sizes: newSizes.length > 0 ? newSizes.join(",") : null,
      });
    },
    [pushParams, activeSizes]
  );

  /* ── Color Toggle ───────────────────────────────────── */
  const handleColorToggle = useCallback(
    (colorEn: string) => {
      const newColors = activeColors.includes(colorEn)
        ? activeColors.filter((c) => c !== colorEn)
        : [...activeColors, colorEn];

      pushParams({
        colors: newColors.length > 0 ? newColors.join(",") : null,
      });
    },
    [pushParams, activeColors]
  );

  /* ── Price Range Apply ──────────────────────────────── */
  const handlePriceApply = useCallback(() => {
    pushParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
  }, [pushParams, minPrice, maxPrice]);

  /* ── Price Range on Enter ───────────────────────────── */
  const handlePriceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handlePriceApply();
      }
    },
    [handlePriceApply]
  );

  /* ── Clear All Filters ──────────────────────────────── */
  const hasActiveFilters =
    activeCategory || activeMinPrice || activeMaxPrice || activeSizes.length > 0 || activeColors.length > 0;

  const handleClearAll = useCallback(() => {
    // Keep only sort param if present
    const sort = searchParams.get("sort");
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    setMinPrice("");
    setMaxPrice("");
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }, [searchParams, router, basePath, startTransition]);

  return (
    <aside
      className={`shop-filters ${isPending ? "shop-filters-pending" : ""}`}
      aria-label={isAr ? "فلاتر المنتجات" : "Product Filters"}
    >
      {/* ── Clear Filters ─────────────────────────────── */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearAll}
          className="shop-filters-clear"
        >
          {isAr ? "مسح الكل" : "Clear All"}
        </button>
      )}

      {/* ── Category Filter ───────────────────────────── */}
      <div className="shop-filter-section">
        <h3 className="shop-filter-title">
          {isAr ? "الفئة" : "Category"}
        </h3>
        <ul className="shop-filter-list" role="listbox" aria-label="Categories">
          {categories.map((cat) => {
            const isActive = cat.slug === activeCategory;
            const name = isAr ? cat.name_ar : cat.name_en;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`shop-filter-item ${isActive ? "shop-filter-item-active" : ""}`}
                >
                  {name}
                </button>
                {/* Sub-categories */}
                {cat.children && cat.children.length > 0 && (
                  <ul className="shop-filter-sublist">
                    {cat.children.map((child) => {
                      const isChildActive = child.slug === activeCategory;
                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isChildActive}
                            onClick={() => handleCategoryClick(child.slug)}
                            className={`shop-filter-item shop-filter-subitem ${isChildActive ? "shop-filter-item-active" : ""}`}
                          >
                            {isAr ? child.name_ar : child.name_en}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="divider" />

      {/* ── Price Range ────────────────────────────────── */}
      <div className="shop-filter-section">
        <h3 className="shop-filter-title">
          {isAr ? "السعر" : "Price"}
        </h3>

        {/* Price Inputs */}
        <div className="shop-price-inputs">
          <div className="shop-price-field">
            <input
              type="number"
              placeholder={isAr ? "من" : "Min"}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyDown={handlePriceKeyDown}
              className="shop-price-input"
              min={0}
              aria-label="Minimum price"
            />
          </div>
          <span className="shop-price-separator">–</span>
          <div className="shop-price-field">
            <input
              type="number"
              placeholder={isAr ? "إلى" : "Max"}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onKeyDown={handlePriceKeyDown}
              className="shop-price-input"
              min={0}
              aria-label="Maximum price"
            />
          </div>
          <button
            type="button"
            onClick={handlePriceApply}
            className="shop-price-apply"
            aria-label="Apply price filter"
          >
            {isAr ? "طبق" : "Go"}
          </button>
        </div>
      </div>

      {/* ── Dynamic Size Filter ─────────────────────────── */}
      {availableSizesProp && availableSizesProp.length > 0 && (
        <>
          <div className="divider" />
          <div className="shop-filter-section">
            <h3 className="shop-filter-title">
              {isAr ? "المقاس" : "Size"}
            </h3>
            <div className="shop-size-grid">
              {availableSizesProp.map((size) => {
                const isActive = activeSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeToggle(size)}
                    className={`shop-size-btn ${isActive ? "shop-size-btn-active" : ""}`}
                    aria-pressed={isActive}
                    aria-label={`Size ${size}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Dynamic Color Filter ────────────────────────── */}
      {availableColors && availableColors.length > 0 && (
        <>
          <div className="divider" />
          <div className="shop-filter-section">
            <h3 className="shop-filter-title">
              {isAr ? "اللون" : "Color"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => {
                const isActive = activeColors.includes(color.en);
                return (
                  <button
                    key={color.en}
                    type="button"
                    onClick={() => handleColorToggle(color.en)}
                    className={`relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      isActive ? "border-primary scale-110" : "border-border"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-pressed={isActive}
                    aria-label={`Color ${isAr ? color.ar : color.en}`}
                    title={isAr ? color.ar : color.en}
                  >
                    {isActive && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
