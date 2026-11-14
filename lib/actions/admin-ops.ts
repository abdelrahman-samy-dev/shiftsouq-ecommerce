"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions — admin operations (any admin)
   ──────────────────────────────────────────────────────────────
   Reviews moderation, newsletter, CSV exports and the top-bar
   quick search. Same contract as lib/actions/admin.ts:
   server-side admin check → zod validation → write with the
   admin's own session (row-level security applies) → audit log
   → { ok: true } | { ok: false, error: <key> }.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import type { NewsletterView, QuickSearchResults } from "@/lib/admin/types";
import { getCustomersForExport, getNewsletterForExport, isReviewStatus, quickSearch } from "@/lib/dal/admin";

export type OpsResult = { ok: true } | { ok: false; error: string };
export type ExportRow = Record<string, string | number | boolean | null>;

const idSchema = z.guid();
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

type DbError = { code?: string; message?: string } | null | undefined;
function logDb(where: string, error: DbError) {
  if (error) console.error(`[admin-ops:${where}]`, error.code ?? "", error.message ?? "");
}

/* ── Reviews ──────────────────────────────────────────────────── */

/** Refresh the admin and the product page whose rating changed (the trigger keeps the rating in sync). */
function refreshReviewPages() {
  revalidatePath("/admin", "layout");
  revalidatePath("/product/[slug]", "page");
}

export async function setReviewStatus(id: string, status: string): Promise<OpsResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success) return fail("not_found");
  if (!isReviewStatus(status) || status === "pending") return fail("invalid");

  const { data: before, error: readError } = await ctx.supabase.from("reviews").select("id, status").eq("id", id).maybeSingle();
  if (readError) return (logDb("review.read", readError), fail("save_failed"));
  if (!before) return fail("not_found");
  if (before.status === status) return { ok: true };

  const { data, error } = await ctx.supabase.from("reviews").update({ status }).eq("id", id).select("id");
  if (error) return (logDb("review.status", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");

  await logAdminAction(ctx, status === "approved" ? "review.approve" : "review.reject", "reviews", id, {
    from: before.status,
    to: status,
  });
  refreshReviewPages();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<OpsResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success) return fail("not_found");

  const { data, error } = await ctx.supabase.from("reviews").delete().eq("id", id).select("id, product_id, rating, status");
  if (error) return (logDb("review.delete", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");

  await logAdminAction(ctx, "review.delete", "reviews", id, {
    product_id: data[0].product_id,
    rating: data[0].rating,
    status: data[0].status,
  });
  refreshReviewPages();
  return { ok: true };
}

/* ── Newsletter ───────────────────────────────────────────────── */

export async function unsubscribeSubscriber(id: string): Promise<OpsResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success) return fail("not_found");

  const { data, error } = await ctx.supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", id)
    .is("unsubscribed_at", null)
    .select("id");
  if (error) return (logDb("newsletter.unsubscribe", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");

  await logAdminAction(ctx, "newsletter.unsubscribe", "newsletter_subscribers", id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const viewSchema = z.enum(["subscribed", "unsubscribed", "all"]);
const searchSchema = z.string().max(200).optional();

export async function exportNewsletter(view?: string, search?: string): Promise<ExportRow[]> {
  if (!(await getAdminContext())) return [];
  const v: NewsletterView = viewSchema.safeParse(view).success ? (view as NewsletterView) : "subscribed";
  const s = searchSchema.safeParse(search);
  const rows = await getNewsletterForExport(v, s.success ? s.data : undefined);
  return rows.map((r) => ({
    email: r.email,
    language: r.locale,
    source: r.source,
    subscribed_at: r.createdAt,
    unsubscribed_at: r.unsubscribedAt,
  }));
}

/* ── Customers ────────────────────────────────────────────────── */

export async function exportCustomers(search?: string): Promise<ExportRow[]> {
  if (!(await getAdminContext())) return [];
  const s = searchSchema.safeParse(search);
  const rows = await getCustomersForExport(s.success ? s.data : undefined);
  return rows.map((c) => ({
    name: c.name,
    email: c.email,
    phone: c.phone,
    orders: c.ordersCount,
    total_spent: c.totalSpent,
    last_order_at: c.lastOrderAt,
    joined_at: c.joinedAt,
  }));
}

/* ── Quick search (top bar) ───────────────────────────────────── */

export async function adminQuickSearch(term: string): Promise<QuickSearchResults> {
  const empty: QuickSearchResults = { orders: [], customers: [], products: [] };
  if (typeof term !== "string" || term.length > 200) return empty;
  if (!(await getAdminContext())) return empty;
  return quickSearch(term);
}
