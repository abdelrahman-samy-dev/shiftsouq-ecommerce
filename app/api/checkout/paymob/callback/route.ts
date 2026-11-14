/* ══════════════════════════════════════════════════════════════
   Paymob callbacks
   ──────────────────────────────────────────────────────────────
   POST  Transaction processed callback (server to server).
         HMAC-verified. The order is found from Paymob's SIGNED
         order id through payment_attempts — never from
         merchant_order_id, which the HMAC does not cover. The paid
         amount must equal the attempt and the order total, and one
         transaction id confirms one order (all checked inside
         mark_order_paid, under a row lock).
         Refunds, voids and second payments for a paid order are
         recorded in the audit log for the owner to reconcile.
   GET   Transaction response callback (the buyer's browser is
         redirected here). Never trusted to mark anything paid —
         it only routes the buyer to the right page.
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { orderForPaymobOrder, signedPaymobOrderId, verifyPaymobHmac } from "@/lib/payments/paymob";
import { getServiceClient } from "@/lib/supabase/service";

type Txn = Record<string, unknown> & {
  id?: number | string;
  success?: boolean;
  pending?: boolean;
  error_occured?: boolean;
  is_voided?: boolean;
  is_refunded?: boolean;
  is_void?: boolean;
  is_refund?: boolean;
  amount_cents?: number | string;
  currency?: string;
  order?: { id?: number | string; merchant_order_id?: string };
};

/** Results of mark_order_paid() that need a person to look at the order. */
const NEEDS_ATTENTION = new Set(["amount_mismatch", "already_paid_other", "transaction_reused", "paid_after_cancel", "unknown_attempt"]);

/** Records a payment event the owner must reconcile (refund, void…). Never throws. */
async function recordPaymentEvent(action: string, orderId: string, data: Record<string, unknown>) {
  try {
    const { error } = await getServiceClient()
      .from("audit_log")
      .insert({ actor_id: null, action, entity: "payment", entity_id: orderId, data });
    if (error) throw error;
  } catch (err) {
    console.error("[Paymob callback] could not record", action, orderId, err instanceof Error ? err.message : err);
  }
}

export async function POST(request: NextRequest) {
  let body: { obj?: Txn; type?: string; hmac?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const txn = body.obj;
  // Paymob appends the HMAC to the callback URL; older integrations put it in the body.
  const hmac = request.nextUrl.searchParams.get("hmac") ?? body.hmac ?? null;
  if (!txn || typeof txn !== "object" || !verifyPaymobHmac(txn, hmac)) {
    console.error("[Paymob callback] rejected: missing data or bad HMAC");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paymobOrderId = signedPaymobOrderId(txn);
  if (!paymobOrderId) {
    console.error("[Paymob callback] no Paymob order id");
    return NextResponse.json({ received: true });
  }

  let attempt: Awaited<ReturnType<typeof orderForPaymobOrder>>;
  try {
    attempt = await orderForPaymobOrder(paymobOrderId);
  } catch (err) {
    console.error("[Paymob callback] attempt lookup failed", paymobOrderId, err);
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }
  if (!attempt) {
    // Not a payment this store started (or a test from the Paymob dashboard).
    console.error(`[Paymob callback] unknown Paymob order ${paymobOrderId}`);
    return NextResponse.json({ received: true, result: "unknown_attempt" });
  }
  const orderId = attempt.orderId;
  const transactionId = String(txn.id ?? "");
  const amountCents = Math.round(Number(txn.amount_cents ?? 0));

  // A pending transaction (e.g. wallet OTP not completed yet) changes nothing.
  if (txn.pending) return NextResponse.json({ received: true });

  // Refunds and voids don't change the order here; the owner reconciles them.
  const reversal = txn.is_refunded === true || txn.is_refund === true ? "refund" : txn.is_voided === true || txn.is_void === true ? "void" : null;
  if (reversal) {
    console.error(`[Paymob callback] ${reversal.toUpperCase()} for order ${orderId} (transaction ${transactionId})`);
    await recordPaymentEvent(`payment.${reversal}`, orderId, {
      transaction_id: transactionId,
      amount_cents: amountCents,
      paymob_order_id: paymobOrderId,
      success: txn.success === true,
    });
    return NextResponse.json({ received: true, result: reversal });
  }

  const succeeded = txn.success === true && !txn.error_occured && txn.currency === "EGP";

  try {
    const { data, error } = await getServiceClient().rpc("mark_order_paid", {
      p_order_id: orderId,
      p_paymob_order_id: paymobOrderId,
      p_amount_cents: amountCents,
      p_transaction_id: transactionId,
      p_success: succeeded,
    });
    if (error) throw error;
    if (NEEDS_ATTENTION.has(String(data))) {
      console.error(`[Paymob callback] ${String(data).toUpperCase()} for order ${orderId} (transaction ${transactionId})`);
    }
    return NextResponse.json({ received: true, result: data });
  } catch (err) {
    console.error("[Paymob callback] could not update order", orderId, err);
    // 500 so Paymob retries the callback later.
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const q = Object.fromEntries(request.nextUrl.searchParams.entries());
  const signed = verifyPaymobHmac(q, q.hmac, true);
  const looksPaid = signed && q.success === "true" && q.pending !== "true";

  // Only a signed redirect names the order (through its payment attempt).
  let orderNumber = "";
  const paymobOrderId = signed ? signedPaymobOrderId(q, true) : null;
  if (looksPaid && paymobOrderId) {
    try {
      const attempt = await orderForPaymobOrder(paymobOrderId);
      if (attempt) {
        const { data } = await getServiceClient().from("orders").select("order_number").eq("id", attempt.orderId).maybeSingle();
        orderNumber = data?.order_number ?? "";
      }
    } catch {
      /* fall through to the generic pages */
    }
  }

  const target = looksPaid
    ? `/checkout/success${orderNumber ? `?order=${encodeURIComponent(orderNumber)}` : ""}`
    : "/checkout?payment_error=true";

  // After a card payment Paymob loads this URL INSIDE its iframe, so a plain
  // redirect would open our page inside the payment box. Navigate the top
  // window instead (same origin by now); the meta refresh is a fallback.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=${target.replace(/&/g, "&amp;")}"></head><body><script>(window.top||window).location.replace(${JSON.stringify(target)});</script></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
