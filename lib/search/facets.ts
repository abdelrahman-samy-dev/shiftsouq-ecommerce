/* ══════════════════════════════════════════════════════════════
   Facets (client-safe, pure)
   ──────────────────────────────────────────────────────────────
   Shapes returned by product_facets() and helpers that turn them
   into what the filters drawer shows: a category tree with
   rolled-up counts, size groups, and price presets built from
   the real spread of prices in the current result set.
   ══════════════════════════════════════════════════════════════ */

import type { SizeGroup, SizeOption } from "./sizes";

export interface ColorOption {
  name_en: string;
  name_ar: string;
  hex: string | null;
  count: number;
}

export interface ListingFacets {
  total: number;
  categories: { id: string; count: number }[];
  sizes: SizeOption[];
  colors: ColorOption[];
  price: { min: number | null; max: number | null; values: number[] };
  inStock: number;
  onSale: number;
}

export const EMPTY_FACETS: ListingFacets = {
  total: 0,
  categories: [],
  sizes: [],
  colors: [],
  price: { min: null, max: null, values: [] },
  inStock: 0,
  onSale: 0,
};

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Validates the JSON from product_facets(); anything malformed becomes empty. */
export function parseFacets(raw: unknown): ListingFacets {
  if (!raw || typeof raw !== "object") return EMPTY_FACETS;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const price = (r.price && typeof r.price === "object" ? r.price : {}) as Record<string, unknown>;
  return {
    total: num(r.total) ?? 0,
    categories: arr(r.categories)
      .filter((c) => typeof c.id === "string")
      .map((c) => ({ id: c.id as string, count: num(c.count) ?? 0 })),
    sizes: arr(r.sizes)
      .filter((s) => typeof s.group === "string" && typeof s.value === "string")
      .map((s) => ({ group: s.group as SizeGroup, value: s.value as string, count: num(s.count) ?? 0 })),
    colors: arr(r.colors)
      .filter((c) => typeof c.name_en === "string")
      .map((c) => ({
        name_en: c.name_en as string,
        name_ar: typeof c.name_ar === "string" && c.name_ar ? (c.name_ar as string) : (c.name_en as string),
        hex: typeof c.hex === "string" && /^#[0-9a-f]{3,8}$/i.test(c.hex) ? (c.hex as string) : null,
        count: num(c.count) ?? 0,
      })),
    price: {
      min: num(price.min),
      max: num(price.max),
      values: (Array.isArray(price.values) ? price.values : []).map(num).filter((n): n is number => n !== null),
    },
    inStock: num(r.in_stock) ?? 0,
    onSale: num(r.on_sale) ?? 0,
  };
}

/* ── Category tree ─────────────────────────────────────────────── */

export interface CategoryLike {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  children?: CategoryLike[];
}

export interface CategoryFacetNode {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  count: number;
  children: CategoryFacetNode[];
}

/**
 * Category options for the drawer: only categories that hold
 * products in scope, each count including its subcategories.
 */
export function buildCategoryFacetTree(
  tree: readonly CategoryLike[],
  counts: readonly { id: string; count: number }[],
): CategoryFacetNode[] {
  const own = new Map(counts.map((c) => [c.id, c.count]));
  const build = (node: CategoryLike): CategoryFacetNode | null => {
    const children = (node.children ?? []).map(build).filter((c): c is CategoryFacetNode => c !== null);
    const inScope = own.has(node.id) || children.length > 0;
    if (!inScope) return null;
    return {
      id: node.id,
      slug: node.slug,
      name_en: node.name_en,
      name_ar: node.name_ar,
      count: (own.get(node.id) ?? 0) + children.reduce((sum, c) => sum + c.count, 0),
      children,
    };
  };
  return tree.map(build).filter((n): n is CategoryFacetNode => n !== null);
}

/* ── Price presets ─────────────────────────────────────────────── */

export interface PricePreset {
  min: number | null;
  max: number | null;
  count: number;
}

/** Rounds to a "nice" step for the price scale (5, 10, 50, 100, 500…). */
function niceStep(spread: number): number {
  if (spread <= 0) return 1;
  const raw = spread / 8;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / pow;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2.5 : unit < 7.5 ? 5 : 10) * pow;
}

/**
 * Up to four ranges ("Under 150", "150 – 250", …, "400 and above")
 * cut at rounded quartiles of the actual prices, each with its count.
 */
export function pricePresets(values: readonly number[]): PricePreset[] {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length < 4) return [];
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  if (hi - lo < 1) return [];
  const step = niceStep(hi - lo);
  const cuts: number[] = [];
  for (const q of [0.25, 0.5, 0.75]) {
    const raw = sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    const cut = Math.round(raw / step) * step;
    if (cut > lo && cut < hi && !cuts.includes(cut)) cuts.push(cut);
  }
  if (cuts.length === 0) return [];
  const edges: (number | null)[] = [null, ...cuts, null];
  const presets: PricePreset[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const min = edges[i];
    const max = edges[i + 1];
    const count = sorted.filter((v) => (min === null || v >= min) && (max === null || v <= max)).length;
    if (count > 0) presets.push({ min, max, count });
  }
  return presets.length > 1 ? presets : [];
}
