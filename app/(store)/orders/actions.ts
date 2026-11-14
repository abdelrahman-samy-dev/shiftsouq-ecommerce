"use server";

/* ══════════════════════════════════════════════════════════════
   My Orders — server actions
   ──────────────────────────────────────────────────────────────
   Thin wrappers: authentication, ownership and status checks live
   in lib/dal/orders.ts (cancelMyOrder). Completing a payment is
   payForMyOrder in lib/actions/paymob.ts.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from "next/cache";
import { cancelMyOrder, type CancelOrderResult } from "@/lib/dal/orders";

export async function cancelOrder(orderId: string): Promise<CancelOrderResult> {
  const result = await cancelMyOrder(String(orderId ?? ""));
  if (result.ok) {
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
  }
  return result;
}
