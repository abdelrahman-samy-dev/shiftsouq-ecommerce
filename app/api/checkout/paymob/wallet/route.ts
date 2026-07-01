/* ══════════════════════════════════════════════════════════════
   Paymob Wallet API Route — Standard REST (No RSC Serialization)
   ──────────────────────────────────────────────────────────────
   Handles mobile wallet payment initiation via a standard POST
   endpoint. Returns a plain JSON response with the redirect URL.

   This bypasses the Next.js Server Action RSC serialization
   that strips properties from returned objects.

   Endpoint: POST /api/checkout/paymob/wallet
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { processPaymentSchema } from "@/lib/validations/payment";

/* ── Types ───────────────────────────────────────────────────── */

interface WalletRequestBody {
  amountCents: number;
  items: {
    name: string;
    amount_cents: number;
    quantity: number;
    description?: string;
  }[];
  billingData: {
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
  };
  walletPhone: string;
  /** Supabase order UUID — used as merchant_order_id in Paymob */
  supabaseOrderId?: string;
}

/* ── Constants ───────────────────────────────────────────────── */

const PAYMOB_BASE = "https://accept.paymob.com/api";

const API_KEY = process.env.PAYMOB_API_KEY;
const WALLET_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID_WALLET;

function isConfigured(): boolean {
  return !!(API_KEY && WALLET_INTEGRATION_ID);
}

/* ── Paymob API Helpers ──────────────────────────────────────── */

async function authenticate(): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: API_KEY }),
  });

  if (!res.ok) {
    throw new Error(`Paymob auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token as string;
}

async function registerOrder(
  authToken: string,
  amountCents: number,
  items: WalletRequestBody["items"],
  merchantOrderId: string
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

async function getPaymentKey(
  authToken: string,
  orderId: string,
  amountCents: number,
  integrationId: string,
  billingData: WalletRequestBody["billingData"]
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600,
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

async function requestWalletPayment(
  paymentToken: string,
  phoneNumber: string
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payments/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: {
        identifier: phoneNumber,
        subtype: "WALLET",
      },
      payment_token: paymentToken,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Paymob Wallet] Payment request failed (${res.status}):`, errorText);
    throw new Error(`Paymob wallet payment failed: ${res.status}`);
  }

  const data = await res.json();

  // Log full response for debugging — Paymob response shape can vary
  console.log("[Paymob Wallet] Full response:", JSON.stringify(data, null, 2));

  // Paymob can return the redirect URL in different fields depending
  // on the wallet provider and API version
  const redirectUrl =
    data.redirect_url ||
    data.redirection_url ||
    data.iframe_redirection_url ||
    (data.iframeRedirectionUrl) ||
    "";

  return redirectUrl;
}

/* ── POST Handler ────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    /* ── Validate with Zod ────────────────────────────────── */
    const parsed = processPaymentSchema.safeParse({
      paymentType: "wallet",
      amountCents: body.amountCents,
      items: body.items,
      billingData: body.billingData,
      walletPhone: body.walletPhone,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid payment data.";
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const { amountCents, items, billingData } = parsed.data;
    const walletPhone = parsed.data.walletPhone || body.walletPhone;

    /* ── Dev mode: return mock redirect ────────────────────── */
    if (!isConfigured()) {
      console.warn("[Paymob Wallet API] Not configured. Returning mock redirect.");
      const mockOrderId = `MOCK_${Date.now()}`;
      return NextResponse.json({
        success: true,
        redirectUrl: `/checkout/success?mock_wallet=true&order=${mockOrderId}`,
        orderId: mockOrderId,
      });
    }

    /* ── Step 1: Authenticate ──────────────────────────────── */
    const authToken = await authenticate();

    /* ── Step 2: Register Order ────────────────────────────── */
    const merchantOrderId = body.supabaseOrderId || `SS_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const orderId = await registerOrder(authToken, amountCents, items, merchantOrderId);

    /* ── Step 3: Get Payment Key ───────────────────────────── */
    const paymentKey = await getPaymentKey(
      authToken,
      orderId,
      amountCents,
      WALLET_INTEGRATION_ID!,
      billingData
    );

    /* ── Step 4: Request Wallet Payment ────────────────────── */
    const phone = walletPhone || billingData.phone_number;
    const redirectUrl = await requestWalletPayment(paymentKey, phone);

    console.log(`[Paymob Wallet API] Order #${orderId} → redirect: ${redirectUrl || "(EMPTY)"}`);

    /* ── Validate redirect URL before returning ────────────── */
    if (!redirectUrl) {
      console.error(
        `[Paymob Wallet API] Paymob returned no redirect URL for order #${orderId}. ` +
        `This may indicate an incorrect PAYMOB_INTEGRATION_ID_WALLET or ` +
        `an unsupported phone number format. Phone used: ${phone}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Paymob did not return a wallet redirect URL. Please check your wallet integration ID and ensure the phone number format is correct (e.g., 01xxxxxxxxx).",
          orderId,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      orderId,
    });
  } catch (error) {
    console.error("[Paymob Wallet API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Wallet payment failed",
      },
      { status: 500 }
    );
  }
}

