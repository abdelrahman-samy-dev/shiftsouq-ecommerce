import "server-only";

/* ══════════════════════════════════════════════════════════════
   Order receipt — what the buyer sees after checkout
   ──────────────────────────────────────────────────────────────
   Readable only by the browser that placed the order (httpOnly
   "ss_order" cookie = "<orderId>.<accessToken>") or by the signed-in
   owner. Returns a minimal DTO — no internal ids or tokens.
   ══════════════════════════════════════════════════════════════ */

import { cookies } from "next/headers";
import { safeEqual } from "@/lib/payments/paymob";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export interface Receipt {
  orderNumber: string;
  status: string;
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded";
  paymentMethod: "cod" | "card" | "wallet" | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  city: string | null;
  createdAt: string;
  items: { name: string; label: string | null; quantity: number; unitPrice: number; image: string | null }[];
}

export async function getReceipt(orderNumber?: string): Promise<Receipt | null> {
  try {
    const db = getServiceClient();
    const cookie = (await cookies()).get("ss_order")?.value ?? "";
    const [cookieId, cookieToken] = cookie.split(".");

    let profileId: string | null = null;
    if (orderNumber) {
      const {
        data: { user },
      } = await (await createServerClient()).auth.getUser();
      if (user) {
        const { data } = await db.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
        profileId = data?.id ?? null;
      }
    }

    const query = db
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, subtotal, discount_amount, shipping_cost, total, shipping_city, created_at, access_token, user_id, order_items(product_name, variant_label, quantity, unit_price, image_url)",
      );
    const { data: o } = orderNumber
      ? await query.eq("order_number", orderNumber).maybeSingle()
      : cookieId
        ? await query.eq("id", cookieId).maybeSingle()
        : { data: null };
    if (!o) return null;

    const viaCookie = o.id === cookieId && !!cookieToken && safeEqual(String(o.access_token), cookieToken);
    const viaAccount = !!profileId && o.user_id === profileId;
    if (!viaCookie && !viaAccount) return null;

    return {
      orderNumber: o.order_number,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount_amount ?? 0),
      shipping: Number(o.shipping_cost ?? 0),
      total: Number(o.total),
      city: o.shipping_city,
      createdAt: o.created_at,
      items: (o.order_items ?? []).map((i: { product_name: string; variant_label: string | null; quantity: number; unit_price: number; image_url: string | null }) => ({
        name: i.product_name,
        label: i.variant_label,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        image: i.image_url,
      })),
    };
  } catch (err) {
    console.error("[getReceipt]", err);
    return null;
  }
}
