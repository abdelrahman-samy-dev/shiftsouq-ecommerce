/* ══════════════════════════════════════════════════════════════
   Cart re-validation — pure rules (browser + tests)
   ──────────────────────────────────────────────────────────────
   The bag lives in the browser and can go stale: a price changes,
   stock runs low, a product is taken off sale. The cart page asks
   the server for the current state of every line (validateCart)
   and these rules decide what to fix and what to tell the buyer.
   Checkout prices everything again on the server regardless.
   ══════════════════════════════════════════════════════════════ */

/** Current state of one cart line, from the server. */
export interface LineStatus {
  /** Unit price checkout will charge, or null when the line can't be bought. */
  price: number | null;
  /** Units available right now (stock already excludes held orders). */
  stock: number;
  /** Product active and the variant still exists. */
  available: boolean;
}

export interface CartLineSnapshot {
  cartKey: string;
  productId: string;
  variantId: string;
  price: number;
  quantity: number;
}

export type CartNotice =
  | { kind: "price_changed"; cartKey: string; from: number; to: number }
  | { kind: "low_stock"; cartKey: string; left: number; from: number }
  | { kind: "unavailable"; cartKey: string };

export interface CartFix {
  cartKey: string;
  price?: number;
  quantity?: number;
}

/** "<productId>:<variantId>" — the key validateCart answers with. */
export const lineKey = (productId: string, variantId: string | null | undefined) => `${productId}:${variantId ?? ""}`;

/**
 * Compares the bag with the server's answer.
 * - gone, inactive or sold out → "unavailable" (the line stays, checkout waits until it is removed)
 * - fewer units left than in the bag → quantity lowered to what is left, "low_stock"
 * - a different price → the bag shows the new price, "price_changed"
 * Lines the server didn't answer for are left alone.
 */
export function reconcileCart(
  lines: readonly CartLineSnapshot[],
  status: Readonly<Record<string, LineStatus>>,
): { notices: CartNotice[]; fixes: CartFix[]; blocked: string[] } {
  const notices: CartNotice[] = [];
  const fixes: CartFix[] = [];
  const blocked: string[] = [];

  for (const line of lines) {
    const s = status[lineKey(line.productId, line.variantId)];
    if (!s) continue;
    if (!s.available || s.price == null || s.stock <= 0) {
      notices.push({ kind: "unavailable", cartKey: line.cartKey });
      blocked.push(line.cartKey);
      continue;
    }
    const fix: CartFix = { cartKey: line.cartKey };
    if (s.stock < line.quantity) {
      notices.push({ kind: "low_stock", cartKey: line.cartKey, left: s.stock, from: line.quantity });
      fix.quantity = s.stock;
    }
    if (Math.round(s.price * 100) !== Math.round(line.price * 100)) {
      notices.push({ kind: "price_changed", cartKey: line.cartKey, from: line.price, to: s.price });
      fix.price = s.price;
    }
    if (fix.price !== undefined || fix.quantity !== undefined) fixes.push(fix);
  }
  return { notices, fixes, blocked };
}

/** Largest quantity the stepper should allow for a line (stock known → stock, capped at 99). */
export function maxQuantity(status: LineStatus | undefined): number {
  if (!status || !status.available) return 99;
  return Math.max(1, Math.min(99, status.stock));
}
