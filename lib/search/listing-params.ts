/* ══════════════════════════════════════════════════════════════
   Listing URL state (client-safe, pure)
   ──────────────────────────────────────────────────────────────
   Every listing (shop, category, collection, search) keeps its
   whole state in the URL so links can be shared and reloaded:

     q         search text
     category  category slug (repeatable)
     size      "group.value", e.g. size=apparel.M&size=shoes.42
     color     colour name, e.g. color=Black (repeatable)
     min, max  effective price range (what buyers pay)
     stock=1   in stock only        sale=1  on sale only
     new=1     new arrivals         sort    see LISTING_SORTS
     page      page number          view=2  two-up editorial grid

   Older links keep working: sizes=/colors= (comma lists),
   minPrice=/maxPrice=, isNew=true and sort=popular.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export const LISTING_SORTS = ["relevance", "newest", "price_asc", "price_desc", "bestselling"] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

/** Products per listing page. */
export const LISTING_PAGE_SIZE = 24;
export const MAX_PAGE = 500;
const MAX_VALUES = 30;
const MAX_VALUE_LENGTH = 60;
const MAX_QUERY_LENGTH = 100;

export interface ListingState {
  q: string;
  categories: string[];
  sizes: string[];
  colors: string[];
  min: number | null;
  max: number | null;
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  sort: ListingSort;
  page: number;
  /** Desktop grid density: 4 per row, or 2 (editorial). */
  view: 2 | 4;
}

export const EMPTY_LISTING_STATE: ListingState = {
  q: "",
  categories: [],
  sizes: [],
  colors: [],
  min: null,
  max: null,
  inStock: false,
  onSale: false,
  isNew: false,
  sort: "relevance",
  page: 1,
  view: 4,
};

export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function all(params: RawSearchParams, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const v = params[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

function first(params: RawSearchParams, key: string): string | undefined {
  return all(params, key)[0];
}

function cleanValues(values: string[], split = false): string[] {
  const out: string[] = [];
  for (const raw of values) {
    for (const part of split ? raw.split(",") : [raw]) {
      const v = part.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, MAX_VALUE_LENGTH);
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out.slice(0, MAX_VALUES);
}

function price(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

const truthy = (v: string | undefined) => v === "1" || v === "true";

/** Reads listing state from search params (unknown or invalid values are dropped). */
export function parseListingParams(params: RawSearchParams): ListingState {
  const q = (first(params, "q") ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);

  let min = price(first(params, "min") ?? first(params, "minPrice"));
  let max = price(first(params, "max") ?? first(params, "maxPrice"));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  const rawSort = first(params, "sort");
  const sort: ListingSort =
    rawSort === "popular" ? "bestselling" : LISTING_SORTS.includes(rawSort as ListingSort) ? (rawSort as ListingSort) : "relevance";

  const pageNumber = Number.parseInt(first(params, "page") ?? "1", 10);

  return {
    q,
    categories: cleanValues(all(params, "category"), true).filter((s) => /^[\p{L}\p{N}_-]+$/u.test(s)),
    sizes: cleanValues([...all(params, "size"), ...all(params, "sizes").flatMap((v) => v.split(","))]),
    colors: cleanValues([...all(params, "color"), ...all(params, "colors").flatMap((v) => v.split(","))]),
    min,
    max,
    inStock: truthy(first(params, "stock")),
    onSale: truthy(first(params, "sale")),
    isNew: truthy(first(params, "new")) || truthy(first(params, "isNew")),
    sort,
    page: Number.isFinite(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, MAX_PAGE) : 1,
    view: first(params, "view") === "2" ? 2 : 4,
  };
}

const formatNumber = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Canonical query string for a state (defaults omitted, stable order). */
export function listingSearchParams(state: ListingState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  for (const c of state.categories) p.append("category", c);
  for (const s of state.sizes) p.append("size", s);
  for (const c of state.colors) p.append("color", c);
  if (state.min !== null) p.set("min", formatNumber(state.min));
  if (state.max !== null) p.set("max", formatNumber(state.max));
  if (state.inStock) p.set("stock", "1");
  if (state.onSale) p.set("sale", "1");
  if (state.isNew) p.set("new", "1");
  if (state.sort !== "relevance") p.set("sort", state.sort);
  if (state.view === 2) p.set("view", "2");
  if (state.page > 1) p.set("page", String(state.page));
  return p;
}

export function listingHref(basePath: string, state: ListingState): string {
  const qs = listingSearchParams(state).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** A new state with changes applied; any filter or sort change goes back to page 1. */
export function updateListing(state: ListingState, patch: Partial<ListingState>): ListingState {
  const keepsPage = Object.keys(patch).every((k) => k === "page" || k === "view");
  return { ...state, ...(keepsPage ? {} : { page: 1 }), ...patch };
}

export function toggleValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Filters a buyer chose (search text, sort, page and view are not filters). */
export function activeFilterCount(state: ListingState): number {
  return (
    state.categories.length +
    state.sizes.length +
    state.colors.length +
    (state.min !== null || state.max !== null ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    (state.onSale ? 1 : 0) +
    (state.isNew ? 1 : 0)
  );
}

/** Same state without any filter (keeps search text and view). */
export function clearFilters(state: ListingState): ListingState {
  return { ...EMPTY_LISTING_STATE, q: state.q, sort: state.sort, view: state.view };
}

/** Identity of a result set: changes when anything but page or view changes. */
export function resultKey(state: ListingState): string {
  return listingSearchParams({ ...state, page: 1, view: 4 }).toString();
}

/** Page links around the current page: 1 … 4 5 6 … 12 (null = gap). */
export function pageWindow(current: number, count: number): (number | null)[] {
  const pages = Array.from(new Set([1, count, current - 1, current, current + 1]))
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

export const SORT_LABELS: Record<ListingSort, Record<Locale, string>> = {
  relevance: { en: "Featured", ar: "المميزة" },
  newest: { en: "Newest", ar: "الأحدث" },
  price_asc: { en: "Price: low to high", ar: "السعر: من الأقل إلى الأعلى" },
  price_desc: { en: "Price: high to low", ar: "السعر: من الأعلى إلى الأقل" },
  bestselling: { en: "Best selling", ar: "الأكثر مبيعًا" },
};

/** "Featured" becomes "Most relevant" while searching. */
export function sortLabel(sort: ListingSort, locale: Locale, searching: boolean): string {
  if (sort === "relevance" && searching) return locale === "ar" ? "الأكثر صلة" : "Most relevant";
  return SORT_LABELS[sort][locale];
}
