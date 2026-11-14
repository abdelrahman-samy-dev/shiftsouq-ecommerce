"use server";

/* ══════════════════════════════════════════════════════════════
   Guest order tracking — order number + email → order status
   ──────────────────────────────────────────────────────────────
   • Limited per client (hashed IP) and per order number, before
     anything is looked up, so numbers and emails can't be guessed.
   • A wrong number and a wrong email get the same answer.
   • The email is compared with the order's shipping_email,
     case-insensitively, in constant time (lib/dal/account).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { trackGuestOrder, type TrackedOrder } from "@/lib/dal/account";
import { clientKey, rateLimit, targetKey, TRACK_CLIENT_LIMIT, TRACK_ORDER_LIMIT } from "@/lib/checkout/rate-limit";
import { normalizeOrderNumber } from "@/components/checkout/checkout-rules";

export type TrackResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; reason: "invalid" | "not_found" | "rate_limited" };

const schema = z.object({
  orderNumber: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(254),
});

export async function trackOrder(input: { orderNumber: string; email: string }): Promise<TrackResult> {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const number = normalizeOrderNumber(parsed.data.orderNumber);
  const [clientOk, orderOk] = await Promise.all([
    rateLimit("track", await clientKey(null), TRACK_CLIENT_LIMIT),
    rateLimit("track-order", targetKey(number), TRACK_ORDER_LIMIT),
  ]);
  if (!clientOk || !orderOk) return { ok: false, reason: "rate_limited" };

  const order = await trackGuestOrder(number, parsed.data.email);
  return order ? { ok: true, order } : { ok: false, reason: "not_found" };
}
