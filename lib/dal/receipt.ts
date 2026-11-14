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
import { orderCapabilities, type OrderStatusValue } from "@/components/orders/order-rules";
import { unstable_rethrow } from "next/navigation";

export interface Receipt {
  orderNumber: string;
  status: OrderStatusValue;
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded";
  paymentMethod: "cod" | "card" | "wallet" | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  createdAt: string;
  /** Placed without an account (offer to create one). */
  isGuest: boolean;
  /** Card / wallet order still inside its payment window: offer "Try again". */
  canRetry: boolean;
  delivery: {
    name: string | null;
    phone: string | null;
    email: string | null;
    governorate: string | null;
    city: string | null;
    address: string | null;
  };
  items: {
    name: string;
    nameAr: string | null;
    label: string | null;
    labelAr: string | null;
    quantity: number;
    unitPrice: number;
    image: string | null;
  }[];
}

interface ReceiptRow {
  id: string;
  order_number: string;
  status: OrderStatusValue;
  payment_status: Receipt["paymentStatus"];
  payment_method: Receipt["paymentMethod"];
  subtotal: number | string;
  discount_amount: number | string | null;
  shipping_cost: number | string | null;
  total: number | string;
  created_at: string;
  access_token: string;
  user_id: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  shipping_governorate: string | null;
  shipping_city: string | null;
  shipping_address: string | null;
  order_items: ReceiptItemRow[] | null;
}

interface ReceiptItemRow {
  product_name: string;
  product_name_ar: string | null;
  variant_label: string | null;
  variant_label_ar: string | null;
  quantity: number;
  unit_price: number | string;
  image_url: string | null;
  created_at: string;
}

/** httpOnly cookie "<orderId>.<accessToken>" for the latest order this browser placed or resumed. */
export const RECEIPT_COOKIE = "ss_order";

/**
 * Remembers an order in this browser (receipt page, test payments, resuming a payment).
 * Only callable from a Server Function or Route Handler.
 */
export async function setReceiptCookie(orderId: string, accessToken: string): Promise<void> {
  (await cookies()).set(RECEIPT_COOKIE, `${orderId}.${accessToken}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

/** The order remembered by this browser, if any (not yet checked against the database). */
export async function readReceiptCookie(): Promise<{ orderId: string; accessToken: string } | null> {
  const [orderId, accessToken] = ((await cookies()).get(RECEIPT_COOKIE)?.value ?? "").split(".");
  return orderId && accessToken ? { orderId, accessToken } : null;
}

export async function getReceipt(orderNumber?: string): Promise<Receipt | null> {
  try {
    const db = getServiceClient();
    const remembered = await readReceiptCookie();
    const cookieId = remembered?.orderId ?? "";
    const cookieToken = remembered?.accessToken ?? "";

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
        "id, order_number, status, payment_status, payment_method, subtotal, discount_amount, shipping_cost, total, created_at, access_token, user_id, " +
          "shipping_name, shipping_phone, shipping_email, shipping_governorate, shipping_city, shipping_address, " +
          "order_items(product_name, product_name_ar, variant_label, variant_label_ar, quantity, unit_price, image_url, created_at)",
      );
    const { data } = orderNumber
      ? await query.eq("order_number", orderNumber).maybeSingle()
      : cookieId
        ? await query.eq("id", cookieId).maybeSingle()
        : { data: null };
    const o = data as unknown as ReceiptRow | null;
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
      createdAt: o.created_at,
      isGuest: !o.user_id,
      canRetry: orderCapabilities({
        status: o.status,
        paymentStatus: o.payment_status,
        paymentMethod: o.payment_method,
        createdAt: o.created_at,
      }).canPay,
      delivery: {
        name: o.shipping_name,
        phone: o.shipping_phone,
        email: o.shipping_email,
        governorate: o.shipping_governorate,
        city: o.shipping_city,
        address: o.shipping_address,
      },
      items: [...(o.order_items ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((i) => ({
          name: i.product_name,
          nameAr: i.product_name_ar,
          label: i.variant_label,
          labelAr: i.variant_label_ar,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          image: i.image_url,
        })),
    };
  } catch (err) {
    unstable_rethrow(err);
    console.error("[getReceipt]", err);
    return null;
  }
}
