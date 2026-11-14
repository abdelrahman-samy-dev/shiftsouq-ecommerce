/**
 * Security review fixes (2026-11-14) against the LOCAL Supabase (npm run test:db).
 * Works on a fresh database: accounts and two throwaway products are created
 * here with the service key, and everything the tests create is removed again.
 *
 * Covered: Paymob callback order swap / transaction reuse / flat redirect HMAC,
 * stock-exhaustion limits, the cash on delivery bypass, paying after cancel,
 * internal notes, profile deletion rules, review columns and contact inserts.
 */
import { createHmac, randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* ── A request context for the server action (cookies + client IP) ── */
const ctx = vi.hoisted(() => ({ ip: "198.51.100.1", jar: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...ctx.jar].map(([name, value]) => ({ name, value })),
    get: (name: string) => (ctx.jar.has(name) ? { name, value: ctx.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void ctx.jar.set(name, value),
    delete: (name: string) => void ctx.jar.delete(name),
  }),
  headers: async () => new Headers({ "x-real-ip": ctx.ip }),
}));

import { createOrder, type CreateOrderInput } from "@/lib/actions/checkout";
import { ORDER_PHONE_LIMIT, targetKey } from "@/lib/checkout/rate-limit";
import { GET as paymobReturn, POST as paymobCallback } from "@/app/api/checkout/paymob/callback/route";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL);
const d = local && ANON && SERVICE ? describe : describe.skip;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

const HMAC_SECRET = "security-fixes-test-secret";
const RUN = randomUUID().slice(0, 8);

let service: SupabaseClient;
let anon: SupabaseClient;
let owner: SupabaseClient;
let staff: SupabaseClient;
let buyer: SupabaseClient;
let ownerProfile: string;
let staffProfile: string;
let buyerProfile: string;

/** Throwaway catalogue: product A (two sizes, EGP 1,200) and product B (one variant, EGP 300). */
let productA: string;
let productB: string;
let variantA1: string;
let variantA2: string;
let variantB: string;
const orders: string[] = [];
const users: string[] = [];

const phone = () => `010${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
const ip = () => `203.0.113.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 6)}`;

async function signIn(email: string, password: string) {
  const c = createClient(URL, ANON, opts);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
}

async function ensureAccount(email: string, password: string, role: "super_admin" | "admin" | "customer") {
  const { data: list, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  let id = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (!id) {
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: "Test", last_name: role } });
    if (created.error) throw created.error;
    id = created.data.user.id;
  } else {
    await service.auth.admin.updateUserById(id, { password });
  }
  const { error: roleError } = await service.from("profiles").upsert({ auth_user_id: id, role }, { onConflict: "auth_user_id" });
  if (roleError) throw roleError;
  const { data } = await service.from("profiles").select("id").eq("auth_user_id", id).single();
  return data!.id as string;
}

async function stockOf(id: string) {
  const { data } = await service.from("product_variants").select("stock").eq("id", id).single();
  return data!.stock as number;
}

async function place(items: { product_id: string; variant_id: string | null; quantity: number }[], extra: Record<string, unknown> = {}) {
  const res = await service.rpc("place_order", {
    p_user_id: null,
    p_items: items,
    p_shipping_cost: 50,
    p_payment_method: "card",
    p_contact: { name: "Sec Test", phone: phone(), email: `sec.${RUN}@example.com`, governorate: "cairo", city: "Cairo", address: "1 Test St" },
    ...extra,
  });
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  if (row?.order_id) orders.push(row.order_id);
  return { ...res, row: row as { order_id: string; order_number: string; total: number } | undefined };
}

/** Registers a Paymob order (as startOnlinePayment does) for an order. */
async function attempt(orderId: string, amountCents?: number) {
  const { data: o } = await service.from("orders").select("total").eq("id", orderId).single();
  const id = `pm-${RUN}-${randomUUID().slice(0, 8)}`;
  const { error } = await service
    .from("payment_attempts")
    .insert({ paymob_order_id: id, order_id: orderId, amount_cents: amountCents ?? Math.round(Number(o!.total) * 100) });
  if (error) throw error;
  return id;
}

/* ── Paymob signatures ─────────────────────────────────────────── */
const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id",
  "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id",
  "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
] as const;

function txnFor(paymobOrderId: string, amountCents: number, merchantOrderId: string, transactionId = Math.floor(Math.random() * 1e12)) {
  return {
    amount_cents: amountCents,
    created_at: "2026-11-14T10:00:00",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: transactionId,
    integration_id: 1,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: paymobOrderId, merchant_order_id: merchantOrderId },
    owner: 1,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
  };
}

function sign(txn: ReturnType<typeof txnFor>) {
  const pick = (path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], txn);
  return createHmac("sha512", HMAC_SECRET).update(HMAC_FIELDS.map((f) => String(pick(f) ?? "")).join("")).digest("hex");
}

/** Posts a (signed) webhook body to the real route handler. */
async function callback(txn: ReturnType<typeof txnFor>, hmac = sign(txn)) {
  const req = new NextRequest(`http://localhost/api/checkout/paymob/callback?hmac=${hmac}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "TRANSACTION", obj: txn }),
  });
  const res = await paymobCallback(req);
  return { status: res.status, body: (await res.json()) as { result?: string } };
}

async function orderRow(id: string) {
  const { data } = await service
    .from("orders")
    .select("status, payment_status, transaction_id, needs_refund, stock_released, promo_released, notes")
    .eq("id", id)
    .single();
  return data!;
}

const guestOrder = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  firstName: "Sec",
  lastName: "Test",
  email: `guest.${RUN}.${randomUUID().slice(0, 6)}@example.com`,
  phone: phone(),
  governorate: "cairo",
  city: "Cairo",
  address: "1 Test Street",
  paymentMethod: "cod",
  items: [{ productId: productB, variantId: variantB, quantity: 1 }],
  ...over,
});

d("security review fixes (database)", () => {
  beforeAll(async () => {
    process.env.PAYMOB_HMAC_SECRET = HMAC_SECRET;
    service = createClient(URL, SERVICE, opts);
    anon = createClient(URL, ANON, opts);
    ownerProfile = await ensureAccount("admin@shiftsouq.local", "Admin12345!", "super_admin");
    staffProfile = await ensureAccount("e2e.admin@shiftsouq.local", "E2e-Admin-12345", "admin");
    buyerProfile = await ensureAccount("buyer@shiftsouq.local", "Buyer12345!", "customer");
    [owner, staff, buyer] = await Promise.all([
      signIn("admin@shiftsouq.local", "Admin12345!"),
      signIn("e2e.admin@shiftsouq.local", "E2e-Admin-12345"),
      signIn("buyer@shiftsouq.local", "Buyer12345!"),
    ]);

    const { data: cat } = await service.from("categories").select("id").limit(1).single();
    const mk = async (suffix: string, price: number) => {
      const { data, error } = await service
        .from("products")
        .insert({ category_id: cat!.id, name_en: `Sec test ${suffix}`, name_ar: `اختبار ${suffix}`, slug: `sec-test-${RUN}-${suffix}`, base_price: price, is_active: true })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    };
    productA = await mk("a", 1200);
    productB = await mk("b", 300);
    const { data: va, error: vErr } = await service
      .from("product_variants")
      .insert([
        { product_id: productA, sku: `SEC-${RUN}-A1`, size: "S", stock: 50 },
        { product_id: productA, sku: `SEC-${RUN}-A2`, size: "M", stock: 50 },
        { product_id: productB, sku: `SEC-${RUN}-B`, stock: 50 },
      ])
      .select("id, sku");
    if (vErr) throw vErr;
    variantA1 = va!.find((v) => v.sku.endsWith("A1"))!.id;
    variantA2 = va!.find((v) => v.sku.endsWith("A2"))!.id;
    variantB = va!.find((v) => v.sku.endsWith("-B"))!.id;
  });

  afterAll(async () => {
    if (!service) return;
    // Orders created by createOrder are found by their test emails.
    const { data: guestOrders } = await service.from("orders").select("id").like("shipping_email", `%.${RUN}%@example.com`);
    const ids = [...new Set([...orders, ...(guestOrders ?? []).map((o) => o.id as string)])];
    if (ids.length) await service.from("orders").delete().in("id", ids);
    for (const p of [productA, productB]) if (p) await service.from("products").delete().eq("id", p);
    for (const u of users) await service.auth.admin.deleteUser(u);
    await service.from("promocodes").delete().like("code", `SEC${RUN.toUpperCase()}%`);
  });

  /* ── 1. Paymob callback ──────────────────────────────────────── */

  it("a signed callback can't be pointed at another order with the same total", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const b = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    expect(a.error).toBeNull();
    expect(Number(a.row!.total)).toBe(Number(b.row!.total));
    const pmA = await attempt(a.row!.order_id);
    const cents = Math.round(Number(a.row!.total) * 100);

    // Paid for A, but merchant_order_id (not signed) names B.
    const txn = txnFor(pmA, cents, b.row!.order_id);
    const first = await callback(txn);
    expect(first.status).toBe(200);
    expect(first.body.result).toBe("paid");
    expect((await orderRow(a.row!.order_id)).payment_status).toBe("paid");
    expect((await orderRow(b.row!.order_id)).payment_status).toBe("unpaid");

    // Replaying the same signed body changes nothing.
    const replay = await callback(txn);
    expect(replay.body.result).toBe("already_paid");
    expect((await orderRow(b.row!.order_id)).payment_status).toBe("unpaid");

    // A tampered body (another Paymob order id) fails the signature.
    const forged = await callback({ ...txn, order: { ...txn.order, id: `${pmA}x` } }, sign(txn));
    expect(forged.status).toBe(403);
  });

  it("one transaction id can confirm one order only", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const b = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const [pmA, pmB] = [await attempt(a.row!.order_id), await attempt(b.row!.order_id)];
    const cents = Math.round(Number(a.row!.total) * 100);
    const txnId = Math.floor(Math.random() * 1e12);

    expect((await callback(txnFor(pmA, cents, a.row!.order_id, txnId))).body.result).toBe("paid");
    expect((await callback(txnFor(pmB, cents, b.row!.order_id, txnId))).body.result).toBe("transaction_reused");
    expect((await orderRow(b.row!.order_id)).payment_status).toBe("unpaid");

    // The database refuses an attempt that belongs to another order, whatever the caller says.
    const direct = await service.rpc("mark_order_paid", {
      p_order_id: b.row!.order_id,
      p_paymob_order_id: pmA,
      p_amount_cents: cents,
      p_transaction_id: `direct-${RUN}`,
      p_success: true,
    });
    expect(direct.data).toBe("unknown_attempt");
    // …and a Paymob order nobody registered.
    expect((await callback(txnFor(`pm-unknown-${RUN}`, cents, b.row!.order_id))).body.result).toBe("unknown_attempt");
    expect((await orderRow(b.row!.order_id)).payment_status).toBe("unpaid");
  });

  it("a Paymob order written only on the order (previous app version) still becomes an attempt", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const pm = `pm-legacy-${RUN}-${randomUUID().slice(0, 6)}`;
    await service.from("orders").update({ paymob_order_id: pm }).eq("id", a.row!.order_id);
    const { data } = await service.from("payment_attempts").select("order_id, amount_cents").eq("paymob_order_id", pm).single();
    expect(data).toMatchObject({ order_id: a.row!.order_id, amount_cents: Math.round(Number(a.row!.total) * 100) });
    expect((await callback(txnFor(pm, data!.amount_cents, "not-used"))).body.result).toBe("paid");
  });

  it("a second payment, a refund and a void for a paid order are recorded for the owner", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const pmA = await attempt(a.row!.order_id);
    const cents = Math.round(Number(a.row!.total) * 100);
    expect((await callback(txnFor(pmA, cents, a.row!.order_id))).body.result).toBe("paid");
    expect((await callback(txnFor(pmA, cents, a.row!.order_id))).body.result).toBe("already_paid_other");
    const refund = { ...txnFor(pmA, cents, a.row!.order_id), is_refunded: true, success: true };
    expect((await callback(refund)).body.result).toBe("refund");
    const voided = { ...txnFor(pmA, cents, a.row!.order_id), is_voided: true };
    expect((await callback(voided)).body.result).toBe("void");

    const { data: log } = await service.from("audit_log").select("action, actor_id").eq("entity", "payment").eq("entity_id", a.row!.order_id);
    expect((log ?? []).map((l) => l.action).sort()).toEqual(["payment.duplicate", "payment.refund", "payment.void"]);
    expect((log ?? []).every((l) => l.actor_id === null)).toBe(true);
    expect((await orderRow(a.row!.order_id)).payment_status).toBe("paid");
  });

  it("a wrong amount is refused and noted outside the customer's order notes", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }], {
      p_contact: { name: "Sec Test", phone: phone(), email: `sec.${RUN}@example.com`, governorate: "cairo", city: "Cairo", address: "1", notes: "Ring twice" },
    });
    const pmA = await attempt(a.row!.order_id);
    expect((await callback(txnFor(pmA, 100, a.row!.order_id))).body.result).toBe("amount_mismatch");
    const row = await orderRow(a.row!.order_id);
    expect(row.payment_status).not.toBe("paid");
    expect(row.notes).toBe("Ring twice");
    const { data: log } = await service.from("audit_log").select("action").eq("entity", "payment").eq("entity_id", a.row!.order_id);
    expect((log ?? []).map((l) => l.action)).toContain("payment.amount_mismatch");
  });

  it("the return page verifies Paymob's flat query (order id under `order`) and finds the order by its attempt", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }]);
    const pmA = await attempt(a.row!.order_id);
    const txn = txnFor(pmA, Math.round(Number(a.row!.total) * 100), "11111111-2222-3333-4444-555555555555");
    const q = new URLSearchParams({
      amount_cents: String(txn.amount_cents),
      created_at: txn.created_at,
      currency: txn.currency,
      error_occured: "false",
      has_parent_transaction: "false",
      id: String(txn.id),
      integration_id: "1",
      is_3d_secure: "true",
      is_auth: "false",
      is_capture: "false",
      is_refunded: "false",
      is_standalone_payment: "true",
      is_voided: "false",
      order: pmA,
      owner: "1",
      pending: "false",
      "source_data.pan": "2346",
      "source_data.sub_type": "MasterCard",
      "source_data.type": "card",
      success: "true",
      merchant_order_id: txn.order.merchant_order_id,
      hmac: sign(txn),
    });
    const ok = await (await paymobReturn(new NextRequest(`http://localhost/api/checkout/paymob/callback?${q}`))).text();
    expect(ok).toContain(`/checkout/success?order=${a.row!.order_number}`);

    q.set("hmac", "0".repeat(128));
    const bad = await (await paymobReturn(new NextRequest(`http://localhost/api/checkout/paymob/callback?${q}`))).text();
    expect(bad).toContain("/checkout?payment_error=true");
    expect(bad).not.toContain(a.row!.order_number);
  });

  /* ── 2 & 4. Orders: caps, cash on delivery bypass, rate limits ── */

  it("place_order refuses a variant of another product, too many lines or units, and COD above the limit", async () => {
    const mismatch = await place([{ product_id: productB, variant_id: variantA1, quantity: 1 }]);
    expect(mismatch.error?.message).toMatch(/^product_unavailable/);

    const lines = Array.from({ length: 21 }, () => ({ product_id: productB, variant_id: variantB, quantity: 1 }));
    expect((await place(lines)).error?.message).toBe("too_many_items");
    expect((await place([{ product_id: productB, variant_id: variantB, quantity: 11 }])).error?.message).toBe("invalid_quantity");
    const split = [
      { product_id: productB, variant_id: variantB, quantity: 6 },
      { product_id: productB, variant_id: variantB, quantity: 5 },
    ];
    expect((await place(split)).error?.message).toBe("invalid_quantity");

    const before = await stockOf(variantA1);
    const cod = await place([{ product_id: productA, variant_id: variantA1, quantity: 10 }], { p_payment_method: "cod", p_cod_max: 10000 });
    expect(cod.error?.message).toBe("cod_limit");
    expect(await stockOf(variantA1)).toBe(before); // nothing stays reserved
  });

  it("createOrder refuses a cart line whose variant belongs to another product (COD limit bypass)", async () => {
    ctx.ip = ip();
    const before = await stockOf(variantA1);
    // 10 × EGP 1,200 sent under the cheap product: used to be priced at 0 and pass the COD limit.
    const res = await createOrder(guestOrder({ items: [{ productId: productB, variantId: variantA1, quantity: 10 }] }));
    expect(res.success).toBe(false);
    expect(res.code).toBe("product_unavailable");
    expect(await stockOf(variantA1)).toBe(before);

    const honest = await createOrder(guestOrder({ items: [{ productId: productA, variantId: variantA1, quantity: 10 }] }));
    expect(honest.code).toBe("cod_limit");
  });

  it("createOrder caps lines and units per order", async () => {
    ctx.ip = ip();
    const many = Array.from({ length: 21 }, () => ({ productId: productB, variantId: variantB, quantity: 1 }));
    expect((await createOrder(guestOrder({ items: many }))).code).toBe("too_many_items");
    expect((await createOrder(guestOrder({ items: [{ productId: productB, variantId: variantB, quantity: 11 }] }))).code).toBe("invalid_input");
    const split = [
      { productId: productB, variantId: variantB, quantity: 6 },
      { productId: productB, variantId: variantB, quantity: 5 },
    ];
    expect((await createOrder(guestOrder({ items: split }))).code).toBe("invalid_input");
  });

  it("at most 3 orders per phone or email can wait for payment / confirmation", async () => {
    const tel = phone();
    const email = `open.${RUN}@example.com`;
    for (let i = 0; i < 3; i++) {
      ctx.ip = ip();
      const ok = await createOrder(guestOrder({ phone: tel, email }));
      expect(ok.success, ok.error).toBe(true);
    }
    ctx.ip = ip();
    const fourth = await createOrder(guestOrder({ phone: tel, email: `other.${RUN}@example.com` }));
    expect(fourth.code).toBe("too_many_open_orders");
    ctx.ip = ip();
    const sameEmail = await createOrder(guestOrder({ phone: phone(), email }));
    expect(sameEmail.code).toBe("too_many_open_orders");
  });

  it("orders are rate limited per phone number", async () => {
    const tel = phone();
    for (let i = 0; i < ORDER_PHONE_LIMIT.limit; i++) {
      await service.rpc("rate_limit_hit", {
        p_key: `order-phone:${targetKey(tel)}`,
        p_limit: ORDER_PHONE_LIMIT.limit,
        p_window_seconds: ORDER_PHONE_LIMIT.windowSeconds,
        p_cost: 1,
      });
    }
    ctx.ip = ip();
    const before = await stockOf(variantB);
    const res = await createOrder(guestOrder({ phone: tel }));
    expect(res.code).toBe("rate_limited");
    expect(await stockOf(variantB)).toBe(before);
  });

  it("rate limits can give a hit back (refund) but never below zero", async () => {
    const key = `test:${RUN}:${randomUUID()}`;
    const hit = (cost: number) => service.rpc("rate_limit_hit", { p_key: key, p_limit: 2, p_window_seconds: 60, p_cost: cost });
    expect((await hit(1)).data).toBe(true);
    expect((await hit(1)).data).toBe(true);
    expect((await hit(1)).data).toBe(false);
    await hit(-1);
    await hit(-1);
    expect((await hit(1)).data).toBe(true);
    await hit(-5);
    const { data } = await service.from("rate_limits").select("hits").eq("key", key).single();
    expect(data!.hits).toBe(0);
    await service.from("rate_limits").delete().eq("key", key);
  });

  /* ── 5. Paying after cancel ──────────────────────────────────── */

  it("a payment after cancel revives the order when stock is there, and counts the promo again", async () => {
    const code = `SEC${RUN.toUpperCase()}A`;
    await service.from("promocodes").insert({ code, discount_type: "fixed", discount_value: 10, is_active: true, max_uses: 1, current_uses: 0 });
    const before = await stockOf(variantA2);
    const a = await place([{ product_id: productA, variant_id: variantA2, quantity: 2 }], { p_promo_code: code });
    expect(a.error).toBeNull();
    const pm = await attempt(a.row!.order_id);
    await service.from("orders").update({ status: "cancelled" }).eq("id", a.row!.order_id);
    expect(await stockOf(variantA2)).toBe(before);
    expect((await service.from("promocodes").select("current_uses").eq("code", code).single()).data!.current_uses).toBe(0);

    const res = await callback(txnFor(pm, Math.round(Number(a.row!.total) * 100), a.row!.order_id));
    expect(res.body.result).toBe("paid");
    const row = await orderRow(a.row!.order_id);
    expect(row).toMatchObject({ status: "confirmed", payment_status: "paid", needs_refund: false, stock_released: false, promo_released: false });
    expect(await stockOf(variantA2)).toBe(before - 2);
    expect((await service.from("promocodes").select("current_uses").eq("code", code).single()).data!.current_uses).toBe(1);
  });

  it("a payment after cancel without stock keeps the order cancelled and flags a refund", async () => {
    const a = await place([{ product_id: productA, variant_id: variantA2, quantity: 2 }]);
    const pm = await attempt(a.row!.order_id);
    await service.from("orders").update({ status: "cancelled" }).eq("id", a.row!.order_id);
    const saved = await stockOf(variantA2);
    await service.from("product_variants").update({ stock: 1 }).eq("id", variantA2);

    const res = await callback(txnFor(pm, Math.round(Number(a.row!.total) * 100), a.row!.order_id));
    expect(res.body.result).toBe("paid_after_cancel");
    const row = await orderRow(a.row!.order_id);
    expect(row).toMatchObject({ status: "cancelled", payment_status: "paid", needs_refund: true });
    expect(row.transaction_id).toBeTruthy();
    expect(await stockOf(variantA2)).toBe(1);
    await service.from("product_variants").update({ stock: saved }).eq("id", variantA2);
  });

  it("a payment after cancel whose promo code was used up meanwhile is refunded, not revived", async () => {
    const code = `SEC${RUN.toUpperCase()}B`;
    await service.from("promocodes").insert({ code, discount_type: "fixed", discount_value: 10, is_active: true, max_uses: 1, current_uses: 0 });
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }], { p_promo_code: code });
    const pm = await attempt(a.row!.order_id);
    await service.from("orders").update({ status: "cancelled" }).eq("id", a.row!.order_id);
    const other = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }], { p_promo_code: code });
    expect(other.error).toBeNull();

    const res = await callback(txnFor(pm, Math.round(Number(a.row!.total) * 100), a.row!.order_id));
    expect(res.body.result).toBe("paid_after_cancel");
    expect(await orderRow(a.row!.order_id)).toMatchObject({ status: "cancelled", needs_refund: true });
    expect((await service.from("promocodes").select("current_uses").eq("code", code).single()).data!.current_uses).toBe(1);
  });

  /* ── 6. Internal notes ───────────────────────────────────────── */

  it("internal notes are for the team only; the customer's order shows their own note", async () => {
    const a = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }], {
      p_user_id: buyerProfile,
      p_contact: { name: "Buyer", phone: phone(), email: `sec.${RUN}@example.com`, governorate: "cairo", city: "Cairo", address: "1", notes: "Leave at the door" },
    });
    const id = a.row!.order_id;
    const saved = await staff.from("order_internal_notes").insert({ order_id: id, note: "Customer was rude on the phone", updated_by: staffProfile }).select("order_id");
    expect(saved.error).toBeNull();

    const { data: own } = await buyer.from("orders").select("id, notes").eq("id", id).single();
    expect(own!.notes).toBe("Leave at the door");
    const { data: theirs } = await buyer.from("order_internal_notes").select("note");
    expect(theirs ?? []).toHaveLength(0);
    const sneaky = await buyer.from("order_internal_notes").insert({ order_id: id, note: "x" });
    expect(sneaky.error).not.toBeNull();
    const { data: anonNotes, error: anonError } = await anon.from("order_internal_notes").select("note");
    expect(anonError !== null || (anonNotes ?? []).length === 0).toBe(true);
    const { data: staffView } = await staff.from("order_internal_notes").select("note").eq("order_id", id).single();
    expect(staffView!.note).toMatch(/rude/);
  });

  it("payment attempts are never visible with the public key", async () => {
    for (const c of [anon, buyer]) {
      const { data, error } = await c.from("payment_attempts").select("*");
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });

  /* ── 7. Profiles ─────────────────────────────────────────────── */

  it("only the owner deletes profiles, and a customer's orders outlive their profile", async () => {
    const email = `delete.${RUN}@example.com`;
    const created = await service.auth.admin.createUser({ email, password: "Passw0rd!secure", email_confirm: true });
    users.push(created.data.user!.id);
    const { data: p } = await service.from("profiles").select("id").eq("auth_user_id", created.data.user!.id).single();
    const order = await place([{ product_id: productB, variant_id: variantB, quantity: 1 }], { p_user_id: p!.id });
    expect(order.error).toBeNull();

    // The customer themselves, and staff, can't delete it.
    const self = await signIn(email, "Passw0rd!secure");
    expect((await self.from("profiles").delete().eq("id", p!.id).select("id")).data ?? []).toHaveLength(0);
    expect((await buyer.from("profiles").delete().eq("id", p!.id).select("id")).data ?? []).toHaveLength(0);
    expect((await staff.from("profiles").delete().eq("id", p!.id).select("id")).data ?? []).toHaveLength(0);
    expect((await service.from("profiles").select("id").eq("id", p!.id)).data).toHaveLength(1);

    // The owner can; the order stays, without its account.
    const byOwner = await owner.from("profiles").delete().eq("id", p!.id).select("id");
    expect(byOwner.error).toBeNull();
    expect(byOwner.data).toHaveLength(1);
    const { data: kept } = await service.from("orders").select("id, user_id").eq("id", order.row!.order_id).single();
    expect(kept).toMatchObject({ id: order.row!.order_id, user_id: null });
  });

  it("staff may edit customers and themselves, never the owner or another admin", async () => {
    const { data: before } = await service.from("profiles").select("full_name").eq("id", ownerProfile).single();
    const onOwner = await staff.from("profiles").update({ full_name: "Hacked" }).eq("id", ownerProfile);
    expect(onOwner.error?.code).toBe("42501");
    expect((await service.from("profiles").select("full_name").eq("id", ownerProfile).single()).data!.full_name).toBe(before!.full_name);

    const { data: buyerBefore } = await service.from("profiles").select("full_name").eq("id", buyerProfile).single();
    const onCustomer = await staff.from("profiles").update({ full_name: buyerBefore!.full_name }).eq("id", buyerProfile).select("id");
    expect(onCustomer.error).toBeNull();
    expect(onCustomer.data).toHaveLength(1);

    const { data: me } = await service.from("profiles").select("full_name").eq("id", staffProfile).single();
    const onSelf = await staff.from("profiles").update({ full_name: me!.full_name }).eq("id", staffProfile).select("id");
    expect(onSelf.error).toBeNull();
  });

  it("the owner sees whether an account confirmed its email before promoting it", async () => {
    const email = `unconfirmed.${RUN}@example.com`;
    const created = await service.auth.admin.createUser({ email, password: "Passw0rd!secure", email_confirm: false });
    users.push(created.data.user!.id);
    const { data, error } = await owner.rpc("admin_profile_by_email", { p_email: email });
    expect(error).toBeNull();
    expect(data[0]).toMatchObject({ role: "customer", email_confirmed_at: null });
    const confirmed = await owner.rpc("admin_profile_by_email", { p_email: "buyer@shiftsouq.local" });
    expect(confirmed.data[0].email_confirmed_at).toBeTruthy();
    // Staff and the public key can't look accounts up.
    expect((await staff.rpc("admin_profile_by_email", { p_email: email })).error).not.toBeNull();
    expect((await anon.rpc("admin_profile_by_email", { p_email: email })).error).not.toBeNull();
  });

  /* ── 14. Hygiene ─────────────────────────────────────────────── */

  it("the public key can't read who wrote a review, but the product page columns still work", async () => {
    const hidden = await anon.from("reviews").select("user_id").limit(1);
    expect(hidden.error).not.toBeNull();
    const all = await anon.from("reviews").select("*").limit(1);
    expect(all.error).not.toBeNull();
    const shown = await anon
      .from("reviews")
      .select("id, product_id, rating, title, comment, author_name, is_verified, status, created_at", { count: "exact" })
      .eq("status", "approved")
      .limit(1);
    expect(shown.error).toBeNull();
  });

  it("contact messages can't be inserted with the public key", async () => {
    const { error } = await anon.from("contact_messages").insert({ name: "Bot", email: "bot@example.com", subject: "Hi", message: "Spam" });
    expect(error).not.toBeNull();
  });

  it("order and payment functions stay server-only", async () => {
    for (const c of [anon, buyer, staff]) {
      const paid = await c.rpc("mark_order_paid", {
        p_order_id: randomUUID(),
        p_paymob_order_id: "x",
        p_amount_cents: 1,
        p_transaction_id: "x",
        p_success: true,
      });
      expect(paid.error).not.toBeNull();
      const placed = await c.rpc("place_order", {
        p_user_id: null,
        p_items: [{ product_id: productB, variant_id: variantB, quantity: 1 }],
        p_shipping_cost: 0,
        p_payment_method: "cod",
        p_contact: {},
      });
      expect(placed.error).not.toBeNull();
    }
  });
});
