"use server";

/* ══════════════════════════════════════════════════════════════
   Checkout — create an order, quote totals, preview a promo code,
   re-validate the bag
   ──────────────────────────────────────────────────────────────
   The browser sends only WHAT it wants (variant ids + quantities,
   contact details, payment method, optional promo code). Prices,
   discount, delivery and totals are computed on the server:
   delivery from the owner's store settings (shippingFeeFor),
   everything else inside the place_order() database function,
   which also reserves stock in the same transaction.

   Guests may check out: the order is stored without a user and
   this browser gets the httpOnly receipt cookie. Every refusal
   (invalid phone, payment method off or unavailable, cash on
   delivery above the limit, bad promo code, a line that can't be
   priced) happens before any stock is reserved.

   Every order reserves stock, so orders are limited: at most 20
   lines and 10 of each item, a few orders per hour per client and
   per phone, and at most 3 orders waiting for payment or
   confirmation per phone / email (checked inside place_order(),
   which also re-checks the cash on delivery ceiling).

   Promo codes work for guests too. Wrong codes are rate-limited
   per client (hashed IP, or the account when signed in): every
   try is counted first and a code that works gives its hit back.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { isKnownGovernorate } from "@/lib/checkout/shipping";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient, ServiceConfigError } from "@/lib/supabase/service";
import { getStoreSettings, shippingFeeFor } from "@/lib/settings";
import { getPaymentAvailability } from "@/lib/dal/orders";
import { rememberBuyerPhone, saveAddressFromCheckout } from "@/lib/dal/account";
import { readReceiptCookie, setReceiptCookie } from "@/lib/dal/receipt";
import { safeEqual } from "@/lib/payments/paymob";
import {
  clientKey,
  MAX_OPEN_UNPAID_ORDERS,
  ORDER_ACCOUNT_LIMIT,
  ORDER_IP_LIMIT,
  ORDER_PHONE_LIMIT,
  PROMO_LIMIT,
  rateLimit,
  refundRateLimit,
  targetKey,
} from "@/lib/checkout/rate-limit";
import type { LineStatus } from "@/lib/checkout/cart-sync";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import {
  checkoutTotals,
  COD_MAX_AMOUNT,
  MAX_ORDER_LINES,
  normalizeEgyptianMobile,
  paymentOptions,
  round2,
  type CheckoutTotals,
  type PromoFailure,
} from "@/components/checkout/checkout-rules";

/* ── Input ───────────────────────────────────────────────────── */

const itemSchema = z.object({
  productId: z.guid(),
  /** "default" (or empty) when the product has no options */
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
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
  /** Signed-in buyers only: add this address to their address book. */
  saveAddress: z.boolean().optional(),
  items: z.array(itemSchema).min(1).max(MAX_ORDER_LINES),
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
    | "too_many_items"
    | "rate_limited"
    | "too_many_open_orders"
    | "server";
  /** Why the payment method was refused, when code = "payment_unavailable". */
  paymentReason?: "store_off" | "gateway";
  /** Why the promo code was refused, when code = "invalid_promo". */
  promoReason?: PromoFailure;
  minOrder?: number;
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

/** The signed-in buyer (auth user id + profile id), or nulls for a guest. */
async function currentBuyer(): Promise<{ userId: string | null; profileId: string | null }> {
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser();
  if (!user) return { userId: null, profileId: null };
  const { data: profile } = await getServiceClient().from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  return { userId: user.id, profileId: profile?.id ?? null };
}

/* ── Action ──────────────────────────────────────────────────── */

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (Array.isArray(input?.items) && input.items.length > MAX_ORDER_LINES) {
    return { success: false, code: "too_many_items", error: `An order can have up to ${MAX_ORDER_LINES} different items.` };
  }
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

  try {
    const settings = await getStoreSettings();

    // Refuse before anything is reserved: no order (and no held stock) for a payment that can't be taken.
    const offered = paymentOptions({ enabled: settings.payments, gateway: getPaymentAvailability(), total: null });
    if (!offered[data.paymentMethod].available) {
      return {
        success: false,
        code: "payment_unavailable",
        paymentReason: offered[data.paymentMethod].reason === "store_off" ? "store_off" : "gateway",
        error: "This payment method is not available right now. Please choose another one.",
      };
    }

    /* Buyer: the signed-in user's profile, never looked up by phone or email. Guests: none. */
    const buyer = await currentBuyer();
    const db = getServiceClient();

    /* Merge duplicate lines so quantities are checked against stock once. */
    const lines = new Map<string, Line>();
    for (const it of data.items) {
      const line = toLine(it);
      const key = `${line.product_id}:${line.variant_id ?? ""}`;
      const prev = lines.get(key);
      lines.set(key, { ...line, quantity: (prev?.quantity ?? 0) + line.quantity });
    }
    if ([...lines.values()].some((l) => l.quantity > MAX_CART_QUANTITY)) {
      return { success: false, code: "invalid_input", error: `At most ${MAX_CART_QUANTITY} of one item per order.` };
    }

    /* Delivery needs the discounted subtotal: price the lines and the code first. */
    const priced = await priceLines([...lines.values()]);
    // A line that can't be priced (hidden product, a variant of another product…) is refused,
    // never counted as 0 — the cash on delivery limit is decided on this subtotal.
    const unpriced = [...lines.values()].find((_, i) => priced.unitPrices[i] == null);
    if (unpriced) {
      return {
        success: false,
        code: "product_unavailable",
        itemId: unpriced.variant_id ?? unpriced.product_id,
        error: "A product in your cart is no longer available.",
      };
    }
    let discount = 0;
    if (data.promoCode) {
      const promo = await checkPromo(data.promoCode, priced.subtotal, buyer.userId);
      if (!promo.ok) {
        return {
          success: false,
          code: "invalid_promo",
          promoReason: promo.reason,
          minOrder: promo.minOrder,
          error: "This promo code is not valid for your order.",
        };
      }
      discount = promo.discount;
    }
    const afterDiscount = round2(priced.subtotal - discount);
    const fee = shippingFeeFor(settings.shipping, data.governorate, afterDiscount);

    const withTotal = paymentOptions({ enabled: settings.payments, gateway: getPaymentAvailability(), total: afterDiscount + fee });
    if (data.paymentMethod === "cod" && !withTotal.cod.available) {
      return { success: false, code: "cod_limit", error: "Cash on delivery isn't available for this amount. Please pay online." };
    }

    /* Each order holds stock: a few per hour per client and per phone number. */
    const [byClient, byPhone] = await Promise.all([
      rateLimit("order", await clientKey(buyer.userId), buyer.userId ? ORDER_ACCOUNT_LIMIT : ORDER_IP_LIMIT),
      rateLimit("order-phone", targetKey(phone), ORDER_PHONE_LIMIT),
    ]);
    if (!byClient || !byPhone) {
      return { success: false, code: "rate_limited", error: "Too many orders in a short time. Please try again later." };
    }

    const contact = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone,
      email: data.email.trim(),
      governorate: data.governorate,
      city: data.city,
      address: [data.address, data.apartment].filter(Boolean).join(", "),
      notes: [data.notes, data.postalCode ? `Postal code: ${data.postalCode}` : null].filter(Boolean).join("\n") || null,
    };

    const { data: rows, error } = await db.rpc("place_order", {
      p_user_id: buyer.profileId,
      p_items: [...lines.values()],
      p_shipping_cost: fee,
      p_payment_method: data.paymentMethod,
      p_contact: contact,
      p_promo_code: data.promoCode || null,
      // Re-checked inside the transaction, on the total it computes itself.
      p_cod_max: COD_MAX_AMOUNT,
      p_max_open_orders: MAX_OPEN_UNPAID_ORDERS,
    });

    if (error) return mapOrderError(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { success: false, code: "server", error: "Failed to create order." };

    // Lets this browser see the receipt (and resume payment) even after leaving for Paymob.
    await setReceiptCookie(row.order_id, row.access_token);

    if (buyer.profileId && !data.saveAddress) await rememberBuyerPhone(phone);
    if (buyer.profileId && data.saveAddress) {
      await saveAddressFromCheckout({
        fullName: contact.name,
        phone,
        governorate: data.governorate,
        city: data.city,
        address: data.address,
        apartment: data.apartment ?? "",
        postalCode: data.postalCode ?? "",
      });
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

/* ── Pricing (display + delivery decision) ───────────────────── */

type ProductRow = {
  id: string;
  base_price: number | string;
  sale_price: number | string | null;
  is_active: boolean;
  product_variants: { id: string; price_override: number | string | null; stock: number | null }[] | null;
};

async function loadProducts(productIds: string[]): Promise<ProductRow[]> {
  if (productIds.length === 0) return [];
  const { data } = await getServiceClient()
    .from("products")
    .select("id, base_price, sale_price, is_active, product_variants(id, price_override, stock)")
    .in("id", productIds);
  return (data ?? []) as ProductRow[];
}

/** The variant a cart line means: its own id, or the only variant of a product without options. */
function resolveVariant(p: ProductRow, variantId: string | null) {
  const variants = p.product_variants ?? [];
  return variantId ? variants.find((x) => x.id === variantId) : variants.length === 1 ? variants[0] : undefined;
}

/** Same rule as place_order(): variant override, else a real sale price, else the base price. */
function unitPriceOf(p: ProductRow, v: { price_override: number | string | null }): number {
  const base = Number(p.base_price);
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  return v.price_override != null ? Number(v.price_override) : sale != null && sale > 0 && sale < base ? sale : base;
}

/**
 * Unit prices from the database, priced exactly like place_order(). The
 * authoritative amounts are recomputed (with row locks) by place_order().
 */
async function priceLines(lines: Line[]): Promise<{ subtotal: number; unitPrices: (number | null)[] }> {
  const products = await loadProducts([...new Set(lines.map((l) => l.product_id))]);
  let subtotal = 0;
  const unitPrices = lines.map((l) => {
    const p = products.find((x) => x.id === l.product_id);
    if (!p || !p.is_active) return null;
    const v = resolveVariant(p, l.variant_id);
    if (!v) return null;
    const price = unitPriceOf(p, v);
    subtotal += price * l.quantity;
    return price;
  });
  return { subtotal: round2(subtotal), unitPrices };
}

/* ── Promo codes ─────────────────────────────────────────────── */

export interface PromoPreview {
  ok: boolean;
  discount: number;
  reason?: PromoFailure;
  minOrder?: number;
}

async function promoDiscount(code: string, subtotal: number): Promise<PromoPreview> {
  const { data } = await getServiceClient().rpc("preview_promo", { p_code: code, p_subtotal: subtotal });
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return { ok: false, discount: 0, reason: "invalid" };
  return r.ok
    ? { ok: true, discount: Number(r.discount) }
    : { ok: false, discount: 0, reason: r.reason, minOrder: r.reason === "min_order" ? Number(r.discount) : undefined };
}

/**
 * A promo code check. Every try is counted first (so concurrent guesses can't
 * all pass one check), a code that works gives its hit back, and the client is
 * refused outright once it has used up its wrong attempts.
 */
async function checkPromo(code: string, subtotal: number, userId: string | null): Promise<PromoPreview> {
  const key = await clientKey(userId);
  if (!(await rateLimit("promo", key, PROMO_LIMIT, 1))) return { ok: false, discount: 0, reason: "rate_limited" };
  const result = await promoDiscount(code, subtotal);
  if (result.ok) await refundRateLimit("promo", key, PROMO_LIMIT);
  return result;
}

/* ── Promo preview (the "Apply" button) ──────────────────────── */

export async function previewPromoCode(code: string, items: CreateOrderInput["items"]): Promise<PromoPreview> {
  const c = z.string().trim().min(1).max(40).safeParse(code);
  const its = z.array(itemSchema).min(1).max(50).safeParse(items);
  if (!c.success || !its.success) return { ok: false, discount: 0, reason: "invalid" };
  try {
    const { userId } = await currentBuyer();
    const { subtotal } = await priceLines(its.data.map(toLine));
    return await checkPromo(c.data, subtotal, userId);
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
    const [settings, priced] = await Promise.all([getStoreSettings(), priceLines(items.map(toLine))]);
    let promo: CheckoutQuote["promo"] = null;
    if (promoCode) {
      const { userId } = await currentBuyer();
      promo = { code: promoCode, ...(await checkPromo(promoCode, priced.subtotal, userId)) };
    }
    const unitPrices: Record<string, number | null> = {};
    items.forEach((it, i) => {
      unitPrices[`${it.productId}:${it.variantId ?? ""}`] = priced.unitPrices[i];
    });
    return {
      ok: true,
      ...checkoutTotals(priced.subtotal, promo?.ok ? promo.discount : 0, governorate, settings.shipping),
      unitPrices,
      promo,
    };
  } catch (err) {
    console.error("[quoteCheckout]", err);
    return empty;
  }
}

/* ── Bag re-validation (cart page) ───────────────────────────── */

const validateSchema = z
  .array(z.object({ productId: z.guid(), variantId: z.string().max(64).optional() }))
  .min(1)
  .max(50);

/**
 * Current price, stock and availability of each bag line, keyed
 * "<productId>:<variantId>" exactly as sent. Public catalogue data only.
 */
export async function validateCart(lines: { productId: string; variantId?: string }[]): Promise<Record<string, LineStatus>> {
  const parsed = validateSchema.safeParse(lines);
  if (!parsed.success) return {};
  try {
    const products = await loadProducts([...new Set(parsed.data.map((l) => l.productId))]);
    const out: Record<string, LineStatus> = {};
    for (const l of parsed.data) {
      const key = `${l.productId}:${l.variantId ?? ""}`;
      const p = products.find((x) => x.id === l.productId);
      const v = p ? resolveVariant(p, l.variantId && isUuid(l.variantId) ? l.variantId : null) : undefined;
      out[key] =
        p && v && p.is_active
          ? { available: true, price: unitPriceOf(p, v), stock: Math.max(0, Number(v.stock ?? 0)) }
          : { available: false, price: null, stock: 0 };
    }
    return out;
  } catch (err) {
    console.error("[validateCart]", err);
    return {};
  }
}

/* ── Abandoning an unpaid online order (details changed) ─────── */

/**
 * Cancels this browser's unpaid card / wallet order (receipt cookie, or the
 * signed-in owner) so its stock goes back before a new order is placed.
 * Only pending + unpaid/failed online orders; a payment confirmed meanwhile wins.
 */
export async function releaseCheckoutOrder(orderId: string): Promise<{ ok: boolean }> {
  if (!z.guid().safeParse(orderId).success) return { ok: false };
  try {
    const db = getServiceClient();
    const { data: order } = await db.from("orders").select("id, access_token, user_id").eq("id", orderId).maybeSingle();
    if (!order) return { ok: false };

    const remembered = await readReceiptCookie();
    const viaCookie = !!remembered && remembered.orderId === order.id && safeEqual(String(order.access_token), remembered.accessToken);
    let viaAccount = false;
    if (!viaCookie) {
      const { profileId } = await currentBuyer();
      viaAccount = !!profileId && order.user_id === profileId;
    }
    if (!viaCookie && !viaAccount) return { ok: false };

    const { data, error } = await db
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("status", "pending")
      .in("payment_status", ["unpaid", "failed"])
      .in("payment_method", ["card", "wallet"])
      .select("id");
    if (error) {
      console.error("[releaseCheckoutOrder]", error.message);
      return { ok: false };
    }
    return { ok: (data?.length ?? 0) > 0 };
  } catch (err) {
    console.error("[releaseCheckoutOrder] unexpected:", err);
    return { ok: false };
  }
}

/* ── Errors from place_order() ───────────────────────────────── */

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
      return { success: false, code, promoReason: "invalid", error: "This promo code is not valid for your order." };
    case "cod_limit":
      return { success: false, code, error: "Cash on delivery isn't available for this amount. Please pay online." };
    case "too_many_open_orders":
      return { success: false, code, error: "You already have orders waiting for payment or confirmation." };
    case "too_many_items":
      return { success: false, code, error: `An order can have up to ${MAX_ORDER_LINES} different items.` };
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
