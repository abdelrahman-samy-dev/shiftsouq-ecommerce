/* ══════════════════════════════════════════════════════════════
   POST /api/checkout/paymob/wallet — start a mobile-wallet payment
   Body: { orderId, accessToken?, walletPhone }
   The amount is the order total stored in the database. Without an
   access token, this browser's receipt cookie or the signed-in owner
   authorises the payment (see startPayment).
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { startPayment } from "@/lib/actions/paymob";

export async function POST(request: NextRequest) {
  let body: { orderId?: string; accessToken?: string; walletPhone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await startPayment({
    orderId: String(body.orderId ?? ""),
    accessToken: body.accessToken ? String(body.accessToken) : undefined,
    method: "wallet",
    walletPhone: body.walletPhone ? String(body.walletPhone) : undefined,
  });

  if (!result.success) {
    const status = result.code === "not_found" ? 404 : result.code === "not_payable" ? 409 : result.code === "unavailable" ? 503 : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
