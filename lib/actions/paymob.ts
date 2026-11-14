"use server";

/* ══════════════════════════════════════════════════════════════
   Payment server actions — start a card / wallet payment
   ──────────────────────────────────────────────────────────────
   The browser identifies the order; the amount and billing data
   come from the database. See lib/payments/paymob.ts.

   startPayment   checkout: order id + access token from createOrder
                  (or the httpOnly receipt cookie of this browser,
                  or the signed-in owner).
   payForMyOrder  My Orders: the signed-in owner completes payment
                  for a pending card / wallet order.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { startOnlinePayment, type StartPaymentResult } from "@/lib/payments/paymob";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getMyPayableOrder, getPaymentAvailability } from "@/lib/dal/orders";
import { readReceiptCookie, setReceiptCookie } from "@/lib/dal/receipt";
import { normalizeEgyptianMobile } from "@/components/checkout/checkout-rules";

const schema = z.object({
  orderId: z.guid(),
  /** Optional: without it, the receipt cookie of this browser or the signed-in owner authorises the payment. */
  accessToken: z.guid().optional(),
  method: z.enum(["card", "wallet"]),
  walletPhone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/)
    .optional(),
});

export async function startPayment(input: z.input<typeof schema>): Promise<StartPaymentResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, code: "not_found", error: "Invalid payment request." };

  let ownerProfileId: string | null = null;
  try {
    let accessToken = parsed.data.accessToken;
    if (!accessToken) {
      const remembered = await readReceiptCookie();
      if (remembered?.orderId === parsed.data.orderId) accessToken = remembered.accessToken;
    }

    const auth = await createServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    const db = getServiceClient();
    if (user) {
      const { data } = await db.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      ownerProfileId = data?.id ?? null;
    }

    // An order past its 60-minute payment window is cancelled (stock released) instead of charged.
    await db.rpc("expire_unpaid_orders");

    const walletPhone = parsed.data.walletPhone ? normalizeEgyptianMobile(parsed.data.walletPhone) ?? parsed.data.walletPhone : undefined;
    return await startOnlinePayment({ ...parsed.data, walletPhone, accessToken: accessToken ?? "" }, ownerProfileId);
  } catch (err) {
    console.error("[startPayment]", err);
    return { success: false, code: "gateway", error: "The payment could not be started. Please try again." };
  }
}

/**
 * "Complete payment" from My Orders. Only the signed-in owner, only for a pending
 * card / wallet order that is unpaid (or failed) and still inside its payment window.
 * The order is remembered in this browser (receipt cookie) so the receipt page and
 * the local test payment panel recognise it.
 */
export async function payForMyOrder(orderId: string): Promise<StartPaymentResult & { orderNumber?: string }> {
  if (!z.guid().safeParse(orderId).success) return { success: false, code: "not_found", error: "Order not found." };
  try {
    const order = await getMyPayableOrder(orderId);
    if (!order) return { success: false, code: "not_found", error: "Order not found." };
    if (!order.canPay || (order.paymentMethod !== "card" && order.paymentMethod !== "wallet")) {
      return { success: false, code: "not_payable", error: "This order can no longer be paid online." };
    }
    if (!getPaymentAvailability()[order.paymentMethod]) {
      return { success: false, code: "unavailable", error: "Online payment is not available right now." };
    }

    await setReceiptCookie(order.orderId, order.accessToken);
    const result = await startOnlinePayment(
      {
        orderId: order.orderId,
        accessToken: order.accessToken,
        method: order.paymentMethod,
        walletPhone: normalizeEgyptianMobile(order.phone) ?? undefined,
      },
      order.profileId,
    );
    return result.success ? { ...result, orderNumber: order.orderNumber } : result;
  } catch (err) {
    console.error("[payForMyOrder]", err);
    return { success: false, code: "gateway", error: "The payment could not be started. Please try again." };
  }
}
