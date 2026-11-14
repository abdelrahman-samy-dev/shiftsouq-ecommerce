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
     items back on the shelf).
   Saving addresses lives in lib/dal/account.ts.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { paymobConfigured, paymobMockEnabled } from "@/lib/payments/paymob";
import { getPublicClient } from "@/lib/supabase/public";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  orderCapabilities,
  type OrderStatusValue,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/components/orders/order-rules";
import { normalizeEgyptianMobile, splitFullName } from "@/components/checkout/checkout-rules";
import { getMyAddresses, type SavedAddress } from "@/lib/dal/account";
import { unstable_rethrow } from "next/navigation";

/* ── Types ───────────────────────────────────────────────────── */

export interface PaymentAvailability {
  card: boolean;
  wallet: boolean;
}

export interface MyOrderItem {
  name: string;
  /** Arabic name / option label stored at purchase time (null for older orders). */
  nameAr: string | null;
  label: string | null;
  labelAr: string | null;
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
  updatedAt: string;
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
  /** Saved addresses (address book first, else the one older checkouts kept on the profile). */
  addresses: SavedAddress[];
}

export type CancelOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; code: "not_found" | "not_cancellable" | "server" };

/* ── Helpers ─────────────────────────────────────────────────── */

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const ORDER_COLUMNS =
  "id, order_number, created_at, updated_at, status, payment_status, payment_method, subtotal, discount_amount, shipping_cost, total, " +
  "shipping_name, shipping_phone, shipping_email, shipping_governorate, shipping_city, shipping_address, " +
  "order_items(product_name, product_name_ar, variant_label, variant_label_ar, quantity, unit_price, image_url, created_at)";

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string | null;
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
  order_items:
    | {
        product_name: string;
        product_name_ar: string | null;
        variant_label: string | null;
        variant_label_ar: string | null;
        quantity: number;
        unit_price: number | string;
        image_url: string | null;
        created_at: string;
      }[]
    | null;
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
      nameAr: i.product_name_ar,
      label: i.variant_label,
      labelAr: i.variant_label_ar,
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

/** Online methods the gateway can take right now (real keys, or the local test double). */
export function getPaymentAvailability(): PaymentAvailability {
  const mock = paymobMockEnabled();
  return { card: paymobConfigured("card") || mock, wallet: paymobConfigured("wallet") || mock };
}

/* ── Delivery times per governorate ─────────────────────────── */

export type EtaByZone = Record<string, { min: number; max: number }>;

/**
 * Delivery time per governorate (store_settings.shipping.eta_days_by_zone), set by
 * the owner. Governorates without one use the store-wide ETA (settings.shipping.etaDays).
 */
export const getZoneEtas = cache(async (): Promise<EtaByZone> => {
  try {
    const { data } = await getPublicClient().from("store_settings").select("shipping").eq("id", 1).maybeSingle();
    const raw = (data?.shipping as Record<string, unknown> | null)?.eta_days_by_zone;
    const out: EtaByZone = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [zone, v] of Object.entries(raw as Record<string, unknown>)) {
        const e = v as { min?: unknown; max?: unknown } | null;
        if (e && typeof e.min === "number" && typeof e.max === "number" && e.min >= 0 && e.max >= e.min) out[zone] = { min: e.min, max: e.max };
      }
    }
    return out;
  } catch (err) {
    unstable_rethrow(err);
    console.error("[DAL:getZoneEtas]", err);
    return {};
  }
});

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
    unstable_rethrow(err);
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
      updatedAt: o.updated_at ?? o.created_at,
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
    unstable_rethrow(err);
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

/** Contact details and saved addresses of the signed-in buyer, to prefill checkout. */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  try {
    const buyer = await currentBuyer();
    if (!buyer) return null;
    const { firstName, lastName } = splitFullName(buyer.profile.full_name);
    const phone = normalizeEgyptianMobile(buyer.profile.phone) ?? "";
    const addresses = await getMyAddresses();

    // Older checkouts kept one address on the profile: offer it until the buyer saves one.
    const legacy = (buyer.profile.default_address ?? null) as Record<string, unknown> | null;
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    if (addresses.length === 0 && legacy && typeof legacy === "object" && str(legacy.address, 200)) {
      addresses.push({
        id: "profile",
        label: null,
        fullName: `${firstName} ${lastName}`.trim(),
        phone,
        governorate: str(legacy.governorate, 40),
        city: str(legacy.city, 80),
        address: str(legacy.address, 200),
        apartment: str(legacy.apartment, 40) || null,
        postalCode: str(legacy.postalCode, 20) || null,
        isDefault: true,
      });
    }

    return { contact: { firstName, lastName, email: buyer.user.email ?? "", phone }, addresses };
  } catch (err) {
    unstable_rethrow(err);
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
    unstable_rethrow(err);
    console.error("[DAL:cancelMyOrder] unexpected:", err);
    return { ok: false, code: "server" };
  }
}
