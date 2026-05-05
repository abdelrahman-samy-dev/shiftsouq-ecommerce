/* ══════════════════════════════════════════════════════════════
   useCartStore — Global Cart State (Zustand + Persist)
   ──────────────────────────────────────────────────────────────
   Manages the shopping cart state with localStorage persistence.

   Key design: Items are identified by a composite key of
   productId + variantId. This means the same product in two
   different sizes or colors is treated as two separate cart items.
   Adding the same product + variant combo increments quantity.

   REACTIVITY NOTE: Derived values (totalItems, subtotal) are NOT
   stored as methods on the store — that breaks Zustand selector
   reactivity. Instead, consumers compute them from `items` inline.
   Helper selectors are exported below for convenience.
   ══════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ── Types ───────────────────────────────────────────────────── */

/** A single item stored in the cart. */
export interface CartItem {
  /** Composite key: `${productId}__${variantId}` */
  cartKey: string;
  productId: string;
  variantId: string;
  /** Product display name (EN). */
  name_en: string;
  /** Product display name (AR). */
  name_ar: string;
  /** Product URL slug (for linking). */
  slug: string;
  /** Product thumbnail URL. */
  image: string;
  /** Selected size label (e.g. "M", "42"). */
  size: string | null;
  /** Selected color label (EN). */
  color_en: string | null;
  /** Selected color label (AR). */
  color_ar: string | null;
  /** Hex code for color swatch rendering. */
  color_hex: string | null;
  /** Unit price at time of adding. */
  price: number;
  /** Number of units. */
  quantity: number;
  /** Timestamp for "recently added" ordering. */
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  /** Add an item or increment quantity if same variant exists. */
  addItem: (item: Omit<CartItem, "cartKey" | "addedAt">) => void;
  /** Remove a specific item by its composite key. */
  removeItem: (cartKey: string) => void;
  /** Update quantity for a specific cart item. */
  updateQuantity: (cartKey: string, quantity: number) => void;
  /** Clear all items from the cart. */
  clearCart: () => void;
}

/* ── Store ───────────────────────────────────────────────────── */

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const cartKey = `${item.productId}__${item.variantId}`;
        set((state) => {
          const existing = state.items.find((i) => i.cartKey === cartKey);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartKey === cartKey
                  ? { ...i, quantity: i.quantity + item.quantity, addedAt: Date.now() }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, cartKey, addedAt: Date.now() },
            ],
          };
        });
      },

      removeItem: (cartKey) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartKey !== cartKey),
        }));
      },

      updateQuantity: (cartKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.cartKey === cartKey ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "shiftsouq-cart",
    }
  )
);

/* ── Derived selectors (pure functions, NOT store methods) ──── */

/**
 * Selector: total item count (sum of all quantities).
 * Usage: `const count = useCartStore(selectCartTotalItems);`
 */
export const selectCartTotalItems = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

/**
 * Selector: cart subtotal (sum of price × quantity).
 * Usage: `const sub = useCartStore(selectCartSubtotal);`
 */
export const selectCartSubtotal = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
