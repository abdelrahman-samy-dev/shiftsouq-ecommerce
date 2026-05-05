/* ══════════════════════════════════════════════════════════════
   DAL – Stores Repository
   ──────────────────────────────────────────────────────────────
   Data access for store entities. Uses the cookie-free public
   Supabase client + React.cache() for safe server-side use.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type { Store } from "@/lib/types";

/**
 * Fetches all active stores, ordered by rating (highest first).
 *
 * Used in the store listing pages and filter sidebars.
 *
 * @returns Array of active `Store` objects sorted by rating.
 */
export const getStores = cache(async (): Promise<Store[]> => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .order("rating", { ascending: false });

  if (error) {
    console.error("[DAL:getStores]", error.message);
    return [];
  }

  return (data ?? []) as Store[];
});

/**
 * Fetches a single store by its URL slug.
 *
 * Uses `.maybeSingle()` instead of `.single()` to return `null`
 * instead of throwing when no rows match — safer for 404 handling.
 *
 * @param slug - The store's URL-friendly slug.
 * @returns The `Store` object, or `null` if not found.
 */
export const getStoreBySlug = cache(
  async (slug: string): Promise<Store | null> => {
    const supabase = getPublicClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[DAL:getStoreBySlug]", error.message);
      return null;
    }

    return (data as Store) ?? null;
  }
);
