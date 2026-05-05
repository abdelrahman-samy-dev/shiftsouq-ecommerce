/* ══════════════════════════════════════════════════════════════
   Paymob Server Actions — Secure Payment Integration
   ──────────────────────────────────────────────────────────────
   Implements the standard 3-step Paymob API flow:
   1. Authenticate → get auth token
   2. Register Order → get order ID
   3. Get Payment Key → generate iframe / redirect URL

   Environment variables:
   - PAYMOB_API_KEY           — Your Paymob API key
   - PAYMOB_INTEGRATION_ID_CARD   — Card payment integration ID
   - PAYMOB_INTEGRATION_ID_WALLET — Wallet payment integration ID
   - PAYMOB_IFRAME_ID         — Paymob iframe ID for card payments

   If env vars are missing, mock responses are returned for
   development purposes.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { processPaymentSchema } from "@/lib/validations/payment";

/* ── Types ───────────────────────────────────────────────────── */

export interface BillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  state: string;
  street: string;
  building: string;
  apartment: string;
  floor: string;
  postal_code: string;
  country: string;
}

export interface PaymobOrderItem {
  name: string;
  amount_cents: number;
  quantity: number;
  description?: string;
}

export interface PaymobResult {
  success: boolean;
  /** For card payments — raw token to embed in iFrame */
  paymentToken?: string;
  /** For card payments — the Paymob iframe ID */
  iframeId?: string;
  /** For wallet payments — redirect URL */
  redirectUrl?: string;
  orderId?: string;
  error?: string;
}

/* ── Constants ───────────────────────────────────────────────── */

const PAYMOB_BASE = "https://accept.paymob.com/api";

const API_KEY = process.env.PAYMOB_API_KEY;
const CARD_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID_CARD;
const WALLET_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID_WALLET;
const IFRAME_ID = process.env.PAYMOB_IFRAME_ID;

/** Check if Paymob credentials are configured */
function isPaymobConfigured(): boolean {
  return !!(API_KEY && CARD_INTEGRATION_ID && WALLET_INTEGRATION_ID);
}

/* ══════════════════════════════════════════════════════════════
   Step 1: Authentication
   ══════════════════════════════════════════════════════════════ */

/**
 * Authenticate with Paymob API and get an auth token.
 * Token is valid for ~60 minutes.
 */
async function authenticate(): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY }),
  });

  if (!res.ok) {
    throw new Error(`Paymob authentication failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token as string;
}

/* ══════════════════════════════════════════════════════════════
   Step 2: Order Registration
   ══════════════════════════════════════════════════════════════ */

/**
 * Register an order with Paymob to get an order ID.
 * Amount is in cents (e.g. 10000 = 100.00 EGP).
 */
async function registerOrder(
  authToken: string,
  amountCents: number,
  items: PaymobOrderItem[],
  merchantOrderId?: string
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items: items.map((item) => ({
        name: item.name,
        amount_cents: item.amount_cents,
        quantity: item.quantity,
        description: item.description || item.name,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Paymob order registration failed: ${res.status}`);
  }

  const data = await res.json();
  return String(data.id);
}

/* ══════════════════════════════════════════════════════════════
   Step 3: Payment Key Generation
   ══════════════════════════════════════════════════════════════ */

/**
 * Generate a payment key for the given order.
 * The payment key is used to create an iframe URL or wallet redirect.
 */
async function getPaymentKey(
  authToken: string,
  orderId: string,
  amountCents: number,
  integrationId: string,
  billingData: BillingData
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600, // 1 hour
      order_id: orderId,
      billing_data: {
        ...billingData,
        shipping_method: "NA",
        extra_description: "ShiftSouq Order",
      },
      currency: "EGP",
      integration_id: parseInt(integrationId, 10),
    }),
  });

  if (!res.ok) {
    throw new Error(`Paymob payment key generation failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token as string;
}

/* ══════════════════════════════════════════════════════════════
   Wallet Payment — Get Redirect URL
   ══════════════════════════════════════════════════════════════ */

/**
 * For mobile wallet payments, we need to call the wallet endpoint
 * to get a redirect URL instead of an iframe.
 */
async function requestWalletPayment(
  paymentToken: string,
  phoneNumber: string
): Promise<string> {
  const res = await fetch(
    `${PAYMOB_BASE}/acceptance/payments/pay`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          identifier: phoneNumber,
          subtype: "WALLET",
        },
        payment_token: paymentToken,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Paymob wallet payment request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.redirect_url as string;
}

/* ══════════════════════════════════════════════════════════════
   Mock Responses (Development Mode)
   ══════════════════════════════════════════════════════════════ */

function getMockResponse(paymentType: "card" | "wallet"): PaymobResult {
  const mockOrderId = `MOCK_${Date.now()}`;

  if (paymentType === "card") {
    return {
      success: true,
      paymentToken: `MOCK_TOKEN_${Date.now()}`,
      iframeId: "MOCK_IFRAME",
      orderId: mockOrderId,
    };
  }

  return {
    success: true,
    redirectUrl: `/checkout/success?mock_wallet=true&order=${mockOrderId}`,
    orderId: mockOrderId,
  };
}

/* ══════════════════════════════════════════════════════════════
   Public Server Action — Process Payment
   ──────────────────────────────────────────────────────────────
   This is the single entry-point called from the client.
   Orchestrates the full 3-step Paymob flow.
   ══════════════════════════════════════════════════════════════ */

export async function processPaymobPayment(
  paymentType: "card" | "wallet",
  amountCents: number,
  items: PaymobOrderItem[],
  billingData: BillingData,
  walletPhone?: string
): Promise<PaymobResult> {
  /* ── Validate all inputs with Zod (C5) ─────────────────── */
  const parsed = processPaymentSchema.safeParse({
    paymentType,
    amountCents,
    items,
    billingData,
    walletPhone,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid payment data.";
    console.error("[Paymob] Validation failed:", parsed.error.issues);
    return { success: false, error: firstError };
  }

  /* ── Dev mode: return mock if Paymob not configured ────── */
  if (!isPaymobConfigured()) {
    console.warn(
      "[Paymob] Environment variables not configured. Using mock response."
    );
    return getMockResponse(paymentType);
  }

  try {
    /* ── Step 1: Authenticate ──────────────────────────────── */
    const authToken = await authenticate();

    /* ── Step 2: Register Order ────────────────────────────── */
    const merchantOrderId = `SS_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderId = await registerOrder(
      authToken,
      amountCents,
      items,
      merchantOrderId
    );

    /* ── Step 3: Get Payment Key ───────────────────────────── */
    const integrationId =
      paymentType === "card" ? CARD_INTEGRATION_ID! : WALLET_INTEGRATION_ID!;

    const paymentKey = await getPaymentKey(
      authToken,
      orderId,
      amountCents,
      integrationId,
      billingData
    );

    /* ── Route to correct payment flow ─────────────────────── */
    if (paymentType === "card") {
      return {
        success: true,
        paymentToken: paymentKey,
        iframeId: IFRAME_ID || "0",
        orderId,
      };
    }

    // Wallet flow — get redirect URL
    const phone = walletPhone || billingData.phone_number;
    const redirectUrl = await requestWalletPayment(paymentKey, phone);

    return {
      success: true,
      redirectUrl,
      orderId,
    };
  } catch (error) {
    console.error("[Paymob] Payment processing error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during payment processing.",
    };
  }
}
