"use client";

/* ══════════════════════════════════════════════════════════════
   SearchBar — Professional Autocomplete Search Component
   
   Features:
   - Debounced input (300ms) to minimize server calls
   - Arabic text normalization (أ→ا, ى→ي, ة→ه)
   - Category filter dropdown
   - Autocomplete suggestions panel with products & categories
   - Keyboard navigation (↑↓ Enter Escape)
   - Click outside to close
   - Loading skeleton states
   - Full dark mode + RTL support
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ChevronDown, Loader2, Tag, ArrowRight, TrendingUp, Clock } from "lucide-react";
import { searchAction } from "@/lib/search/search-action";
import type { SearchResponse, SearchResultProduct, SearchResultCategory } from "@/lib/search/search-action";
import type { CategoryWithChildren, Locale } from "@/lib/types";
import { formatPrice as formatPriceUtil } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────── */

interface SearchBarProps {
  locale: Locale;
  categories: CategoryWithChildren[];
  dict: {
    searchPlaceholder: string;
    searchAll: string;
    noResults: string;
    products: string;
    categoriesLabel: string;
    viewAllResults: string;
    trending: string;
    recentSearches: string;
    clearRecent: string;
    clearSearch: string;
    submit: string;
    categoryFilter: string;
  };
}

/* ── Constants ──────────────────────────────────────────────── */

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;
const RECENT_SEARCHES_KEY = "shiftsouq_recent_searches";
const MAX_RECENT_SEARCHES = 5;

/* ── Debounce Hook ──────────────────────────────────────────── */

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ── Recent Searches (localStorage) ─────────────────────────── */

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const current = getRecentSearches();
    // Use a Set-like dedup approach — move to front if exists
    const filtered = current.filter((s) => s !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch { /* noop */ }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch { /* noop */ }
}

/* ── Component ──────────────────────────────────────────────── */

export function SearchBar({ locale, categories, dict }: SearchBarProps) {
  const router = useRouter();
  const isAr = locale === "ar";

  /* ── State ─────────────────────────────────────────────── */
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  /** Last finished search, tagged with the query/category it answers. */
  const [settled, setSettled] = useState<{ key: string; data: SearchResponse | null }>({ key: "", data: null });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  /* ── Refs ──────────────────────────────────────────────── */
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  /* ── Derived ──────────────────────────────────────────── */
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const searchKey =
    debouncedQuery.trim().length >= MIN_QUERY_LENGTH ? `${debouncedQuery}\u0000${selectedCategory ?? ""}` : "";
  const isLoading = searchKey !== "" && settled.key !== searchKey;
  const results = searchKey !== "" && settled.key === searchKey ? settled.data : null;
  const showSuggestions = isFocused && (hasQuery || recentSearches.length > 0);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return dict.searchAll;
    const cat = categories.find((c) => c.slug === selectedCategory);
    return cat ? (isAr ? cat.name_ar : cat.name_en) : dict.searchAll;
  }, [selectedCategory, categories, isAr, dict.searchAll]);

  // Flatten all navigable items for keyboard nav
  const flatItems = useMemo(() => {
    if (!results) return [];
    const items: Array<{ type: "category" | "product"; data: SearchResultCategory | SearchResultProduct }> = [];
    results.categories.forEach((c) => items.push({ type: "category", data: c }));
    results.products.forEach((p) => items.push({ type: "product", data: p }));
    return items;
  }, [results]);

  /* ── Execute search when debounced query changes ──────── */
  useEffect(() => {
    if (!searchKey) return;

    let cancelled = false;
    const settle = (data: SearchResponse | null) => {
      if (cancelled) return;
      setSettled({ key: searchKey, data });
      setActiveIndex(-1);
    };

    searchAction(debouncedQuery, selectedCategory || undefined)
      .then(settle)
      .catch(() => settle(null));

    return () => { cancelled = true; };
  }, [searchKey, debouncedQuery, selectedCategory]);

  /* ── Close on outside click ───────────────────────────── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Handlers ─────────────────────────────────────────── */

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    setRecentSearches(getRecentSearches());
    setIsFocused(false);

    const params = new URLSearchParams({ q: query.trim() });
    if (selectedCategory) params.set("category", selectedCategory);
    router.push(`/shop?${params.toString()}`);
  }, [query, selectedCategory, router]);

  const handleClear = useCallback(() => {
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleSelectCategory = useCallback((slug: string | null) => {
    setSelectedCategory(slug);
    setShowCategoryDropdown(false);
    inputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  /* ── Keyboard Navigation ──────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = flatItems.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < totalItems) {
            const item = flatItems[activeIndex];
            if (item.type === "category") {
              router.push(`/category/${item.data.slug}`);
            } else {
              router.push(`/product/${item.data.slug}`);
            }
            setIsFocused(false);
          } else {
            handleSubmit();
          }
          break;
        case "Escape":
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [flatItems, activeIndex, handleSubmit, router]
  );

  /* ── Scroll active item into view ─────────────────────── */
  useEffect(() => {
    if (activeIndex < 0 || !suggestionsRef.current) return;
    const el = suggestionsRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /* ── Render Helper: Price ─────────────────────────────── */
  const formatPrice = (price: number) => formatPriceUtil(price, locale);

  /* ── Render ───────────────────────────────────────────── */

  let itemIndex = -1;

  return (
    <div ref={containerRef} className="flex-1 max-w-3xl hidden lg:flex items-center relative group">

      {/* ─── Search Input Container ─────────────────────── */}
      <div
        className={`w-full flex items-center border rounded-full bg-background transition-all duration-300 h-[48px] ${
          isFocused
            ? "border-primary ring-[3px] ring-primary/10 shadow-md"
            : "border-border hover:border-text-faint shadow-sm"
        }`}
      >
        {/* Category Filter Dropdown */}
        <div ref={categoryDropdownRef} className="relative h-full">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="px-5 h-full border-e border-border text-sm flex items-center gap-2 cursor-pointer bg-surface-elevated/40 hover:bg-surface-elevated transition-colors text-text-primary min-w-[120px] justify-between rounded-s-full focus:outline-none focus-visible:outline-none"
            type="button"
            aria-expanded={showCategoryDropdown}
            aria-haspopup="listbox"
            aria-label={`${dict.categoryFilter}: ${selectedCategoryName}`}
            id="search-category-filter"
          >
            <span className="font-medium truncate max-w-[80px]">{selectedCategoryName}</span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`text-text-faint transition-transform duration-200 flex-shrink-0 ${showCategoryDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {/* Category Dropdown Menu */}
          {showCategoryDropdown && (
            <div
              className="dropdown-panel absolute top-full start-0 mt-2 w-60 z-[60] py-1.5 animate-scale-in origin-top"
              role="listbox"
            >
              <button
                onClick={() => handleSelectCategory(null)}
                className={`w-full text-start block px-4 py-2.5 text-sm transition-colors ${
                  !selectedCategory
                    ? "text-text-primary font-semibold bg-surface-elevated"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                }`}
                role="option"
                aria-selected={!selectedCategory}
              >
                {dict.searchAll}
              </button>
              <div className="divider-subtle mx-3 my-1" />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`w-full text-start block px-4 py-2.5 text-sm transition-colors ${
                    selectedCategory === cat.slug
                      ? "text-text-primary font-semibold bg-surface-elevated"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                  }`}
                  role="option"
                  aria-selected={selectedCategory === cat.slug}
                >
                  {isAr ? cat.name_ar : cat.name_en}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="flex-1 flex items-center h-full relative px-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setRecentSearches(getRecentSearches());
            }}
            onKeyDown={handleKeyDown}
            placeholder={dict.searchPlaceholder}
            className="flex-1 bg-transparent px-3 h-full text-[15px] outline-none placeholder:text-text-faint text-text-primary text-start"
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions"
            aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
            id="search-input"
          />

          {/* Clear / Loading indicator */}
          <div className="flex items-center pe-2 gap-1">
            {isLoading && (
              <Loader2 size={16} className="animate-spin text-text-faint" />
            )}
            {query && !isLoading && (
              <button
                onClick={handleClear}
                className="p-1.5 rounded-full text-text-faint hover:text-text-secondary hover:bg-surface-elevated transition-colors"
                aria-label={dict.clearSearch}
                type="button"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Search Button (Integrated) */}
        <button
          onClick={handleSubmit}
          className="h-full px-6 bg-primary text-primary-foreground hover:opacity-90 active:bg-primary/90 transition-all flex items-center justify-center border-s border-border rounded-e-full"
          type="button"
          aria-label={dict.submit}
          id="search-submit-button"
        >
          <Search size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* ─── Suggestions Dropdown Panel ─────────────────── */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="dropdown-panel absolute top-full inset-x-0 mt-2 rounded-2xl z-[60] animate-scale-in origin-top max-h-[480px] !overflow-y-auto overflow-x-hidden"
          role="listbox"
          id="search-suggestions"
        >
          {/* ── Loading State ─────────────────────────── */}
          {isLoading && hasQuery && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-lg skeleton-block flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 skeleton-block rounded-full w-3/4" />
                    <div className="h-3 skeleton-block rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Recent Searches (when no query) ──────── */}
          {!hasQuery && recentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-text-faint uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} />
                  {dict.recentSearches}
                </span>
                <button
                  onClick={handleClearRecent}
                  className="text-xs font-medium text-text-faint hover:text-destructive transition-colors"
                  type="button"
                >
                  {dict.clearRecent}
                </button>
              </div>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleRecentClick(term)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-surface-elevated transition-colors text-start"
                  type="button"
                >
                  <Clock size={14} className="text-text-faint flex-shrink-0" />
                  <span className="truncate">{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── No Results ────────────────────────────── */}
          {!isLoading && hasQuery && results && results.totalCount === 0 && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-elevated flex items-center justify-center">
                <Search size={24} className="text-text-faint" />
              </div>
              <p className="text-sm font-medium text-text-muted">
                {dict.noResults}
              </p>
              <p className="text-xs text-text-faint mt-1">
                &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* ── Results ───────────────────────────────── */}
          {!isLoading && hasQuery && results && results.totalCount > 0 && (
            <>
              {/* Category Results */}
              {results.categories.length > 0 && (
                <div className="p-3 pb-1">
                  <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                    <Tag size={12} />
                    {dict.categoriesLabel}
                  </h4>
                  {results.categories.map((cat) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        onClick={() => setIsFocused(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeIndex === idx
                            ? "bg-surface-elevated text-text-primary"
                            : "text-text-secondary hover:bg-surface-elevated"
                        }`}
                        data-index={idx}
                        id={`search-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-surface-elevated to-surface-inset flex items-center justify-center flex-shrink-0">
                          <Tag size={16} className="text-text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-text-primary">
                            {isAr ? cat.name_ar : cat.name_en}
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-text-faint flex-shrink-0 rtl:rotate-180" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Separator */}
              {results.categories.length > 0 && results.products.length > 0 && (
                <div className="divider-subtle mx-4" />
              )}

              {/* Product Results */}
              {results.products.length > 0 && (
                <div className="p-3 pt-2">
                  <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                    <TrendingUp size={12} />
                    {dict.products}
                  </h4>
                  {results.products.map((product) => {
                    itemIndex++;
                    const idx = itemIndex;
                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        onClick={() => {
                          saveRecentSearch(query.trim());
                          setIsFocused(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeIndex === idx
                            ? "bg-surface-elevated"
                            : "hover:bg-surface-elevated"
                        }`}
                        data-index={idx}
                        id={`search-item-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        {/* Product Image */}
                        <div className="w-12 h-12 rounded-lg bg-surface-elevated overflow-hidden flex-shrink-0 border border-border">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={isAr ? product.name_ar : product.name_en}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-faint">
                              <Search size={16} />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary truncate leading-tight">
                            {isAr ? product.name_ar : product.name_en}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.brand && (
                              <span className="text-xs text-text-muted truncate">
                                {product.brand}
                              </span>
                            )}
                            {product.category_name_en && (
                              <>
                                {product.brand && <span className="text-text-faint">·</span>}
                                <span className="text-xs text-text-faint truncate">
                                  {isAr ? product.category_name_ar : product.category_name_en}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          {product.sale_price ? (
                            <>
                              <span className="text-sm font-bold text-text-primary">
                                {formatPrice(product.sale_price)}
                              </span>
                              <span className="text-xs text-text-faint line-through">
                                {formatPrice(product.base_price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-text-primary">
                              {formatPrice(product.base_price)}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* View All Results Footer */}
              <div className="border-t border-border p-3">
                <button
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-text-primary bg-surface-elevated hover:bg-surface-inset transition-colors"
                  type="button"
                >
                  {dict.viewAllResults} &ldquo;{query}&rdquo;
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
