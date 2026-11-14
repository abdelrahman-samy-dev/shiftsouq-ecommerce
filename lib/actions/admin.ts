"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions — Admin
   ──────────────────────────────────────────────────────────────
   Every action:
   1. checks on the server that the caller is an admin (database
      role, not just the proxy's signed-in check);
   2. validates its input with zod;
   3. writes with the admin's own session, so row-level security
      (is_admin()) applies too — no service key is used here;
   4. returns { ok: true } or { ok: false, error: <key> }, where the
      key is turned into a friendly, translated message by the UI.
      Database details are logged on the server, never returned.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext, type AdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { checkTransition, toOrderState, type TransitionError } from "@/lib/admin/orders";
import type { OrderFilters } from "@/lib/admin/types";
import { getOrdersForExport } from "@/lib/dal/admin";

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const idSchema = z.guid();
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

async function adminOrFail(): Promise<AdminContext | null> {
  return getAdminContext();
}

/** Refreshes every admin page (lists, dashboard, badges in the layout). */
function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

type DbError = { code?: string; message?: string; details?: string } | null | undefined;
function logDb(where: string, error: DbError) {
  if (error) console.error(`[admin:${where}]`, error.code ?? "", error.message ?? "", error.details ?? "");
}

/* ══ Exports (rows for CSV) ═══════════════════════════════════ */

export type ExportRow = Record<string, string | number | boolean | null>;

const exportFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
    status: z.string().max(20).optional(),
    payment: z.string().max(20).optional(),
    method: z.string().max(20).optional(),
    queue: z.string().max(20).optional(),
    sort: z.string().max(20).optional(),
    customer: z.string().max(40).optional(),
  })
  .optional();

/** Orders matching the list filters, flattened for CSV (payment method and status included). */
export async function getAllOrdersForExport(filters?: OrderFilters): Promise<ExportRow[]> {
  if (!(await adminOrFail())) return [];
  const parsed = exportFilterSchema.safeParse(filters);
  const rows = await getOrdersForExport(parsed.success ? (parsed.data ?? {}) : {});
  return rows.map((o) => ({
    order_number: o.order_number,
    created_at: o.created_at,
    status: o.status,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    transaction_id: o.transaction_id,
    customer: o.customer_name,
    email: o.email,
    phone: o.phone,
    governorate: o.governorate,
    city: o.city,
    address: o.address,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount_amount,
    promo_code: o.promo_code,
    shipping: o.shipping_cost,
    total: o.total,
  }));
}

/* ══ Orders ═══════════════════════════════════════════════════ */

export type OrderActionError = TransitionError | "unauthorized" | "not_found" | "changed" | "save_failed" | "not_cod";

/**
 * Moves an order to a new status after checking the rules in lib/admin/orders.ts.
 * The update only applies if the order is still in the state that was checked,
 * so a payment confirmed meanwhile by the webhook is never overwritten.
 * Cancelled / refunded orders get their stock back from the database trigger.
 */
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(orderId).success) return fail("not_found");
  if (typeof newStatus !== "string" || newStatus.length > 20) return fail("invalid_status");

  const { data: row, error } = await ctx.supabase
    .from("orders")
    .select("id, status, payment_status, payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return (logDb("updateOrderStatus.read", error), fail("save_failed"));
  if (!row) return fail("not_found");

  const current = toOrderState(row);
  const check = checkTransition(current, newStatus);
  if (!check.ok) return fail(check.error);

  let update = ctx.supabase
    .from("orders")
    .update(check.patch)
    .eq("id", orderId)
    .eq("status", current.status)
    .eq("payment_status", current.payment_status);
  update = current.payment_method ? update.eq("payment_method", current.payment_method) : update.is("payment_method", null);
  const { data: changed, error: updateError } = await update.select("id");

  if (updateError) return (logDb("updateOrderStatus", updateError), fail("save_failed"));
  if (!changed?.length) return fail("changed");

  await logAdminAction(ctx, "order.status", "orders", orderId, {
    from: current.status,
    to: check.patch.status,
    ...(check.patch.payment_status ? { payment_from: current.payment_status, payment_to: check.patch.payment_status } : {}),
  });
  refreshAdmin();
  return { ok: true };
}

/** COD orders only: record that the courier collected the cash (normally automatic on delivery). */
export async function markCashCollected(orderId: string): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(orderId).success) return fail("not_found");

  const { data: row, error } = await ctx.supabase
    .from("orders")
    .select("id, status, payment_status, payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return (logDb("markCashCollected.read", error), fail("save_failed"));
  if (!row) return fail("not_found");
  const o = toOrderState(row);
  if (o.payment_method !== "cod") return fail("not_cod");
  if (!["shipped", "delivered"].includes(o.status) || o.payment_status !== "unpaid") return fail("not_next_step");

  const { data: changed, error: e } = await ctx.supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId)
    .eq("payment_method", "cod")
    .eq("payment_status", "unpaid")
    .in("status", ["shipped", "delivered"])
    .select("id");
  if (e) return (logDb("markCashCollected", e), fail("save_failed"));
  if (!changed?.length) return fail("changed");
  await logAdminAction(ctx, "order.cash_collected", "orders", orderId, { payment_from: "unpaid", payment_to: "paid" });
  refreshAdmin();
  return { ok: true };
}

/**
 * Internal note on an order (order_internal_notes: team only, row-level
 * security is_admin()). The buyer's own delivery note stays in orders.notes,
 * which the buyer can read, so staff text never goes there.
 */
export async function saveOrderNote(orderId: string, note: string): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(orderId).success) return fail("not_found");
  if (typeof note !== "string") return fail("save_failed");
  const text = note.replace(/\r\n/g, "\n").trim();
  if (text.length > 2000) return fail("note_too_long");

  const { data: order, error: readError } = await ctx.supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (readError) return (logDb("saveOrderNote.read", readError), fail("save_failed"));
  if (!order) return fail("not_found");

  const { data, error } = await ctx.supabase
    .from("order_internal_notes")
    .upsert(
      { order_id: orderId, note: text, updated_at: new Date().toISOString(), updated_by: ctx.profileId },
      { onConflict: "order_id" },
    )
    .select("order_id");
  if (error) return (logDb("saveOrderNote", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");
  await logAdminAction(ctx, "order.note", "orders", orderId, { length: text.length });
  refreshAdmin();
  return { ok: true };
}

/* ══ Contact inbox ════════════════════════════════════════════ */

export async function setMessageRead(id: string, read: boolean): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success || typeof read !== "boolean") return fail("not_found");
  const { data, error } = await ctx.supabase
    .from("contact_messages")
    .update({ is_read: read, read_at: read ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error) return (logDb("setMessageRead", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");
  await logAdminAction(ctx, read ? "message.read" : "message.unread", "contact_messages", id);
  refreshAdmin();
  return { ok: true };
}

export async function setMessageArchived(id: string, archived: boolean): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success || typeof archived !== "boolean") return fail("not_found");
  const now = new Date().toISOString();
  const patch = archived ? { archived_at: now, is_read: true } : { archived_at: null };
  const { data, error } = await ctx.supabase.from("contact_messages").update(patch).eq("id", id).select("id, read_at");
  if (error) return (logDb("setMessageArchived", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");
  if (archived && !data[0].read_at) {
    await ctx.supabase.from("contact_messages").update({ read_at: now }).eq("id", id).is("read_at", null);
  }
  await logAdminAction(ctx, archived ? "message.archive" : "message.restore", "contact_messages", id);
  refreshAdmin();
  return { ok: true };
}
