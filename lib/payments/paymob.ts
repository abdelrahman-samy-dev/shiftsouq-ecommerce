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
   • Every Paymob order we register is recorded in payment_attempts
     (Paymob order id → our order, amount). The webhook finds the
     order from Paymob's SIGNED order id through that table, never
     from merchant_order_id (which the HMAC does not cover).
   • The payment key lives only for what is left of the order's
     60-minute payment window.
   • Mock payments exist only for local development and only when
     PAYMOB_MOCK=1 — in production a missing configuration is an
     error, never a silent "success". They record an attempt too
     ("mock-<uuid>"), so they are confirmed the same way.
   ══════════════════════════════════════════════════════════════ */

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
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
  created_at: string;
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

/** An unpaid card / wallet order is cancelled (stock released) this long after it was placed. */
export const PAYMENT_WINDOW_SECONDS = 60 * 60;
/** Less than this left in the window: don't start a payment the buyer can't finish. */
export const MIN_PAYMENT_SECONDS = 60;

/** Whole seconds left in the order's payment window (0 when it has run out or the date is unreadable). */
export function paymentSecondsLeft(createdAt: string | Date | null | undefined, now: number = Date.now()): number {
  const placed = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(placed)) return 0;
  return Math.max(0, Math.floor(PAYMENT_WINDOW_SECONDS - (now - placed) / 1000));
}

/** Records a Paymob order (or a local test payment) as an attempt to pay this order. */
async function recordAttempt(paymobOrderId: string, orderId: string, amountCents: number): Promise<void> {
  const { error } = await getServiceClient()
    .from("payment_attempts")
    .insert({ paymob_order_id: paymobOrderId, order_id: orderId, amount_cents: amountCents });
  if (error) throw new Error(`payment attempt not recorded: ${error.message}`);
}

/* ── Start a payment ─────────────────────────────────────────── */

export async function startOnlinePayment(input: StartPaymentInput, ownerProfileId?: string | null): Promise<StartPaymentResult> {
  const db = getServiceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, total, created_at, status, payment_status, payment_method, access_token, user_id, shipping_name, shipping_phone, shipping_email, shipping_city, shipping_governorate, shipping_address",
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

  // The payment key must not outlive the order's payment window.
  const secondsLeft = paymentSecondsLeft(order.created_at);
  if (secondsLeft < MIN_PAYMENT_SECONDS) {
    return { success: false, code: "not_payable", error: "The time to pay for this order has run out." };
  }

  const amountCents = Math.round(Number(order.total) * 100);

  if (!paymobConfigured(input.method)) {
    if (paymobMockEnabled()) {
      try {
        await recordAttempt(`mock-${randomUUID()}`, order.id, amountCents);
      } catch (err) {
        console.error("[Paymob mock]", err);
        return { success: false, code: "gateway", error: "The payment gateway is not responding. Please try again." };
      }
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
    // The webhook resolves the order from this record (Paymob's signed order id), so it comes first.
    await recordAttempt(String(paymobOrder.id), order.id, amountCents);
    await db.from("orders").update({ paymob_order_id: String(paymobOrder.id) }).eq("id", order.id);

    const [first, ...rest] = (order.shipping_name || "Customer").split(" ");
    const { token: paymentKey } = await paymobPost<{ token: string }>("/acceptance/payment_keys", {
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: secondsLeft,
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

/**
 * A field of the flat redirect query. Paymob names the order id `order`
 * there (the webhook body nests it as order.id); `order.id` is accepted too.
 */
function flatField(data: Record<string, unknown>, field: string): string {
  const value = field === "order.id" ? (data.order ?? data["order.id"]) : data[field];
  return value === null || value === undefined ? "" : String(value);
}

/** Verifies a webhook body object (`obj`) or flat redirect query params against Paymob's HMAC. */
export function verifyPaymobHmac(data: Record<string, unknown>, received: string | null | undefined, flat = false): boolean {
  const secret = env().hmacSecret;
  if (!secret || !received) return false;
  const concatenated = HMAC_FIELDS.map((f) => (flat ? flatField(data, f) : pick(data, f))).join("");
  const computed = createHmac("sha512", secret).update(concatenated).digest("hex");
  return safeEqual(computed, String(received).toLowerCase());
}

/**
 * Paymob's order id — one of the signed fields — from a webhook body or the
 * flat redirect query. Our order is found from it through payment_attempts.
 */
export function signedPaymobOrderId(data: Record<string, unknown>, flat = false): string | null {
  const id = flat ? flatField(data, "order.id") : pick(data, "order.id");
  return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : null;
}

/** The order a registered Paymob order (payment attempt) belongs to, or null. */
export async function orderForPaymobOrder(paymobOrderId: string): Promise<{ orderId: string; amountCents: number } | null> {
  const { data, error } = await getServiceClient()
    .from("payment_attempts")
    .select("order_id, amount_cents")
    .eq("paymob_order_id", paymobOrderId)
    .maybeSingle();
  if (error) throw new Error(`payment attempt lookup failed: ${error.message}`);
  return data ? { orderId: String(data.order_id), amountCents: Number(data.amount_cents) } : null;
}
