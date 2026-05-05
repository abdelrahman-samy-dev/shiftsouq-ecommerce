/* ══════════════════════════════════════════════════════════════
   DAL – Categories Repository
   ──────────────────────────────────────────────────────────────
   Central data-access module for category entities. Follows
   the Repository Pattern — all Supabase interactions are
   confined to this file; consumers only see typed return values.

   Uses the cookie-free public Supabase client + React.cache()
   for per-request deduplication. No unstable_cache, no cookies.

   Design decisions:
   - "Active" categories are computed by checking which category
     IDs have at least one active product. This avoids showing
     empty categories in navigation and filters.
   - `getCategories` returns a tree (parents → children) while
     `getNavCategories` returns a flat top-level list.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type { Category, CategoryWithChildren } from "@/lib/types";

/* ── Private Helpers ─────────────────────────────────────────── */

/**
 * Fetches all categories and active product category IDs in parallel.
 * Shared between `getCategories` and `getNavCategories` to consolidate
 * identical query logic (DRY).
 *
 * @returns Tuple of [allCategories, activeCategoryIdSet].
 */
async function fetchCategoriesWithActivity(): Promise<
  [Category[], Set<string>]
> {
  const supabase = getPublicClient();

  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("category_id")
      .eq("is_active", true),
  ]);

  if (categoriesRes.error) {
    console.error("[DAL:fetchCategoriesWithActivity]", categoriesRes.error.message);
    return [[], new Set()];
  }

  const all = (categoriesRes.data ?? []) as Category[];
  const activeIds = new Set(
    (productsRes.data || []).map((p) => p.category_id)
  );

  return [all, activeIds];
}

/**
 * Determines whether a category (or any of its children) has
 * at least one active product.
 *
 * @param cat       - The category to check.
 * @param allCats   - Full flat list of all categories.
 * @param activeIds - Set of category IDs that have active products.
 * @returns `true` if the category or any child has active products.
 */
function isCategoryActive(
  cat: Category,
  allCats: Category[],
  activeIds: Set<string>
): boolean {
  if (activeIds.has(cat.id)) return true;
  const children = allCats.filter((c) => c.parent_id === cat.id);
  return children.some((c) => activeIds.has(c.id));
}

/* ── Public Repository Methods ───────────────────────────────── */

/**
 * Fetches all categories structured as a tree: parent categories
 * with their `children` array populated.
 *
 * Only includes categories (and children) that have at least one
 * active product — prevents showing empty categories in the UI.
 *
 * Wrapped in `React.cache()` for per-request deduplication.
 *
 * @returns Array of top-level `CategoryWithChildren` objects.
 */
export const getCategories = cache(
  async (): Promise<CategoryWithChildren[]> => {
    const [all, activeIds] = await fetchCategoriesWithActivity();

    const topLevel = all.filter(
      (c) => c.parent_id === null && isCategoryActive(c, all, activeIds)
    );

    return topLevel.map((parent) => ({
      ...parent,
      children: all.filter(
        (c) =>
          c.parent_id === parent.id && isCategoryActive(c, all, activeIds)
      ),
    }));
  }
);

/**
 * Fetches top-level navigation categories (flat list, no children).
 *
 * Used in the header navigation bar and footer where we only need
 * the parent category names and slugs — no sub-category tree.
 *
 * Only includes categories that have at least one active product
 * (directly or through a child category).
 *
 * @returns Flat array of top-level `Category` objects.
 */
export const getNavCategories = cache(async (): Promise<Category[]> => {
  const [all, activeIds] = await fetchCategoriesWithActivity();

  return all.filter(
    (c) => c.parent_id === null && isCategoryActive(c, all, activeIds)
  );
});

/**
 * Fetches a single category by its URL slug.
 *
 * Wrapped in `React.cache()` so `generateMetadata` and page
 * component can call it without duplicate DB queries.
 *
 * @param slug - The category's URL-friendly slug.
 * @returns The `Category` object, or `null` if not found.
 */
export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    try {
      const supabase = getPublicClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error("[DAL:getCategoryBySlug]", error.message);
        return null;
      }

      return data as Category | null;
    } catch (err) {
      console.error("[DAL:getCategoryBySlug] unexpected:", err);
      return null;
    }
  }
);

/**
 * Fetches a category and all its descendant IDs (parent + children).
 *
 * Used by the category page to fetch products belonging to a parent
 * category AND any of its sub-categories, ensuring complete results.
 *
 * @param slug - The parent category's URL slug.
 * @returns Object with `category` and `ids` array, or `null` if slug not found.
 *
 * @example
 * ```ts
 * const result = await getCategoryWithDescendantIds("men");
 * // result.ids → ["uuid-men", "uuid-shirts", "uuid-pants", ...]
 * ```
 */
export const getCategoryWithDescendantIds = cache(
  async (
    slug: string
  ): Promise<{ category: Category; ids: string[] } | null> => {
    try {
      const supabase = getPublicClient();

      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (catErr || !cat) {
        if (catErr)
          console.error(
            "[DAL:getCategoryWithDescendantIds]",
            catErr.message
          );
        return null;
      }

      const category = cat as Category;

      const { data: children } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", category.id);

      const ids = [
        category.id,
        ...(children ?? []).map((c) => (c as { id: string }).id),
      ];

      return { category, ids };
    } catch (err) {
      console.error("[DAL:getCategoryWithDescendantIds] unexpected:", err);
      return null;
    }
  }
);
