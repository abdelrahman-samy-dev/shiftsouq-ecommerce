/* ══════════════════════════════════════════════════════════════
   Paymob Callback Route — HMAC-Verified Transaction Handler
   ──────────────────────────────────────────────────────────────
   Handles Paymob's server-to-server transaction response callback.
   
   Verifies the request authenticity via HMAC-SHA512 signature
   before processing the transaction result. This runs silently
   in the background — the frontend uses postMessage from the
   embedded iFrame instead.

   Endpoint: POST /api/checkout/paymob/callback
   ══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

/* ── Constants ───────────────────────────────────────────────── */

const HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET || "";

/**
 * The ordered list of fields Paymob uses to compute the HMAC.
 * These must be concatenated in this exact order.
 * @see https://docs.paymob.com/docs/hmac-calculation
 */
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

/* ── Utility: Extract Nested Field ───────────────────────────── */

/**
 * Safely extract a nested field value from an object using dot notation.
 * e.g., "order.id" → obj.order.id
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return "";
    }
    current = (current as Record<string, unknown>)[part];
  }

  return String(current ?? "");
}

/* ── HMAC Verification ───────────────────────────────────────── */

/**
 * Verifies the Paymob HMAC signature against the transaction data.
 * Returns true if the signature matches, false otherwise.
 */
function verifyHmac(
  transactionData: Record<string, unknown>,
  receivedHmac: string
): boolean {
  if (!HMAC_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Paymob Callback] CRITICAL: HMAC_SECRET not configured in production. Rejecting webhook.");
      return false;
    }
    console.warn("[Paymob Callback] HMAC_SECRET not configured. Skipping verification in dev mode.");
    return true; // Allow in dev mode when HMAC isn't configured
  }

  // Concatenate fields in the required order
  const concatenated = HMAC_FIELDS.map((field) =>
    getNestedValue(transactionData, field)
  ).join("");

  // Compute HMAC-SHA512
  const computedHmac = createHmac("sha512", HMAC_SECRET)
    .update(concatenated)
    .digest("hex");

  return computedHmac === receivedHmac;
}

/* ── POST Handler ────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hmac, obj: transactionData } = body;

    if (!transactionData) {
      console.error("[Paymob Callback] Missing transaction data in request body.");
      return NextResponse.json(
        { error: "Missing transaction data" },
        { status: 400 }
      );
    }

    /* ── HMAC Verification ─────────────────────────────────── */
    if (!verifyHmac(transactionData, hmac)) {
      console.error("[Paymob Callback] HMAC verification failed. Possible tampering.");
      return NextResponse.json(
        { error: "HMAC verification failed" },
        { status: 403 }
      );
    }

    /* ── Process Transaction Result ────────────────────────── */
    const {
      id: transactionId,
      success,
      amount_cents,
      currency,
      order,
      source_data,
    } = transactionData;

    const orderId = order?.id ?? "unknown";
    const paymentMethod = source_data?.type ?? "unknown";
    const cardLast4 = source_data?.pan ?? "****";

    console.log(
      `[Paymob Callback] Transaction #${transactionId} | ` +
      `Order #${orderId} | ` +
      `${success ? "✅ SUCCESS" : "❌ FAILED"} | ` +
      `${amount_cents / 100} ${currency} | ` +
      `Method: ${paymentMethod} (${cardLast4})`
    );

    if (success) {
      /* ── Successful Payment ─────────────────────────────── */
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
        .from("orders")
        .update({ 
          payment_status: "paid", 
          transaction_id: String(transactionId) 
        })
        .eq("id", orderId);

      if (error) {
        console.error(`[Paymob Callback] Database error updating order #${orderId} to PAID:`, error);
      } else {
        console.log(`[Paymob Callback] Order #${orderId} marked as PAID. Transaction: ${transactionId}`);
      }
      
      // TODO: Send order confirmation email
      // TODO: Update inventory/stock levels
    } else {
      /* ── Failed Payment ─────────────────────────────────── */
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
        .from("orders")
        .update({ 
          payment_status: "failed", 
          transaction_id: String(transactionId) 
        })
        .eq("id", orderId);

      if (error) {
        console.error(`[Paymob Callback] Database error updating order #${orderId} to FAILED:`, error);
      } else {
        console.log(`[Paymob Callback] Order #${orderId} payment FAILED. Transaction: ${transactionId}`);
      }
      
      // TODO: Send failure notification (optional)
    }

    // Paymob expects a 200 response to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paymob Callback] Error processing callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ── GET Handler (Transaction Response Redirect) ─────────────── */

/**
 * Handles the redirect from Paymob after a transaction.
 * This is the URL Paymob redirects the user to after payment.
 * For the embedded iFrame flow, this acts as a fallback.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("order") || "";
  const hmac = searchParams.get("hmac") || "";

  console.log(
    `[Paymob Redirect] Order #${orderId} | ${success ? "SUCCESS" : "FAILED"}`
  );

  // Redirect to appropriate page
  if (success) {
    return NextResponse.redirect(
      new URL("/checkout/success", request.url)
    );
  }

  // On failure, redirect back to checkout with error
  return NextResponse.redirect(
    new URL("/checkout?payment_error=true", request.url)
  );
}
