/* ══════════════════════════════════════════════════════════════
   Checkout Server Action — Create Order in Supabase
   ──────────────────────────────────────────────────────────────
   Inserts an order row + order_items into the database.
   Called from the checkout flow BEFORE payment processing.

   Uses service_role client to bypass RLS — this is a controlled
   server action that validates input before writing.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

/* ── Types ───────────────────────────────────────────────────── */

export interface CreateOrderItem {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string | null;
  price: number;
  quantity: number;
  image: string | null;
}

export interface CreateOrderInput {
  /** Contact info */
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Shipping info */
  governorate: string;
  city: string;
  address: string;
  apartment?: string;
  postalCode?: string;
  /** Amounts */
  subtotal: number;
  shippingCost: number;
  total: number;
  /** Payment */
  paymentMethod: "cod" | "card" | "wallet";
  /** Cart items */
  items: CreateOrderItem[];
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * Generate a unique human-readable order number.
 * Format: SS-YYYYMMDD-NNNNN (e.g., SS-20260506-00142)
 * Uses timestamp ms + random to ensure uniqueness across concurrent requests.
 */
function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  // Use last 5 digits of epoch ms + 2 random chars for collision resistance
  const seqPart = String(Date.now()).slice(-5);
  const randSuffix = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `SS-${datePart}-${seqPart}${randSuffix}`;
}

/* ── Main Action ─────────────────────────────────────────────── */

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    /* ── Validate required fields ──────────────────────────── */
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Cart is empty." };
    }
    if (!input.email || !input.firstName || !input.phone) {
      return { success: false, error: "Missing required contact info." };
    }
    if (!input.address || !input.city || !input.governorate) {
      return { success: false, error: "Missing required shipping info." };
    }

    /* ── Create Supabase admin client (bypasses RLS) ────────── */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    /* ── Try to find user profile (optional — guests ok) ────── */
    let userId: string | null = null;

    // 1. Check if user is authenticated
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (user) {
      const { data: authProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (authProfile) {
        userId = authProfile.id;
      }
    }

    // 2. If not authenticated or profile not found, fallback to phone lookup / guest creation
    if (!userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", input.phone)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
      } else {
        // Create a guest profile so the FK constraint is satisfied
        const { data: guestProfile, error: guestErr } = await supabase
          .from("profiles")
          .insert({
            full_name: `${input.firstName} ${input.lastName}`,
            phone: input.phone,
            city: input.city,
            country: "EG",
            role: "customer",
          })
          .select("id")
          .single();

        if (guestErr) {
          console.error("[createOrder] Failed to create guest profile:", guestErr);
          return { success: false, error: "Failed to create order profile." };
        }
        userId = guestProfile.id;
      }
    }

    /* ── Generate order number ─────────────────────────────── */
    const orderNumber = generateOrderNumber();

    /* ── Determine initial payment status ──────────────────── */
    const paymentStatus = "unpaid"; // Always starts unpaid; updated by callback

    /* ── Insert order row ──────────────────────────────────── */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: "pending",
        payment_status: paymentStatus,
        subtotal: input.subtotal,
        discount_amount: 0,
        shipping_cost: input.shippingCost,
        tax_amount: 0,
        total: input.total,
        shipping_name: `${input.firstName} ${input.lastName}`,
        shipping_phone: input.phone,
        shipping_email: input.email,
        shipping_country: "EG",
        shipping_city: input.city,
        shipping_address: `${input.address}${input.apartment ? `, ${input.apartment}` : ""}`,
        notes: `Payment: ${input.paymentMethod.toUpperCase()} | Gov: ${input.governorate}`,
      })
      .select("id, order_number")
      .single();

    if (orderErr) {
      console.error("[createOrder] Order insert failed:", orderErr);
      return { success: false, error: "Failed to create order." };
    }

    /* ── Insert order items ────────────────────────────────── */
    const orderItems = input.items.map((item) => ({
      order_id: order.id,
      product_variant_id: item.variantId || null,
      product_name: item.name,
      variant_label: item.variantLabel,
      unit_price: item.price,
      quantity: item.quantity,
      image_url: item.image,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("[createOrder] Order items insert failed:", itemsErr);
      // Order was created but items failed — still return the order
      // Admin can investigate; better than losing the order entirely
    }

    console.log(
      `[createOrder] ✅ Order #${orderNumber} (${order.id}) created. ` +
      `${input.items.length} items, Total: ${input.total} EGP, Method: ${input.paymentMethod}`
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    };
  } catch (err) {
    console.error("[createOrder] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while creating your order.",
    };
  }
}
