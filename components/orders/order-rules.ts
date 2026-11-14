/* ══════════════════════════════════════════════════════════════
   Order rules — what a buyer may still do with an order
   ──────────────────────────────────────────────────────────────
   Pure functions used by the orders data layer (server) and tests.
   The database enforces the same rules: expire_unpaid_orders()
   cancels unpaid card / wallet orders after 60 minutes, and the
   cancel action only touches pending, unpaid orders of the owner.
   ══════════════════════════════════════════════════════════════ */

/** Must match the interval in expire_unpaid_orders(). */
export const PAYMENT_WINDOW_MINUTES = 60;

export type OrderStatusValue = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatusValue = "unpaid" | "paid" | "failed" | "refunded";
export type PaymentMethodValue = "cod" | "card" | "wallet";

export interface OrderRuleInput {
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  paymentMethod: PaymentMethodValue | null;
  createdAt: string;
}

export interface OrderCapabilities {
  /** Card / wallet order still waiting for a successful payment inside its window. */
  canPay: boolean;
  /** Pending and not paid: the buyer may cancel it. */
  canCancel: boolean;
  /** Unpaid online order whose payment window has passed (it will be cancelled automatically). */
  expired: boolean;
  /** ISO time until which an unpaid online order can be paid, or null. */
  payBy: string | null;
}

export const isOnlineMethod = (m: PaymentMethodValue | null): m is "card" | "wallet" => m === "card" || m === "wallet";

export function orderCapabilities(o: OrderRuleInput, now: number = Date.now()): OrderCapabilities {
  const pending = o.status === "pending";
  const unpaid = o.paymentStatus === "unpaid" || o.paymentStatus === "failed";
  const online = isOnlineMethod(o.paymentMethod);
  const created = Date.parse(o.createdAt);
  const deadline = online && Number.isFinite(created) ? created + PAYMENT_WINDOW_MINUTES * 60_000 : null;
  const expired = online && pending && unpaid && (deadline === null || now >= deadline);

  return {
    canPay: online && pending && unpaid && !expired,
    canCancel: pending && unpaid,
    expired,
    payBy: online && pending && unpaid && deadline !== null && !expired ? new Date(deadline).toISOString() : null,
  };
}

/* ── Status timeline ─────────────────────────────────────────── */

/** The road an order travels, in order. */
export const TIMELINE_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;
export type TimelineStep = (typeof TIMELINE_STEPS)[number];

export interface Timeline {
  steps: { key: TimelineStep; state: "done" | "current" | "upcoming" }[];
  /** Cancelled / refunded orders leave the road: shown as their own state. */
  ended: "cancelled" | "refunded" | null;
}

/** Where an order is on its way: steps before the status are done, the status itself is current. */
export function orderTimeline(status: OrderStatusValue): Timeline {
  if (status === "cancelled" || status === "refunded") {
    return { steps: TIMELINE_STEPS.map((key) => ({ key, state: key === "pending" ? "done" : "upcoming" })), ended: status };
  }
  const at = Math.max(0, TIMELINE_STEPS.indexOf(status as TimelineStep));
  return {
    steps: TIMELINE_STEPS.map((key, i) => ({
      key,
      state: i < at || (status === "delivered" && i === at) ? "done" : i === at ? "current" : "upcoming",
    })),
    ended: null,
  };
}
