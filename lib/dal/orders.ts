import "server-only";

/* ══════════════════════════════════════════════════════════════
   DAL — the signed-in buyer's own orders ("My Orders")
   ──────────────────────────────────────────────────────────────
   Reads run with the buyer's session, so the orders / order_items
   RLS select policies apply, and every query is also filtered by
   the buyer's profile id (an admin's "My Orders" shows only their
   own orders too). Results are small DTOs: no access tokens, no
   internal notes.

   Writes the buyer may make:
   • cancel a pending, unpaid order (one conditional UPDATE, so it
     can't race the payment webhook; the restock trigger puts the
     items back on the shelf);
   • save their delivery address on their own profile.
   ══════════════════════════════════════════════════════════════ */

import { paymobConfigured, paymobMockEnabled } from "@/lib/payments/paymob";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  orderCapabilities,
  type OrderStatusValue,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/components/orders/order-rules";
import { egyptianMobileToE164, splitFullName } from "@/components/checkout/checkout-rules";

/* ── Types ───────────────────────────────────────────────────── */

export interface PaymentAvailability {
  card: boolean;
  wallet: boolean;
}

export interface MyOrderItem {
  name: string;
  label: string | null;
  quantity: number;
  unitPrice: number;
  image: string | null;
}

export interface MyOrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  paymentMethod: PaymentMethodValue | null;
  total: number;
  itemCount: number;
  items: MyOrderItem[];
  canPay: boolean;
  canCancel: boolean;
  expired: boolean;
  payBy: string | null;
}

export interface MyOrder extends MyOrderSummary {
  subtotal: number;
  discount: number;
  shippingCost: number;
  delivery: {
    name: string | null;
    phone: string | null;
    email: string | null;
    governorate: string | null;
    city: string | null;
    address: string | null;
  };
}

export interface CheckoutPrefill {
  contact: { firstName: string; lastName: string; email: string; phone: string };
  shipping: { governorate: string; city: string; address: string; apartment: string; postalCode: string } | null;
}

export type CancelOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; code: "not_found" | "not_cancellable" | "server" };

/* ── Helpers ─────────────────────────────────────────────────── */

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const ORDER_COLUMNS =
  "id, order_number, created_at, status, payment_status, payment_method, subtotal, discount_amount, shipping_cost, total, " +
  "shipping_name, shipping_phone, shipping_email, shipping_governorate, shipping_city, shipping_address, " +
  "order_items(product_name, variant_label, quantity, unit_price, image_url, created_at)";

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatusValue;
  payment_status: PaymentStatusValue;
  payment_method: PaymentMethodValue | null;
  subtotal: number | string;
  discount_amount: number | string | null;
  shipping_cost: number | string | null;
  total: number | string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  shipping_governorate: string | null;
  shipping_city: string | null;
  shipping_address: string | null;
  order_items: { product_name: string; variant_label: string | null; quantity: number; unit_price: number | string; image_url: string | null; created_at: string }[] | null;
}

/** The signed-in buyer: auth user + profile id, or null for guests. */
async function currentBuyer() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, default_address")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { supabase, user, profile };
}

function toSummary(o: OrderRow): MyOrderSummary {
  const items = [...(o.order_items ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((i) => ({
      name: i.product_name,
      label: i.variant_label,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      image: i.image_url,
    }));
  const caps = orderCapabilities({
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    createdAt: o.created_at,
  });
  return {
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    total: Number(o.total),
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    items,
    ...caps,
  };
}

/* ── Payments on offer ───────────────────────────────────────── */

/** Online methods that can actually take a payment right now (real keys, or the local test double). */
export function getPaymentAvailability(): PaymentAvailability {
  const mock = paymobMockEnabled();
  return { card: paymobConfigured("card") || mock, wallet: paymobConfigured("wallet") || mock };
}

/* ── Reads ───────────────────────────────────────────────────── */

export async function getMyOrders(page = 1, pageSize = 10): Promise<{ orders: MyOrderSummary[]; count: number }> {
  try {
    const buyer = await currentBuyer();
    if (!buyer) return { orders: [], count: 0 };
    const from = (Math.max(1, page) - 1) * pageSize;
    const { data, error, count } = await buyer.supabase
      .from("orders")
      .select(ORDER_COLUMNS, { count: "exact" })
      .eq("user_id", buyer.profile.id)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[DAL:getMyOrders]", error.message);
      return { orders: [], count: 0 };
    }
    return { orders: ((data ?? []) as unknown as OrderRow[]).map(toSummary), count: count ?? 0 };
  } catch (err) {
    console.error("[DAL:getMyOrders] unexpected:", err);
    return { orders: [], count: 0 };
  }
}

export async function getMyOrder(orderId: string): Promise<MyOrder | null> {
  if (!isUuid(orderId)) return null;
  try {
    const buyer = await currentBuyer();
    if (!buyer) return null;
    const { data, error } = await buyer.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", orderId)
      .eq("user_id", buyer.profile.id)
      .maybeSingle();
    if (error) {
      console.error("[DAL:getMyOrder]", error.message);
      return null;
    }
    if (!data) return null;
    const o = data as unknown as OrderRow;
    return {
      ...toSummary(o),
      subtotal: Number(o.subtotal),
      discount: Number(o.discount_amount ?? 0),
      shippingCost: Number(o.shipping_cost ?? 0),
      delivery: {
        name: o.shipping_name,
        phone: o.shipping_phone,
        email: o.shipping_email,
        governorate: o.shipping_governorate,
        city: o.shipping_city,
        address: o.shipping_address,
      },
    };
  } catch (err) {
    console.error("[DAL:getMyOrder] unexpected:", err);
    return null;
  }
}

/**
 * Everything needed to (re)start a payment for one of the buyer's own orders,
 * including its access token — for server code only, never sent to the browser.
 */
export async function getMyPayableOrder(orderId: string) {
  if (!isUuid(orderId)) return null;
  const buyer = await currentBuyer();
  if (!buyer) return null;
  const db = getServiceClient();
  // Abandoned orders past their payment window are cancelled first (and their stock released).
  await db.rpc("expire_unpaid_orders");
  const { data } = await db
    .from("orders")
    .select("id, order_number, access_token, status, payment_status, payment_method, created_at, shipping_phone")
    .eq("id", orderId)
    .eq("user_id", buyer.profile.id)
    .maybeSingle();
  if (!data) return null;
  return {
    profileId: buyer.profile.id as string,
    orderId: data.id as string,
    orderNumber: data.order_number as string,
    accessToken: String(data.access_token),
    paymentMethod: data.payment_method as PaymentMethodValue | null,
    phone: data.shipping_phone as string | null,
    ...orderCapabilities({
      status: data.status,
      paymentStatus: data.payment_status,
      paymentMethod: data.payment_method,
      createdAt: data.created_at,
    }),
  };
}

/** Contact details and saved address of the signed-in buyer, to prefill checkout. */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  try {
    const buyer = await currentBuyer();
    if (!buyer) return null;
    const { firstName, lastName } = splitFullName(buyer.profile.full_name);
    const saved = (buyer.profile.default_address ?? null) as Record<string, unknown> | null;
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
      contact: {
        firstName,
        lastName,
        email: buyer.user.email ?? "",
        phone: egyptianMobileToE164(buyer.profile.phone),
      },
      shipping:
        saved && typeof saved === "object"
          ? {
              governorate: str(saved.governorate, 40),
              city: str(saved.city, 80),
              address: str(saved.address, 200),
              apartment: str(saved.apartment, 40),
              postalCode: str(saved.postalCode, 20),
            }
          : null,
    };
  } catch (err) {
    console.error("[DAL:getCheckoutPrefill]", err);
    return null;
  }
}

/* ── Writes ──────────────────────────────────────────────────── */

/** Cancels the buyer's own order if it is still pending and unpaid. */
export async function cancelMyOrder(orderId: string): Promise<CancelOrderResult> {
  if (!isUuid(orderId)) return { ok: false, code: "not_found" };
  try {
    const buyer = await currentBuyer();
    if (!buyer) return { ok: false, code: "not_found" };

    // Customers have no UPDATE policy on orders; the server performs this one
    // narrowly scoped change after checking who is asking. All conditions are
    // in the same statement, so a payment confirmed meanwhile wins.
    const db = getServiceClient();
    const { data, error } = await db
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("user_id", buyer.profile.id)
      .eq("status", "pending")
      .in("payment_status", ["unpaid", "failed"])
      .select("order_number");
    if (error) {
      console.error("[DAL:cancelMyOrder]", error.message);
      return { ok: false, code: "server" };
    }
    if (data && data.length > 0) return { ok: true, orderNumber: data[0].order_number };

    const { data: exists } = await buyer.supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", buyer.profile.id)
      .maybeSingle();
    return { ok: false, code: exists ? "not_cancellable" : "not_found" };
  } catch (err) {
    console.error("[DAL:cancelMyOrder] unexpected:", err);
    return { ok: false, code: "server" };
  }
}

/**
 * Saves the delivery address on the buyer's own profile (their session, so RLS applies).
 * Also fills in the profile phone number when the profile has none.
 */
export async function saveCheckoutAddress(
  address: { governorate: string; city: string; address: string; apartment?: string; postalCode?: string },
  phone: string,
): Promise<boolean> {
  try {
    const buyer = await currentBuyer();
    if (!buyer) return false;
    const update: Record<string, unknown> = {
      default_address: {
        governorate: address.governorate,
        city: address.city,
        address: address.address,
        apartment: address.apartment ?? "",
        postalCode: address.postalCode ?? "",
      },
    };
    if (!buyer.profile.phone) update.phone = phone;
    const { error } = await buyer.supabase.from("profiles").update(update).eq("id", buyer.profile.id);
    if (error) console.error("[DAL:saveCheckoutAddress]", error.message);
    return !error;
  } catch (err) {
    console.error("[DAL:saveCheckoutAddress] unexpected:", err);
    return false;
  }
}
