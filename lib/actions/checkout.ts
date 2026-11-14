"use server";

/* ══════════════════════════════════════════════════════════════
   Checkout — create an order, quote totals, preview a promo code
   ──────────────────────────────────────────────────────────────
   The browser sends only WHAT it wants (variant ids + quantities,
   contact details, payment method, optional promo code). Prices,
   discount, shipping and totals are computed on the server:
   shipping from lib/checkout/shipping, everything else inside the
   place_order() database function, which also reserves stock in
   the same transaction.

   quoteCheckout() shows the buyer the same numbers before they
   order: server prices, promo discount, shipping and total.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { shippingFee, isKnownGovernorate } from "@/lib/checkout/shipping";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient, ServiceConfigError } from "@/lib/supabase/service";
import { getPaymentAvailability, saveCheckoutAddress } from "@/lib/dal/orders";
import { setReceiptCookie } from "@/lib/dal/receipt";
import {
  COD_MAX_AMOUNT,
  checkoutTotals,
  normalizeEgyptianMobile,
  round2,
  type CheckoutTotals,
  type PromoFailure,
} from "@/components/checkout/checkout-rules";

/* ── Input ───────────────────────────────────────────────────── */

const itemSchema = z.object({
  productId: z.guid(),
  /** "default" (or empty) when the product has no options */
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(99),
});

const orderSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).default(""),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(20),
  governorate: z.string().trim().min(1).max(40),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(3).max(240),
  apartment: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cod", "card", "wallet"]),
  promoCode: z.string().trim().max(40).optional(),
  /** Signed-in buyers only: keep this address on their profile for next time. */
  saveAddress: z.boolean().optional(),
  items: z.array(itemSchema).min(1).max(50),
});

export type CreateOrderInput = z.input<typeof orderSchema>;

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  /** Final amount charged, computed by the server (EGP). */
  total?: number;
  /** Secret that lets this browser pay for / view the order (guests included). */
  accessToken?: string;
  error?: string;
  /** Machine-readable reason, e.g. "out_of_stock" */
  code?:
    | "invalid_input"
    | "invalid_phone"
    | "out_of_stock"
    | "product_unavailable"
    | "choose_variant"
    | "invalid_promo"
    | "payment_unavailable"
    | "cod_limit"
    | "server";
  /** Variant / product that caused the failure, when known. */
  itemId?: string;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type Line = { product_id: string; variant_id: string | null; quantity: number };

const toLine = (it: z.infer<typeof itemSchema>): Line => ({
  product_id: it.productId,
  variant_id: it.variantId && isUuid(it.variantId) ? it.variantId : null,
  quantity: it.quantity,
});

/* ── Action ──────────────────────────────────────────────────── */

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "invalid_input", error: parsed.error.issues[0]?.message ?? "Invalid order details." };
  }
  const data = parsed.data;
  if (!isKnownGovernorate(data.governorate)) {
    return { success: false, code: "invalid_input", error: "Unknown governorate." };
  }
  const phone = normalizeEgyptianMobile(data.phone);
  if (!phone) {
    return { success: false, code: "invalid_phone", error: "Please enter an Egyptian mobile number (01XXXXXXXXX)." };
  }
  // Refuse before anything is reserved: no order (and no held stock) for a payment that can't be taken.
  if (data.paymentMethod !== "cod" && !getPaymentAvailability()[data.paymentMethod]) {
    return {
      success: false,
      code: "payment_unavailable",
      error: "This payment method is temporarily unavailable. Please choose cash on delivery.",
    };
  }

  try {
    /* Buyer: the signed-in user's profile, never looked up by phone. */
    let profileId: string | null = null;
    const auth = await createServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    const db = getServiceClient();
    if (user) {
      const { data: profile } = await db.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      profileId = profile?.id ?? null;
    }

    /* Merge duplicate lines so quantities are checked against stock once. */
    const lines = new Map<string, Line>();
    for (const it of data.items) {
      const line = toLine(it);
      const key = `${line.product_id}:${line.variant_id ?? ""}`;
      const prev = lines.get(key);
      lines.set(key, { ...line, quantity: Math.min(99, (prev?.quantity ?? 0) + line.quantity) });
    }

    /* Shipping needs the discounted subtotal: price once without shipping, then with. */
    const priced = await priceLines([...lines.values()]);
    const promo = data.promoCode ? await promoDiscount(data.promoCode, priced.subtotal) : null;
    const afterDiscount = round2(priced.subtotal - (promo?.ok ? promo.discount : 0));
    const fee = shippingFee(data.governorate, afterDiscount);

    if (data.paymentMethod === "cod" && afterDiscount + fee > COD_MAX_AMOUNT) {
      return {
        success: false,
        code: "cod_limit",
        error: `Cash on delivery is available for orders up to EGP ${COD_MAX_AMOUNT}. Please pay online.`,
      };
    }

    const contact = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone,
      email: data.email,
      governorate: data.governorate,
      city: data.city,
      address: [data.address, data.apartment].filter(Boolean).join(", "),
      notes: [data.notes, data.postalCode ? `Postal code: ${data.postalCode}` : null].filter(Boolean).join("\n") || null,
    };

    const { data: rows, error } = await db.rpc("place_order", {
      p_user_id: profileId,
      p_items: [...lines.values()],
      p_shipping_cost: fee,
      p_payment_method: data.paymentMethod,
      p_contact: contact,
      p_promo_code: data.promoCode || null,
    });

    if (error) return mapOrderError(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { success: false, code: "server", error: "Failed to create order." };

    // Lets this browser see the receipt (and resume payment) even after leaving for Paymob.
    await setReceiptCookie(row.order_id, row.access_token);

    if (user && profileId && data.saveAddress) {
      await saveCheckoutAddress(
        { governorate: data.governorate, city: data.city, address: data.address, apartment: data.apartment, postalCode: data.postalCode },
        phone,
      );
    }

    return {
      success: true,
      orderId: row.order_id,
      orderNumber: row.order_number,
      total: Number(row.total),
      accessToken: row.access_token,
    };
  } catch (err) {
    if (err instanceof ServiceConfigError) console.error("[createOrder] configuration:", err.message);
    else console.error("[createOrder] unexpected:", err);
    return { success: false, code: "server", error: "We couldn't place your order. Please try again." };
  }
}

/* ── Pricing (display + shipping decision) ───────────────────── */

/**
 * Unit prices from the database, priced exactly like place_order(). The
 * authoritative amounts are recomputed (with row locks) by place_order().
 */
async function priceLines(lines: Line[]): Promise<{ subtotal: number; unitPrices: (number | null)[] }> {
  const db = getServiceClient();
  const productIds = [...new Set(lines.map((l) => l.product_id))];
  const { data: products } = await db
    .from("products")
    .select("id, base_price, sale_price, is_active, product_variants(id, price_override)")
    .in("id", productIds);
  let subtotal = 0;
  const unitPrices = lines.map((l) => {
    const p = products?.find((x) => x.id === l.product_id);
    if (!p || !p.is_active) return null;
    const variants = (p.product_variants ?? []) as { id: string; price_override: number | null }[];
    const v = l.variant_id ? variants.find((x) => x.id === l.variant_id) : variants.length === 1 ? variants[0] : undefined;
    if (!v) return null;
    const base = Number(p.base_price);
    const sale = p.sale_price != null ? Number(p.sale_price) : null;
    const price = v.price_override != null ? Number(v.price_override) : sale != null && sale > 0 && sale < base ? sale : base;
    subtotal += price * l.quantity;
    return price;
  });
  return { subtotal: round2(subtotal), unitPrices };
}

/** Promo codes are checked for signed-in buyers only (checkout requires an account), so they can't be probed anonymously. */
async function isSignedIn(): Promise<boolean> {
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser();
  return !!user;
}

async function promoDiscount(code: string, subtotal: number): Promise<PromoPreview> {
  const { data } = await getServiceClient().rpc("preview_promo", { p_code: code, p_subtotal: subtotal });
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return { ok: false, discount: 0, reason: "invalid" };
  return r.ok
    ? { ok: true, discount: Number(r.discount) }
    : { ok: false, discount: 0, reason: r.reason, minOrder: r.reason === "min_order" ? Number(r.discount) : undefined };
}

function mapOrderError(message: string): CreateOrderResult {
  const [code, id] = message.split(":");
  switch (code) {
    case "out_of_stock":
      return { success: false, code, itemId: id, error: "Some items are no longer available in the quantity you chose." };
    case "product_unavailable":
      return { success: false, code, itemId: id, error: "A product in your cart is no longer available." };
    case "choose_variant":
      return { success: false, code, itemId: id, error: "Please choose a size or colour for every product." };
    case "invalid_promo":
      return { success: false, code, error: "This promo code is not valid for your order." };
    case "empty_cart":
    case "invalid_quantity":
    case "invalid_payment_method":
    case "invalid_shipping":
      return { success: false, code: "invalid_input", error: "Invalid order details." };
    default:
      console.error("[createOrder] place_order failed:", message);
      return { success: false, code: "server", error: "We couldn't place your order. Please try again." };
  }
}

/* ── Promo preview (for the checkout summary) ─────────────────── */

export interface PromoPreview {
  ok: boolean;
  discount: number;
  reason?: PromoFailure;
  minOrder?: number;
}

export async function previewPromoCode(code: string, items: CreateOrderInput["items"]): Promise<PromoPreview> {
  const c = z.string().trim().min(1).max(40).safeParse(code);
  const its = z.array(itemSchema).min(1).max(50).safeParse(items);
  if (!c.success || !its.success) return { ok: false, discount: 0, reason: "invalid" };
  try {
    if (!(await isSignedIn())) return { ok: false, discount: 0, reason: "invalid" };
    const { subtotal } = await priceLines(its.data.map(toLine));
    return await promoDiscount(c.data, subtotal);
  } catch {
    return { ok: false, discount: 0, reason: "invalid" };
  }
}

/* ── Quote: what the server will charge ──────────────────────── */

export interface CheckoutQuote extends CheckoutTotals {
  ok: boolean;
  /** Server unit price per cart line, keyed "<productId>:<variantId>" exactly as sent; null = can't be bought. */
  unitPrices: Record<string, number | null>;
  /** Result for the promo code sent, if any. */
  promo: (PromoPreview & { code: string }) | null;
}

const quoteSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  governorate: z.string().trim().max(40).optional(),
  promoCode: z.string().trim().max(40).optional(),
});

export async function quoteCheckout(input: z.input<typeof quoteSchema>): Promise<CheckoutQuote> {
  const empty: CheckoutQuote = {
    ok: false,
    ...checkoutTotals(0, 0, null),
    unitPrices: {},
    promo: null,
  };
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return empty;
  try {
    const { items, governorate, promoCode } = parsed.data;
    const priced = await priceLines(items.map(toLine));
    const promo = promoCode
      ? {
          code: promoCode,
          ...((await isSignedIn())
            ? await promoDiscount(promoCode, priced.subtotal)
            : { ok: false, discount: 0, reason: "invalid" as const }),
        }
      : null;
    const unitPrices: Record<string, number | null> = {};
    items.forEach((it, i) => {
      unitPrices[`${it.productId}:${it.variantId ?? ""}`] = priced.unitPrices[i];
    });
    return {
      ok: true,
      ...checkoutTotals(priced.subtotal, promo?.ok ? promo.discount : 0, governorate),
      unitPrices,
      promo,
    };
  } catch (err) {
    console.error("[quoteCheckout]", err);
    return empty;
  }
}
