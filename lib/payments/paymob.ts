import "server-only";

/* ══════════════════════════════════════════════════════════════
   Paymob — server-side integration
   ──────────────────────────────────────────────────────────────
   One implementation for card (iframe) and mobile-wallet payments.

   • The amount is always the order total stored in the database,
     never a number sent by the browser.
   • Only the buyer can start a payment: they must present the
     order's access token (handed to them when the order was
     created) or be the signed-in owner of the order.
   • Mock payments exist only for local development and only when
     PAYMOB_MOCK=1 — in production a missing configuration is an
     error, never a silent "success".
   ══════════════════════════════════════════════════════════════ */

import { createHmac, timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase/service";

const PAYMOB_BASE = "https://accept.paymob.com/api";

const env = () => ({
  apiKey: process.env.PAYMOB_API_KEY,
  cardIntegration: process.env.PAYMOB_INTEGRATION_ID_CARD,
  walletIntegration: process.env.PAYMOB_INTEGRATION_ID_WALLET,
  iframeId: process.env.PAYMOB_IFRAME_ID,
  hmacSecret: process.env.PAYMOB_HMAC_SECRET,
});

export const paymobConfigured = (method: "card" | "wallet"): boolean => {
  const e = env();
  return !!(e.apiKey && (method === "card" ? e.cardIntegration && e.iframeId : e.walletIntegration));
};

export const paymobMockEnabled = (): boolean =>
  process.env.NODE_ENV !== "production" && process.env.PAYMOB_MOCK === "1";

/* ── Types ───────────────────────────────────────────────────── */

export interface StartPaymentInput {
  orderId: string;
  accessToken: string;
  method: "card" | "wallet";
  walletPhone?: string;
}

export type StartPaymentResult =
  | { success: true; method: "card"; paymentToken: string; iframeId: string; mock?: boolean }
  | { success: true; method: "wallet"; redirectUrl: string; mock?: boolean }
  | { success: false; error: string; code: "not_found" | "not_payable" | "unavailable" | "gateway" };

interface PayableOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  access_token: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  shipping_city: string | null;
  shipping_governorate: string | null;
  shipping_address: string | null;
}

/* ── Helpers ─────────────────────────────────────────────────── */

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function paymobPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PAYMOB_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`Paymob ${path} failed: ${res.status}`), { status: res.status, body: text.slice(0, 300) });
  }
  return (await res.json()) as T;
}

const orDash = (s: string | null | undefined, max = 100) => (s && s.trim() ? s.trim().slice(0, max) : "NA");

/* ── Start a payment ─────────────────────────────────────────── */

export async function startOnlinePayment(input: StartPaymentInput, ownerProfileId?: string | null): Promise<StartPaymentResult> {
  const db = getServiceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, total, status, payment_status, payment_method, access_token, user_id, shipping_name, shipping_phone, shipping_email, shipping_city, shipping_governorate, shipping_address",
    )
    .eq("id", input.orderId)
    .maybeSingle<PayableOrder & { user_id: string | null }>();

  const allowed =
    !!order &&
    (safeEqual(String(order.access_token), String(input.accessToken || "")) ||
      (!!ownerProfileId && order.user_id === ownerProfileId));
  if (!order || !allowed) return { success: false, code: "not_found", error: "Order not found." };

  if (order.payment_status === "paid") return { success: false, code: "not_payable", error: "This order is already paid." };
  if (order.status !== "pending" || order.payment_method !== input.method) {
    return { success: false, code: "not_payable", error: "This order can no longer be paid online." };
  }

  const amountCents = Math.round(Number(order.total) * 100);

  if (!paymobConfigured(input.method)) {
    if (paymobMockEnabled()) {
      return input.method === "card"
        ? { success: true, method: "card", paymentToken: `MOCK_${order.id}`, iframeId: "MOCK", mock: true }
        : { success: true, method: "wallet", redirectUrl: "/api/checkout/paymob/mock", mock: true };
    }
    console.error(`[Paymob] ${input.method} payments are not configured.`);
    return { success: false, code: "unavailable", error: "Online payment is not available right now. Please choose cash on delivery." };
  }

  const e = env();
  try {
    const { token: authToken } = await paymobPost<{ token: string }>("/auth/tokens", { api_key: e.apiKey });

    // merchant_order_id must be unique per Paymob order; a retried payment gets a suffix.
    const register = (merchantOrderId: string) =>
      paymobPost<{ id: number }>("/ecommerce/orders", {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: merchantOrderId,
        items: [{ name: `ShiftSouq order ${order.order_number}`, amount_cents: amountCents, quantity: 1 }],
      });
    let paymobOrder: { id: number };
    try {
      paymobOrder = await register(order.id);
    } catch (err) {
      if ((err as { status?: number }).status !== 422) throw err;
      paymobOrder = await register(`${order.id}__${Date.now()}`);
    }
    await db.from("orders").update({ paymob_order_id: String(paymobOrder.id) }).eq("id", order.id);

    const [first, ...rest] = (order.shipping_name || "Customer").split(" ");
    const { token: paymentKey } = await paymobPost<{ token: string }>("/acceptance/payment_keys", {
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrder.id,
      currency: "EGP",
      integration_id: Number(input.method === "card" ? e.cardIntegration : e.walletIntegration),
      billing_data: {
        first_name: orDash(first),
        last_name: orDash(rest.join(" ")),
        email: orDash(order.shipping_email, 254),
        phone_number: orDash(order.shipping_phone, 20),
        city: orDash(order.shipping_city),
        state: orDash(order.shipping_governorate),
        street: orDash(order.shipping_address, 200),
        building: "NA",
        apartment: "NA",
        floor: "NA",
        postal_code: "NA",
        country: "EG",
        shipping_method: "NA",
      },
    });

    if (input.method === "card") {
      return { success: true, method: "card", paymentToken: paymentKey, iframeId: String(e.iframeId) };
    }

    const phone = (input.walletPhone || order.shipping_phone || "").replace(/\s+/g, "");
    const pay = await paymobPost<{ redirect_url?: string; iframe_redirection_url?: string }>("/acceptance/payments/pay", {
      source: { identifier: phone, subtype: "WALLET" },
      payment_token: paymentKey,
    });
    const redirectUrl = pay.redirect_url || pay.iframe_redirection_url;
    if (!redirectUrl) throw new Error("Paymob wallet returned no redirect URL");
    return { success: true, method: "wallet", redirectUrl };
  } catch (err) {
    console.error("[Paymob] start payment failed:", err);
    return { success: false, code: "gateway", error: "The payment gateway is not responding. Please try again." };
  }
}

/* ── Webhook verification ────────────────────────────────────── */

/** Fields Paymob concatenates (in this order) for the transaction HMAC. */
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function pick(obj: Record<string, unknown>, path: string): string {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur === null || cur === undefined ? "" : String(cur);
}

/** Verifies a webhook body object (`obj`) or flat redirect query params against Paymob's HMAC. */
export function verifyPaymobHmac(data: Record<string, unknown>, received: string | null | undefined, flat = false): boolean {
  const secret = env().hmacSecret;
  if (!secret || !received) return false;
  const concatenated = HMAC_FIELDS.map((f) => (flat ? String(data[f] ?? "") : pick(data, f))).join("");
  const computed = createHmac("sha512", secret).update(concatenated).digest("hex");
  return safeEqual(computed, String(received).toLowerCase());
}

/** Our order id is the merchant_order_id, optionally with a "__retry" suffix. */
export function orderIdFromMerchantId(merchantOrderId: unknown): string | null {
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(String(merchantOrderId ?? ""));
  return m ? m[1] : null;
}
