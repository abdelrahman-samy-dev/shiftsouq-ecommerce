"use server";

/* ══════════════════════════════════════════════════════════════
   Wishlist Server Actions
   ──────────────────────────────────────────────────────────────
   Server-side actions for fetching wishlist product data.
   Keeps the Supabase/DAL logic on the server while allowing
   client components to fetch data on demand.
   ══════════════════════════════════════════════════════════════ */

import { getProductsByIds } from "@/lib/dal/products";
import type { ProductWithDetails } from "@/lib/types";

/**
 * Fetches full product details for an array of product IDs.
 * Called from the WishlistPageContent client component.
 *
 * @param productIds - Array of product UUIDs from the wishlist store.
 * @returns Array of ProductWithDetails matching the IDs.
 */
export async function fetchWishlistProducts(
  productIds: string[]
): Promise<ProductWithDetails[]> {
  if (!productIds || productIds.length === 0) return [];
  return getProductsByIds(productIds);
}
