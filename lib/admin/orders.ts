/* ══════════════════════════════════════════════════════════════
   Admin — order rules (pure, shared by server and UI)
   ──────────────────────────────────────────────────────────────
   One place that decides:
   • which status changes an admin may make on an order,
   • what else changes with them (COD delivered ⇒ cash collected,
     refunded ⇒ payment refunded),
   • which orders count as money received (revenue).

   The server action re-checks every change with these rules;
   the UI uses the same rules only to hide buttons that would fail.
   Stock is given back by the database trigger `restock_on_cancel`
   when an order becomes cancelled or refunded — never here.
   ══════════════════════════════════════════════════════════════ */

import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const satisfies readonly OrderStatus[];

export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded"] as const satisfies readonly PaymentStatus[];

export const PAYMENT_METHODS = ["cod", "card", "wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** The fields the rules need. */
export interface OrderState {
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
}

/** Fulfilment moves one step at a time. */
const NEXT_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const FINAL: readonly OrderStatus[] = ["cancelled", "refunded"];
const AFTER_SHIPPING: readonly OrderStatus[] = ["shipped", "delivered"];

export const isOrderStatus = (v: unknown): v is OrderStatus =>
  typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
export const isPaymentStatus = (v: unknown): v is PaymentStatus =>
  typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  typeof v === "string" && (PAYMENT_METHODS as readonly string[]).includes(v);

/** Card and wallet orders are paid through the payment gateway before they ship. */
export const isOnlinePayment = (o: Pick<OrderState, "payment_method">): boolean =>
  o.payment_method === "card" || o.payment_method === "wallet";

/**
 * The store holds the customer's money: paid online, or cash collected
 * on delivery (older COD orders delivered before `paid` was recorded count too).
 */
export function isMoneyReceived(o: OrderState): boolean {
  if (o.payment_status === "refunded") return false;
  if (o.payment_status === "paid") return true;
  return o.payment_method === "cod" && o.status === "delivered";
}

/** Counts towards revenue: money received and the order still stands. */
export function countsAsRevenue(o: OrderState): boolean {
  return !FINAL.includes(o.status) && isMoneyReceived(o);
}

export type TransitionError =
  | "invalid_status"
  | "same_status"
  | "final"
  | "not_next_step"
  | "awaiting_online_payment"
  | "cancel_after_shipping"
  | "cancel_paid"
  | "refund_unpaid";

export interface OrderPatch {
  status: OrderStatus;
  payment_status?: PaymentStatus;
}

export type TransitionResult = { ok: true; patch: OrderPatch } | { ok: false; error: TransitionError };

/** Decide whether `order` may move to `to`, and what to write if so. */
export function checkTransition(order: OrderState, to: string): TransitionResult {
  if (!isOrderStatus(to)) return { ok: false, error: "invalid_status" };
  if (FINAL.includes(order.status)) return { ok: false, error: "final" };
  if (to === order.status) return { ok: false, error: "same_status" };

  if (to === "cancelled") {
    if (AFTER_SHIPPING.includes(order.status)) return { ok: false, error: "cancel_after_shipping" };
    // Money was taken: it has to be refunded, not just cancelled.
    if (isMoneyReceived(order)) return { ok: false, error: "cancel_paid" };
    return { ok: true, patch: { status: "cancelled" } };
  }

  if (to === "refunded") {
    if (!isMoneyReceived(order)) return { ok: false, error: "refund_unpaid" };
    return { ok: true, patch: { status: "refunded", payment_status: "refunded" } };
  }

  if (NEXT_STEP[order.status] !== to) return { ok: false, error: "not_next_step" };

  // An unpaid (or failed) card / wallet order stays pending until the gateway confirms it.
  if (isOnlinePayment(order) && order.payment_status !== "paid") {
    return { ok: false, error: "awaiting_online_payment" };
  }

  // Cash on delivery: handing over the parcel means the cash was collected.
  if (to === "delivered" && order.payment_method === "cod") {
    return { ok: true, patch: { status: "delivered", payment_status: "paid" } };
  }
  return { ok: true, patch: { status: to } };
}

/** Status changes the admin can make right now, in display order. */
export function availableTransitions(order: OrderState): OrderStatus[] {
  return ORDER_STATUSES.filter((s) => checkTransition(order, s).ok);
}

/**
 * Why the order cannot move forward, if it cannot (for a hint in the UI).
 * Returns null when the next step is available or the order is finished.
 */
export function forwardBlocker(order: OrderState): TransitionError | null {
  const next = NEXT_STEP[order.status];
  if (!next || FINAL.includes(order.status)) return null;
  const r = checkTransition(order, next);
  return r.ok ? null : r.error;
}

/** Normalises a row from the database (text columns, possibly null) into an OrderState. */
export function toOrderState(row: {
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
}): OrderState {
  return {
    status: isOrderStatus(row.status) ? row.status : "pending",
    payment_status: isPaymentStatus(row.payment_status) ? row.payment_status : "unpaid",
    payment_method: isPaymentMethod(row.payment_method) ? row.payment_method : null,
  };
}
