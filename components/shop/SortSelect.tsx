/* ══════════════════════════════════════════════════════════════
   SortSelect — Premium Custom Dropdown (no native <select>)
   
   Built with custom logic matching the Design System tokens:
   .card-elevated, .dropdown-panel, shadows, and transitions.
   
   URL-driven: On selection, pushes new params to the router.
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface SortOption {
  value: string;
  labelEn: string;
  labelAr: string;
}

interface SortSelectProps {
  locale: string;
  basePath?: string;
}

/* ── Sort Options ──────────────────────────────────────────── */

const SORT_OPTIONS: SortOption[] = [
  { value: "newest",     labelEn: "Newest",             labelAr: "الأحدث" },
  { value: "price_asc",  labelEn: "Price: Low to High", labelAr: "السعر: من الأقل" },
  { value: "price_desc", labelEn: "Price: High to Low", labelAr: "السعر: من الأعلى" },
  { value: "rating",     labelEn: "Top Rated",          labelAr: "الأعلى تقييماً" },
  { value: "popular",    labelEn: "Best Selling",       labelAr: "الأكثر مبيعاً" },
];

/* ── Component ─────────────────────────────────────────────── */

export default function SortSelect({ locale, basePath = "/shop" }: SortSelectProps) {
  const isAr = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Derive current value from URL */
  const currentSort = searchParams.get("sort") || "newest";
  const activeOption = SORT_OPTIONS.find((o) => o.value === currentSort) ?? SORT_OPTIONS[0];

  /* Close on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  /* Handle selection */
  const handleSelect = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "newest") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      // Reset to page 1 when sort changes
      params.delete("page");

      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
      setIsOpen(false);
    },
    [searchParams, router, basePath]
  );

  return (
    <div ref={containerRef} className="sort-select-container">
      {/* ── Trigger Button ──────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="sort-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id="sort-select-trigger"
      >
        <span className="sort-select-label">
          {isAr ? "ترتيب" : "Sort"}
        </span>
        <span className="sort-select-value">
          {isAr ? activeOption.labelAr : activeOption.labelEn}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="sort-select-chevron"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* ── Dropdown Panel ──────────────────────────── */}
      {isOpen && (
        <div
          className="sort-select-dropdown dropdown-panel animate-scale-in"
          role="listbox"
          aria-labelledby="sort-select-trigger"
        >
          {SORT_OPTIONS.map((option) => {
            const isActive = option.value === currentSort;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(option.value)}
                className={`sort-select-option ${isActive ? "sort-select-option-active" : ""}`}
              >
                <span>{isAr ? option.labelAr : option.labelEn}</span>
                {isActive && (
                  <Check size={14} strokeWidth={2.5} className="sort-select-check" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
