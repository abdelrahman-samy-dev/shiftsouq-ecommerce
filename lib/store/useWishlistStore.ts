/* ══════════════════════════════════════════════════════════════
   useWishlistStore — Global Wishlist State (Zustand + Persist)
   ──────────────────────────────────────────────────────────────
   Simple set of productIds persisted to localStorage.
   Toggle-based: calling toggleWishlist with an existing ID removes
   it, calling with a new ID adds it.

   REACTIVITY NOTE: `isWishlisted` and `count` are NOT stored as
   methods — that breaks Zustand selector reactivity. Consumers
   should derive these from `productIds` directly, or use the
   exported pure selector helpers.
   ══════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  /** Array of wishlisted product UUIDs. */
  productIds: string[];
  /** Add or remove a product from the wishlist. */
  toggleWishlist: (productId: string) => void;
  /** Clear the entire wishlist. */
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      productIds: [],

      toggleWishlist: (productId) => {
        set((state) => {
          const exists = state.productIds.includes(productId);
          return {
            productIds: exists
              ? state.productIds.filter((id) => id !== productId)
              : [...state.productIds, productId],
          };
        });
      },

      clearWishlist: () => set({ productIds: [] }),
    }),
    {
      name: "shiftsouq-wishlist",
    }
  )
);

/* ── Derived selectors (pure functions, NOT store methods) ──── */

/**
 * Selector: wishlist item count.
 * Usage: `const count = useWishlistStore(selectWishlistCount);`
 */
export const selectWishlistCount = (state: WishlistState): number =>
  state.productIds.length;
