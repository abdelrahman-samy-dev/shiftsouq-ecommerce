/* ══════════════════════════════════════════════════════════════
   Listing loader (server only)
   ──────────────────────────────────────────────────────────────
   One place that turns "where am I" (shop, search, a category, a
   collection) plus the URL state into a database query, and
   loads cards, facets and the category options for the filters.
   Used by the listing pages and the /api/search/* handlers, so
   "Load more" and live filter counts always agree with the page.
   ══════════════════════════════════════════════════════════════ */

import "server-only";

import type { Category } from "@/lib/types";
import { getCategories, getCategoryBySlug } from "@/lib/dal/categories";
import { getCollectionBySlug, type Collection } from "@/lib/dal/collections";
import { getListingFacets, searchListing, type ListingQuery } from "@/lib/dal/products";
import { buildCategoryFacetTree, type CategoryFacetNode, type CategoryLike, type ListingFacets } from "./facets";
import { LISTING_PAGE_SIZE, type ListingState } from "./listing-params";
import { toGridProduct, type GridProduct } from "./card";

export type ListingScope =
  | { kind: "shop" }
  | { kind: "search" }
  | { kind: "category"; category: Category }
  | { kind: "collection"; collection: Collection };

/** Scope as a URL value for the API handlers: "shop", "search", "category:slug", "collection:slug". */
export function scopeToParam(scope: ListingScope): string {
  if (scope.kind === "category") return `category:${scope.category.slug}`;
  if (scope.kind === "collection") return `collection:${scope.collection.slug}`;
  return scope.kind;
}

export async function scopeFromParam(value: string | null): Promise<ListingScope | null> {
  if (!value || value === "shop") return { kind: "shop" };
  if (value === "search") return { kind: "search" };
  const [kind, slug] = [value.slice(0, value.indexOf(":")), value.slice(value.indexOf(":") + 1)];
  if (!slug || slug.length > 120) return null;
  if (kind === "category") {
    const category = await getCategoryBySlug(slug);
    return category ? { kind: "category", category } : null;
  }
  if (kind === "collection") {
    const collection = await getCollectionBySlug(slug);
    return collection ? { kind: "collection", collection } : null;
  }
  return null;
}

/** Categories the filter offers: below the current category, or the whole tree. */
async function categoryOptionsTree(scope: ListingScope): Promise<CategoryLike[]> {
  const tree = await getCategories();
  if (scope.kind === "category") {
    const id = scope.category.id;
    const node = tree.find((c) => c.id === id) ?? tree.flatMap((c) => c.children).find((c) => c.id === id);
    const children = node && "children" in node ? (node.children as Category[]) : [];
    return children.map((c) => ({ id: c.id, slug: c.slug, name_en: c.name_en, name_ar: c.name_ar }));
  }
  return tree.map((c) => ({
    id: c.id,
    slug: c.slug,
    name_en: c.name_en,
    name_ar: c.name_ar,
    children: c.children.map((k) => ({ id: k.id, slug: k.slug, name_en: k.name_en, name_ar: k.name_ar })),
  }));
}

function flatten(nodes: CategoryLike[]): CategoryLike[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

export async function listingQueryFor(scope: ListingScope, state: ListingState): Promise<ListingQuery> {
  let categoryIds: string[] | undefined;
  if (state.categories.length > 0) {
    const options = flatten(await categoryOptionsTree(scope));
    categoryIds = options.filter((c) => state.categories.includes(c.slug)).map((c) => c.id);
  }
  return {
    q: state.q || undefined,
    scopeCategoryIds: scope.kind === "category" ? [scope.category.id] : undefined,
    collectionId: scope.kind === "collection" ? scope.collection.id : undefined,
    categoryIds,
    sizes: state.sizes,
    colors: state.colors,
    priceMin: state.min,
    priceMax: state.max,
    inStock: state.inStock,
    onSale: state.onSale,
    isNew: state.isNew,
    sort: state.sort,
  };
}

export interface ListingPage {
  products: GridProduct[];
  total: number;
}

export interface ListingFilters {
  facets: ListingFacets;
  categoryOptions: CategoryFacetNode[];
}

/** Top-level categories to suggest from empty states (featured first). */
export async function popularCategories(): Promise<{ slug: string; name_en: string; name_ar: string }[]> {
  const tree = await getCategories();
  const featured = (c: Category) => Boolean((c as Category & { is_featured?: boolean }).is_featured);
  return [...tree]
    .sort((a, b) => Number(featured(b)) - Number(featured(a)))
    .slice(0, 8)
    .map((c) => ({ slug: c.slug, name_en: c.name_en, name_ar: c.name_ar }));
}

/** Cards for the requested page and the total (pages and "Load more"). */
export async function loadListingPage(scope: ListingScope, state: ListingState): Promise<ListingPage> {
  const query = await listingQueryFor(scope, state);
  const listing = await searchListing(query, state.page, LISTING_PAGE_SIZE);
  return { products: listing.products.map(toGridProduct), total: listing.total };
}

/** Filter options and counts (toolbar, drawer, live counts). */
export async function loadListingFacets(scope: ListingScope, state: ListingState): Promise<ListingFilters> {
  const query = await listingQueryFor(scope, state);
  const [facets, tree] = await Promise.all([getListingFacets(query), categoryOptionsTree(scope)]);
  return { facets, categoryOptions: buildCategoryFacetTree(tree, facets.categories) };
}
