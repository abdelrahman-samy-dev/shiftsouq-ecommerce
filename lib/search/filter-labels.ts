/* ══════════════════════════════════════════════════════════════
   Labels for active filters (client-safe, pure)
   ──────────────────────────────────────────────────────────────
   Turns the URL state into removable chips: each chip carries
   its label and the state without it.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { discoveryCopy } from "./copy";
import type { CategoryFacetNode, ColorOption } from "./facets";
import { updateListing, type ListingState } from "./listing-params";
import { parseSizeToken, sizeLabel, SIZE_GROUP_LABELS } from "./sizes";

/** "M", "EU 42", "W32", "8Y", "One size". */
export function sizeChipLabel(token: string, locale: Locale): string {
  const { group, value } = parseSizeToken(token);
  if (group === "shoes") return `EU ${value}`;
  if (group === "waist") return locale === "ar" ? `${SIZE_GROUP_LABELS.waist.ar} ${value}` : `W${value}`;
  if (group === "one_size") return SIZE_GROUP_LABELS.one_size[locale];
  return sizeLabel(value, locale);
}

/** "EGP 100 – 250", "Under EGP 150", "EGP 400 and above". */
export function priceRangeLabel(min: number | null, max: number | null, locale: Locale): string {
  const copy = discoveryCopy(locale);
  if (min !== null && max !== null) return copy.priceRange(formatPrice(min, locale), formatPrice(max, locale));
  if (max !== null) return copy.priceUnder(formatPrice(max, locale));
  if (min !== null) return copy.priceOver(formatPrice(min, locale));
  return "";
}

export interface ActiveChip {
  key: string;
  label: string;
  next: ListingState;
  swatch?: string | null;
}

function findCategory(nodes: CategoryFacetNode[], slug: string): CategoryFacetNode | null {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const child = findCategory(n.children, slug);
    if (child) return child;
  }
  return null;
}

export function activeChips(
  state: ListingState,
  options: { categories: CategoryFacetNode[]; colors: ColorOption[] },
  locale: Locale,
): ActiveChip[] {
  const copy = discoveryCopy(locale);
  const chips: ActiveChip[] = [];

  for (const slug of state.categories) {
    const node = findCategory(options.categories, slug);
    chips.push({
      key: `category:${slug}`,
      label: node ? (locale === "ar" ? node.name_ar : node.name_en) : slug,
      next: updateListing(state, { categories: state.categories.filter((c) => c !== slug) }),
    });
  }
  for (const token of state.sizes) {
    chips.push({
      key: `size:${token}`,
      label: sizeChipLabel(token, locale),
      next: updateListing(state, { sizes: state.sizes.filter((s) => s !== token) }),
    });
  }
  for (const name of state.colors) {
    const option = options.colors.find((c) => c.name_en.toLowerCase() === name.toLowerCase());
    chips.push({
      key: `color:${name}`,
      label: option ? (locale === "ar" ? option.name_ar : option.name_en) : name,
      swatch: option?.hex ?? null,
      next: updateListing(state, { colors: state.colors.filter((c) => c !== name) }),
    });
  }
  if (state.min !== null || state.max !== null) {
    chips.push({
      key: "price",
      label: priceRangeLabel(state.min, state.max, locale),
      next: updateListing(state, { min: null, max: null }),
    });
  }
  if (state.inStock) chips.push({ key: "stock", label: copy.inStockOnly, next: updateListing(state, { inStock: false }) });
  if (state.onSale) chips.push({ key: "sale", label: copy.onSale, next: updateListing(state, { onSale: false }) });
  if (state.isNew) chips.push({ key: "new", label: copy.newOnly, next: updateListing(state, { isNew: false }) });
  return chips;
}
