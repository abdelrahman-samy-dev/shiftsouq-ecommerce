/* ══════════════════════════════════════════════════════════════
   Paymob callbacks
   ──────────────────────────────────────────────────────────────
   POST  Transaction processed callback (server to server).
         HMAC-verified; the paid amount must equal the order total
         (checked inside mark_order_paid, under a row lock).
   GET   Transaction response callback (the buyer's browser is
         redirected here). Never trusted to mark anything paid —
         it only routes the buyer to the right page.
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { orderIdFromMerchantId, verifyPaymobHmac } from "@/lib/payments/paymob";
import { getServiceClient } from "@/lib/supabase/service";

type Txn = Record<string, unknown> & {
  id?: number | string;
  success?: boolean;
  pending?: boolean;
  error_occured?: boolean;
  is_voided?: boolean;
  is_refunded?: boolean;
  amount_cents?: number | string;
  currency?: string;
  order?: { id?: number | string; merchant_order_id?: string };
};

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
  if (!txn || !verifyPaymobHmac(txn, hmac)) {
    console.error("[Paymob callback] rejected: missing data or bad HMAC");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderId = orderIdFromMerchantId(txn.order?.merchant_order_id);
  if (!orderId) {
    console.error("[Paymob callback] no merchant_order_id", txn.order?.id);
    return NextResponse.json({ received: true });
  }

  const succeeded =
    txn.success === true && !txn.pending && !txn.error_occured && !txn.is_voided && !txn.is_refunded && txn.currency === "EGP";

  // A pending transaction (e.g. wallet OTP not completed yet) changes nothing.
  if (txn.pending) return NextResponse.json({ received: true });

  try {
    const { data, error } = await getServiceClient().rpc("mark_order_paid", {
      p_order_id: orderId,
      p_amount_cents: Math.round(Number(txn.amount_cents ?? 0)),
      p_transaction_id: String(txn.id ?? ""),
      p_success: succeeded,
    });
    if (error) throw error;
    if (data === "amount_mismatch") console.error(`[Paymob callback] AMOUNT MISMATCH for order ${orderId}`);
    return NextResponse.json({ received: true, result: data });
  } catch (err) {
    console.error("[Paymob callback] could not update order", orderId, err);
    // 500 so Paymob retries the callback later.
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const q = Object.fromEntries(request.nextUrl.searchParams.entries());
  const orderId = orderIdFromMerchantId(q.merchant_order_id);
  const looksPaid = q.success === "true" && q.pending !== "true" && verifyPaymobHmac(q, q.hmac, true);

  let orderNumber = "";
  if (orderId) {
    try {
      const { data } = await getServiceClient().from("orders").select("order_number").eq("id", orderId).maybeSingle();
      orderNumber = data?.order_number ?? "";
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
