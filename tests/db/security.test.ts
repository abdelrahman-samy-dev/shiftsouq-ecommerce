/**
 * Database security & checkout integrity tests.
 * Run against a LOCAL Supabase (npx supabase start) — never production:
 *
 *   npm run test:db
 *
 * Every test plays an attacker or checks money/stock bookkeeping.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL);
const d = local && ANON && SERVICE ? describe : describe.skip;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let admin: SupabaseClient;
let anon: SupabaseClient;
let customer: SupabaseClient;
let customerProfileId: string;

// Seed product "Classic Polo" — 44444444-...-0001 with one variant.
const PRODUCT = "44444444-0000-0000-0000-000000000001";
let variantId: string;

async function stockOf(id: string) {
  const { data } = await admin.from("product_variants").select("stock").eq("id", id).single();
  return data!.stock as number;
}

async function placeOrder(qty: number, extra: Record<string, unknown> = {}) {
  return admin.rpc("place_order", {
    p_user_id: null,
    p_items: [{ product_id: PRODUCT, variant_id: variantId, quantity: qty, unit_price: 1 }],
    p_shipping_cost: 50,
    p_payment_method: "card",
    p_contact: { name: "Test Buyer", phone: "01000000000", email: "t@example.com", governorate: "cairo", city: "Nasr City", address: "1 Test St" },
    ...extra,
  });
}

d("database security", () => {
  beforeAll(async () => {
    admin = createClient(URL, SERVICE, opts);
    anon = createClient(URL, ANON, opts);
    customer = createClient(URL, ANON, opts);
    const email = `attacker-${Date.now()}@example.com`;
    const { error } = await customer.auth.signUp({ email, password: "Passw0rd!secure", options: { data: { first_name: "Evil", last_name: "User" } } });
    expect(error).toBeNull();
    const { data: u } = await customer.auth.getUser();
    const { data: p } = await admin.from("profiles").select("id, full_name, role").eq("auth_user_id", u.user!.id).single();
    customerProfileId = p!.id;
    expect(p!.role).toBe("customer");
    expect(p!.full_name).toBe("Evil User");

    const { data: v } = await admin.from("product_variants").select("id").eq("product_id", PRODUCT).limit(1).single();
    variantId = v!.id;
    await admin.from("product_variants").update({ stock: 20 }).eq("id", variantId);
  });

  it("a customer cannot make themselves admin", async () => {
    const { error } = await customer.from("profiles").update({ role: "admin" }).eq("id", customerProfileId);
    expect(error).not.toBeNull();
    const { data } = await admin.from("profiles").select("role").eq("id", customerProfileId).single();
    expect(data!.role).toBe("customer");
  });

  it("a customer can still edit their own name", async () => {
    const { error } = await customer.from("profiles").update({ full_name: "Renamed" }).eq("id", customerProfileId);
    expect(error).toBeNull();
  });

  it("promo codes are not listable", async () => {
    await admin.from("promocodes").upsert({ code: "SECRET50", discount_type: "percentage", discount_value: 50, is_active: true }, { onConflict: "code" });
    for (const c of [anon, customer]) {
      const { data } = await c.from("promocodes").select("*");
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("orders cannot be inserted from the browser", async () => {
    const { error } = await customer.from("orders").insert({
      user_id: customerProfileId,
      order_number: "SS-HACK",
      total: 1,
      subtotal: 1,
      status: "confirmed",
      payment_status: "paid",
    });
    expect(error).not.toBeNull();
  });

  it("order functions are not callable with the public key", async () => {
    for (const c of [anon, customer]) {
      const { error } = await c.rpc("place_order", {
        p_user_id: null,
        p_items: [{ product_id: PRODUCT, variant_id: variantId, quantity: 1 }],
        p_shipping_cost: 0,
        p_payment_method: "cod",
        p_contact: {},
      });
      expect(error).not.toBeNull();
      const paid = await c.rpc("mark_order_paid", { p_order_id: crypto.randomUUID(), p_amount_cents: 1, p_transaction_id: "x", p_success: true });
      expect(paid.error).not.toBeNull();
    }
  });

  it("prices come from the database, not the request, and stock is reserved", async () => {
    const before = await stockOf(variantId);
    const { data, error } = await placeOrder(2);
    expect(error).toBeNull();
    const row = data![0];
    const { data: product } = await admin.from("products").select("base_price, sale_price").eq("id", PRODUCT).single();
    const unit = product!.sale_price && product!.sale_price < product!.base_price ? product!.sale_price : product!.base_price;
    expect(Number(row.total)).toBe(Number(unit) * 2 + 50);
    expect(await stockOf(variantId)).toBe(before - 2);
  });

  it("refuses to oversell", async () => {
    const { error } = await placeOrder(99);
    // 99 > 20 in stock
    expect(error?.message).toMatch(/out_of_stock/);
  });

  it("a payment for less than the order total is not accepted", async () => {
    const { data } = await placeOrder(1);
    const order = data![0];
    const { data: res } = await admin.rpc("mark_order_paid", { p_order_id: order.order_id, p_amount_cents: 100, p_transaction_id: "t1", p_success: true });
    expect(res).toBe("amount_mismatch");
    const { data: o } = await admin.from("orders").select("payment_status").eq("id", order.order_id).single();
    expect(o!.payment_status).not.toBe("paid");
  });

  it("the exact amount confirms the order once", async () => {
    const { data } = await placeOrder(1);
    const order = data![0];
    const cents = Math.round(Number(order.total) * 100);
    const first = await admin.rpc("mark_order_paid", { p_order_id: order.order_id, p_amount_cents: cents, p_transaction_id: "t2", p_success: true });
    expect(first.data).toBe("paid");
    const again = await admin.rpc("mark_order_paid", { p_order_id: order.order_id, p_amount_cents: cents, p_transaction_id: "t2", p_success: true });
    expect(again.data).toBe("already_paid");
    const { data: o } = await admin.from("orders").select("payment_status, status").eq("id", order.order_id).single();
    expect(o).toMatchObject({ payment_status: "paid", status: "confirmed" });
  });

  it("cancelling gives stock back exactly once", async () => {
    const before = await stockOf(variantId);
    const { data } = await placeOrder(3);
    const id = data![0].order_id;
    expect(await stockOf(variantId)).toBe(before - 3);
    await admin.from("orders").update({ status: "cancelled" }).eq("id", id);
    expect(await stockOf(variantId)).toBe(before);
    await admin.from("orders").update({ status: "refunded" }).eq("id", id);
    expect(await stockOf(variantId)).toBe(before);
  });

  it("abandoned online orders release their stock after an hour", async () => {
    const before = await stockOf(variantId);
    const { data } = await placeOrder(4);
    const id = data![0].order_id;
    await admin.from("orders").update({ created_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", id);
    await admin.rpc("expire_unpaid_orders");
    expect(await stockOf(variantId)).toBe(before);
    const { data: o } = await admin.from("orders").select("status").eq("id", id).single();
    expect(o!.status).toBe("cancelled");
  });

  it("promo codes are applied once and respect max uses", async () => {
    await admin.from("promocodes").upsert(
      { code: "ONCE10", discount_type: "fixed", discount_value: 10, is_active: true, max_uses: 1, current_uses: 0 },
      { onConflict: "code" },
    );
    const ok = await placeOrder(1, { p_promo_code: "once10" });
    expect(ok.error).toBeNull();
    const { data: o } = await admin.from("orders").select("discount_amount").eq("id", ok.data![0].order_id).single();
    expect(Number(o!.discount_amount)).toBe(10);
    const used = await placeOrder(1, { p_promo_code: "ONCE10" });
    expect(used.error?.message).toMatch(/invalid_promo/);
  });
});
