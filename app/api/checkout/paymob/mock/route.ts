/* ══════════════════════════════════════════════════════════════
   Paymob test double — LOCAL DEVELOPMENT ONLY
   ──────────────────────────────────────────────────────────────
   Exists only when PAYMOB_MOCK=1 and NODE_ENV !== "production";
   otherwise every request gets a 404. Lets a developer finish a
   card / wallet checkout without Paymob keys. The payment is
   confirmed through the same mark_order_paid() function the real
   webhook uses, for the order's own total.

   Authorisation: the httpOnly "ss_order" cookie set by createOrder
   ("<orderId>.<accessToken>"), so only the browser that placed the
   order can "pay" it.

   POST {success: boolean}  → card test panel, returns JSON
   GET                      → wallet redirect, lands on the receipt
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { paymobMockEnabled, safeEqual } from "@/lib/payments/paymob";
import { getServiceClient } from "@/lib/supabase/service";

async function settle(request: NextRequest, success: boolean) {
  const [orderId, token] = (request.cookies.get("ss_order")?.value ?? "").split(".");
  if (!orderId || !token) return null;

  const db = getServiceClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, total, access_token")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !safeEqual(String(order.access_token), token)) return null;

  const { data: result, error } = await db.rpc("mark_order_paid", {
    p_order_id: order.id,
    p_amount_cents: Math.round(Number(order.total) * 100),
    p_transaction_id: `MOCK-${Date.now()}`,
    p_success: success,
  });
  if (error) throw error;
  return { orderNumber: order.order_number as string, result: result as string };
}

export async function POST(request: NextRequest) {
  if (!paymobMockEnabled()) return new NextResponse(null, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { success?: boolean };
  const done = await settle(request, body.success === true);
  if (!done) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json(done);
}

export async function GET(request: NextRequest) {
  if (!paymobMockEnabled()) return new NextResponse(null, { status: 404 });
  const done = await settle(request, true);
  const target = done
    ? `/checkout/success?order=${encodeURIComponent(done.orderNumber)}`
    : "/checkout?payment_error=true";
  return NextResponse.redirect(new URL(target, request.url), 303);
}
