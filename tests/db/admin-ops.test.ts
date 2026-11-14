/**
 * Admin operations: roles, owner-only settings, dashboard functions.
 * Runs against the LOCAL Supabase only (npm run test:db).
 * Uses the seeded accounts: owner admin@shiftsouq.local, admin e2e.admin@shiftsouq.local,
 * buyer buyer@shiftsouq.local. Nothing is left changed: settings and roles are restored.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { countsAsRevenue, toOrderState } from "@/lib/admin/orders";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(URL);
const d = local && ANON && SERVICE ? describe : describe.skip;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

let service: SupabaseClient;
let anon: SupabaseClient;
let owner: SupabaseClient;
let admin: SupabaseClient;
let buyer: SupabaseClient;
let ownerProfile: string;
let adminProfile: string;
let buyerProfile: string;
let settingsBefore: Record<string, unknown> | null = null;

async function signIn(email: string, password: string) {
  const c = createClient(URL, ANON, opts);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
}

async function profileOf(c: SupabaseClient) {
  const { data: u } = await c.auth.getUser();
  const { data } = await service.from("profiles").select("id, role").eq("auth_user_id", u.user!.id).single();
  return data as { id: string; role: string };
}

d("admin operations (database)", () => {
  beforeAll(async () => {
    service = createClient(URL, SERVICE, opts);
    anon = createClient(URL, ANON, opts);
    [owner, admin, buyer] = await Promise.all([
      signIn("admin@shiftsouq.local", "Admin12345!"),
      signIn("e2e.admin@shiftsouq.local", "E2e-Admin-12345"),
      signIn("buyer@shiftsouq.local", "Buyer12345!"),
    ]);
    const [o, a, b] = await Promise.all([profileOf(owner), profileOf(admin), profileOf(buyer)]);
    expect(o.role).toBe("super_admin");
    expect(a.role).toBe("admin");
    expect(b.role).toBe("customer");
    ownerProfile = o.id;
    adminProfile = a.id;
    buyerProfile = b.id;
    const { data } = await service.from("store_settings").select("*").eq("id", 1).single();
    settingsBefore = data;
  });

  afterAll(async () => {
    // Safety net: put roles and settings back exactly as they were.
    if (ownerProfile) await service.from("profiles").update({ role: "super_admin" }).eq("id", ownerProfile);
    if (adminProfile) await service.from("profiles").update({ role: "admin" }).eq("id", adminProfile);
    if (buyerProfile) await service.from("profiles").update({ role: "customer" }).eq("id", buyerProfile);
    if (settingsBefore) {
      const { id: _id, ...rest } = settingsBefore;
      void _id;
      await service.from("store_settings").update(rest).eq("id", 1);
    }
  });

  it("an admin cannot change anyone's role (database guard)", async () => {
    const { error } = await admin.from("profiles").update({ role: "admin" }).eq("id", buyerProfile);
    expect(error?.code).toBe("42501");
    const { error: self } = await admin.from("profiles").update({ role: "super_admin" }).eq("id", adminProfile);
    expect(self?.code).toBe("42501");
    const { data } = await service.from("profiles").select("role").eq("id", buyerProfile).single();
    expect(data!.role).toBe("customer");
  });

  it("an admin cannot save store settings (row-level security)", async () => {
    const { data, error } = await admin.from("store_settings").update({ policies: { return_days: 99 } }).eq("id", 1).select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
    const { data: row } = await service.from("store_settings").select("policies").eq("id", 1).single();
    expect(row!.policies).toEqual(settingsBefore!.policies);
  });

  it("the owner can save store settings", async () => {
    const { data, error } = await owner.from("store_settings").update({ policies: { return_days: 21 } }).eq("id", 1).select("policies");
    expect(error).toBeNull();
    expect(data?.[0]?.policies).toEqual({ return_days: 21 });
    await owner.from("store_settings").update({ policies: settingsBefore!.policies }).eq("id", 1);
  });

  it("the owner can switch someone between customer and admin", async () => {
    const up = await owner.from("profiles").update({ role: "admin" }).eq("id", buyerProfile).select("role");
    expect(up.error).toBeNull();
    expect(up.data?.[0]?.role).toBe("admin");
    const down = await owner.from("profiles").update({ role: "customer" }).eq("id", buyerProfile).select("role");
    expect(down.data?.[0]?.role).toBe("customer");
  });

  it("the last owner can never be removed", async () => {
    const { error } = await owner.from("profiles").update({ role: "admin" }).eq("id", ownerProfile);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/at least one owner/i);
    // Not even by the server or the SQL editor.
    const { error: svc } = await service.from("profiles").update({ role: "customer" }).eq("id", ownerProfile);
    expect(svc?.message).toMatch(/at least one owner/i);
    const { data } = await service.from("profiles").select("role").eq("id", ownerProfile).single();
    expect(data!.role).toBe("super_admin");
  });

  it("only the owner can transfer ownership, and only to an admin", async () => {
    const byAdmin = await admin.rpc("transfer_store_ownership", { p_target: adminProfile });
    expect(byAdmin.error?.code).toBe("42501");
    const toCustomer = await owner.rpc("transfer_store_ownership", { p_target: buyerProfile });
    expect(toCustomer.error?.code).toBe("22023");

    // Round trip: owner → admin, then back.
    const there = await owner.rpc("transfer_store_ownership", { p_target: adminProfile });
    expect(there.error).toBeNull();
    const roles = await service.from("profiles").select("id, role").in("id", [ownerProfile, adminProfile]);
    const byId = Object.fromEntries((roles.data ?? []).map((r) => [r.id, r.role]));
    expect(byId[adminProfile]).toBe("super_admin");
    expect(byId[ownerProfile]).toBe("admin");
    const back = await admin.rpc("transfer_store_ownership", { p_target: ownerProfile });
    expect(back.error).toBeNull();
    const after = await service.from("profiles").select("id, role").in("id", [ownerProfile, adminProfile]);
    const again = Object.fromEntries((after.data ?? []).map((r) => [r.id, r.role]));
    expect(again[ownerProfile]).toBe("super_admin");
    expect(again[adminProfile]).toBe("admin");
  });

  it("dashboard and customer functions refuse customers and visitors", async () => {
    const now = new Date().toISOString();
    const from = new Date(Date.now() - 86_400_000).toISOString();
    for (const c of [buyer]) {
      expect((await c.rpc("admin_queue_counts")).error?.code).toBe("42501");
      expect((await c.rpc("admin_period_stats", { p_from: from, p_to: now })).error?.code).toBe("42501");
      expect((await c.rpc("admin_customers", {})).error?.code).toBe("42501");
      expect((await c.rpc("admin_profile_emails", { p_ids: [buyerProfile] })).error?.code).toBe("42501");
    }
    // Visitors are not even allowed to call them.
    const visitor = await anon.rpc("admin_customers", {});
    expect(visitor.error).not.toBeNull();
    expect(visitor.data ?? []).toHaveLength(0);
    // Finding accounts by e-mail is for the owner only.
    expect((await admin.rpc("admin_profile_by_email", { p_email: "buyer@shiftsouq.local" })).error?.code).toBe("42501");
    const found = await owner.rpc("admin_profile_by_email", { p_email: "BUYER@shiftsouq.local" });
    expect(found.data?.[0]?.profile_id).toBe(buyerProfile);
  });

  it("revenue in the dashboard uses the same rule as the order screens", async () => {
    const from = new Date(Date.now() - 400 * 86_400_000 + 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();
    const { data: stats, error } = await admin.rpc("admin_period_stats", { p_from: from, p_to: to }).single();
    expect(error).toBeNull();
    const { data: orders } = await service
      .from("orders")
      .select("total, status, payment_status, payment_method, created_at")
      .gte("created_at", from)
      .lt("created_at", to);
    const received = (orders ?? []).filter((o) => countsAsRevenue(toOrderState(o)));
    const revenue = received.reduce((s, o) => s + Number(o.total), 0);
    const s = stats as { revenue: number | string; revenue_orders: number };
    expect(Number(s.revenue)).toBeCloseTo(revenue, 2);
    expect(Number(s.revenue_orders)).toBe(received.length);
  });
});
