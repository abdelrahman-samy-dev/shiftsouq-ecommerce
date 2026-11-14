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
import { checkTransition, toOrderState, type TransitionError } from "@/lib/admin/orders";
import { adminProductSchema, productErrorKey, type AdminProductValues } from "@/lib/admin/products";
import { promoErrorKey, promoInputSchema, type PromoErrorKey, type PromoInput } from "@/lib/admin/promos";
import type { OrderFilters } from "@/lib/admin/types";
import { getOrdersForExport, getProductsForExport } from "@/lib/dal/admin";
import { createCategorySchema } from "@/lib/validations/product";

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

/* ══ Products ═════════════════════════════════════════════════ */

const OPEN_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped"];

function readJsonArray(formData: FormData, key: string): unknown[] | null {
  const raw = formData.get(key);
  if (raw == null || raw === "") return [];
  if (typeof raw !== "string" || raw.length > 200_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseProductForm(formData: FormData): { ok: true; data: AdminProductValues } | { ok: false; error: string } {
  const images = readJsonArray(formData, "images");
  const variants = readJsonArray(formData, "variants");
  if (!images || !variants) return fail("invalid_form");
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const parsed = adminProductSchema.safeParse({
    name_en: str("name_en"),
    name_ar: str("name_ar"),
    description_en: str("description_en"),
    description_ar: str("description_ar"),
    base_price: str("base_price"),
    sale_price: str("sale_price"),
    category_id: str("category_id"),
    stock: str("stock") || 0,
    images,
    variants,
  });
  if (!parsed.success) return fail(productErrorKey(parsed.error));
  return { ok: true, data: parsed.data };
}

function makeSlug(nameEn: string): string {
  const base = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "product"}-${Date.now().toString(36)}`;
}

function makeSku(slug: string): string {
  const head = slug.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "SKU";
  return `${head}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function variantErrorKey(error: DbError): string {
  if (error?.code === "23505") return "duplicate_sku";
  if (error?.code === "23514") return "stock";
  return "save_failed";
}

/** Inserts / updates / reorders a product's images to match `urls` (first = primary). */
async function syncImages(ctx: AdminContext, productId: string, urls: string[]): Promise<string | null> {
  const { data: existing, error } = await ctx.supabase.from("product_images").select("id, url").eq("product_id", productId);
  if (error) {
    logDb("images.read", error);
    return "save_failed";
  }
  const byUrl = new Map((existing ?? []).map((i) => [i.url as string, i.id as string]));
  const keep = new Set(urls);

  const removeIds = (existing ?? []).filter((i) => !keep.has(i.url)).map((i) => i.id as string);
  if (removeIds.length) {
    const { error: e } = await ctx.supabase.from("product_images").delete().in("id", removeIds);
    if (e) return (logDb("images.delete", e), "save_failed");
  }
  for (const [idx, url] of urls.entries()) {
    const row = { is_primary: idx === 0, sort_order: idx + 1 };
    const id = byUrl.get(url);
    const { error: e } = id
      ? await ctx.supabase.from("product_images").update(row).eq("id", id)
      : await ctx.supabase.from("product_images").insert({ product_id: productId, url, ...row });
    if (e) return (logDb("images.save", e), "save_failed");
  }
  return null;
}

/**
 * Makes the product's variants match the form. Existing variants are updated in
 * place (so order items keep pointing at them and cancelled orders can restock);
 * a variant is only removed when no open order is waiting on it.
 */
async function syncVariants(ctx: AdminContext, productId: string, slug: string, values: AdminProductValues): Promise<string | null> {
  const { data: existingRows, error } = await ctx.supabase
    .from("product_variants")
    .select("id, sku, size, color_en, color_ar, price_override, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) return (logDb("variants.read", error), "save_failed");
  const existing = existingRows ?? [];
  const existingIds = new Set(existing.map((v) => v.id as string));

  // No options: the product has one variant holding its stock.
  const wanted =
    values.variants.length > 0
      ? values.variants
      : [
          existing[0]
            ? {
                id: existing[0].id as string,
                sku: existing[0].sku as string,
                stock: values.stock,
                price_override: null,
                size: existing.length === 1 ? (existing[0].size as string | null) : null,
                color_en: existing.length === 1 ? (existing[0].color_en as string | null) : null,
                color_ar: existing.length === 1 ? (existing[0].color_ar as string | null) : null,
              }
            : { id: null, sku: makeSku(slug), stock: values.stock, price_override: null, size: null, color_en: null, color_ar: null },
        ];

  const keepIds = new Set(wanted.map((v) => v.id).filter((id): id is string => !!id && existingIds.has(id)));
  const removeIds = existing.map((v) => v.id as string).filter((id) => !keepIds.has(id));

  if (removeIds.length) {
    const { data: open, error: e } = await ctx.supabase
      .from("order_items")
      .select("id, order:orders!inner(status)")
      .in("product_variant_id", removeIds)
      .in("order.status", OPEN_ORDER_STATUSES)
      .limit(1);
    if (e) return (logDb("variants.openOrders", e), "save_failed");
    if (open && open.length) return "variant_has_open_orders";
    const { error: d } = await ctx.supabase.from("product_variants").delete().in("id", removeIds);
    if (d) return (logDb("variants.delete", d), "save_failed");
  }

  for (const v of wanted) {
    const row: Record<string, string | number | null> = {
      sku: v.sku,
      stock: v.stock,
      price_override: v.price_override ?? null,
      size: v.size ?? null,
      color_en: v.color_en ?? null,
    };
    // The form has no Arabic colour field: keep the stored one unless a value is sent.
    if (v.color_ar !== undefined) row.color_ar = v.color_ar;
    const { error: e } =
      v.id && keepIds.has(v.id)
        ? await ctx.supabase.from("product_variants").update(row).eq("id", v.id).eq("product_id", productId)
        : await ctx.supabase.from("product_variants").insert({ product_id: productId, ...row });
    if (e) return (logDb("variants.save", e), variantErrorKey(e));
  }
  return null;
}

export async function createProduct(formData: FormData): Promise<ActionResult<{ productId: string }>> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  const parsed = parseProductForm(formData);
  if (!parsed.ok) return parsed;
  const v = parsed.data;
  const slug = makeSlug(v.name_en);

  const { data: product, error } = await ctx.supabase
    .from("products")
    .insert({
      name_en: v.name_en,
      name_ar: v.name_ar,
      slug,
      description_en: v.description_en ?? null,
      description_ar: v.description_ar ?? null,
      base_price: v.base_price,
      sale_price: v.sale_price ?? null,
      category_id: v.category_id,
      is_active: true,
      is_featured: false,
      is_new: true,
    })
    .select("id")
    .single();
  if (error || !product) {
    logDb("createProduct", error);
    return fail(error?.code === "23503" ? "category" : "save_failed");
  }

  const problem = (await syncVariants(ctx, product.id, slug, v)) ?? (await syncImages(ctx, product.id, v.images));
  if (problem) {
    // Don't leave a half-created product behind.
    await ctx.supabase.from("products").delete().eq("id", product.id);
    return fail(problem);
  }

  refreshAdmin();
  return { ok: true, productId: product.id as string };
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success) return fail("not_found");
  const parsed = parseProductForm(formData);
  if (!parsed.ok) return parsed;
  const v = parsed.data;

  const { data: product, error } = await ctx.supabase
    .from("products")
    .update({
      name_en: v.name_en,
      name_ar: v.name_ar,
      description_en: v.description_en ?? null,
      description_ar: v.description_ar ?? null,
      base_price: v.base_price,
      sale_price: v.sale_price ?? null,
      category_id: v.category_id,
    })
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();
  if (error) {
    logDb("updateProduct", error);
    return fail(error.code === "23503" ? "category" : "save_failed");
  }
  if (!product) return fail("not_found");

  const problem = (await syncVariants(ctx, id, product.slug as string, v)) ?? (await syncImages(ctx, id, v.images));
  refreshAdmin();
  if (problem) return fail(problem);
  return { ok: true };
}

/**
 * Deletes a product that was never ordered. A product with order history is
 * hidden from the store instead, so past orders keep their link to it.
 */
export async function deleteProduct(id: string): Promise<ActionResult<{ hidden: boolean }>> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success) return fail("not_found");

  const { data: ordered, error: e } = await ctx.supabase
    .from("order_items")
    .select("id, variant:product_variants!inner(product_id)")
    .eq("variant.product_id", id)
    .limit(1);
  if (e) return (logDb("deleteProduct.check", e), fail("save_failed"));

  if (ordered && ordered.length) {
    const { error } = await ctx.supabase.from("products").update({ is_active: false }).eq("id", id);
    if (error) return (logDb("deleteProduct.hide", error), fail("save_failed"));
    refreshAdmin();
    return { ok: true, hidden: true };
  }

  const { data, error } = await ctx.supabase.from("products").delete().eq("id", id).select("id");
  if (error) return (logDb("deleteProduct", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");
  refreshAdmin();
  return { ok: true, hidden: false };
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success || typeof active !== "boolean") return fail("not_found");
  const { data, error } = await ctx.supabase.from("products").update({ is_active: active }).eq("id", id).select("id");
  if (error) return (logDb("setProductActive", error), fail("save_failed"));
  if (!data?.length) return fail("not_found");
  refreshAdmin();
  return { ok: true };
}

export async function createCategory(
  nameEn: string,
  nameAr: string,
): Promise<ActionResult<{ category: { id: string; name_en: string; name_ar: string } }>> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  const parsed = createCategorySchema.safeParse({ name_en: nameEn, name_ar: nameAr });
  if (!parsed.success) return fail("category_name");

  const { data, error } = await ctx.supabase
    .from("categories")
    .insert({ name_en: parsed.data.name_en, name_ar: parsed.data.name_ar, slug: makeSlug(parsed.data.name_en) })
    .select("id, name_en, name_ar")
    .single();
  if (error || !data) return (logDb("createCategory", error), fail("save_failed"));
  refreshAdmin();
  return { ok: true, category: data as { id: string; name_en: string; name_ar: string } };
}

/* ══ Exports (rows for CSV) ═══════════════════════════════════ */

export type ExportRow = Record<string, string | number | boolean | null>;

export async function getAllProductsForExport(): Promise<ExportRow[]> {
  if (!(await adminOrFail())) return [];
  return getProductsForExport();
}

const exportFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
    status: z.string().max(20).optional(),
    payment: z.string().max(20).optional(),
    method: z.string().max(20).optional(),
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
  refreshAdmin();
  return { ok: true };
}

/* ══ Promo codes ══════════════════════════════════════════════ */

/** Creates (id = null) or edits a promo code. Codes are stored in capitals and are unique. */
export async function savePromoCode(id: string | null, input: PromoInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (id !== null && !idSchema.safeParse(id).success) return fail("not_found" satisfies PromoErrorKey);
  const parsed = promoInputSchema.safeParse(input);
  if (!parsed.success) return fail(promoErrorKey(parsed.error));
  const v = parsed.data;

  // Same code in other letter case? (checkout matches codes case-insensitively)
  const { data: clash, error: clashError } = await ctx.supabase
    .from("promocodes")
    .select("id")
    .ilike("code", v.code.replace(/[%_\\]/g, "\\$&"))
    .limit(2);
  if (clashError) return (logDb("savePromo.clash", clashError), fail("generic"));
  if ((clash ?? []).some((c) => c.id !== id)) return fail("duplicate" satisfies PromoErrorKey);

  const row = {
    code: v.code,
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    min_order_amount: v.min_order_amount ?? 0,
    max_uses: v.max_uses,
    expires_at: v.expires_at,
    is_active: v.is_active,
  };

  if (id === null) {
    const { data, error } = await ctx.supabase.from("promocodes").insert(row).select("id").single();
    if (error || !data) {
      logDb("savePromo.insert", error);
      return fail(error?.code === "23505" ? "duplicate" : "generic");
    }
    refreshAdmin();
    return { ok: true, id: data.id as string };
  }

  const { data: existing, error: readError } = await ctx.supabase
    .from("promocodes")
    .select("id, current_uses")
    .eq("id", id)
    .maybeSingle();
  if (readError) return (logDb("savePromo.read", readError), fail("generic"));
  if (!existing) return fail("not_found");
  if (v.max_uses != null && v.max_uses < (existing.current_uses ?? 0)) return fail("max_below_used" satisfies PromoErrorKey);

  const { error } = await ctx.supabase.from("promocodes").update(row).eq("id", id);
  if (error) {
    logDb("savePromo.update", error);
    return fail(error.code === "23505" ? "duplicate" : "generic");
  }
  refreshAdmin();
  return { ok: true, id };
}

export async function setPromoActive(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminOrFail();
  if (!ctx) return fail("unauthorized");
  if (!idSchema.safeParse(id).success || typeof active !== "boolean") return fail("not_found");
  const { data, error } = await ctx.supabase.from("promocodes").update({ is_active: active }).eq("id", id).select("id");
  if (error) return (logDb("setPromoActive", error), fail("generic"));
  if (!data?.length) return fail("not_found");
  refreshAdmin();
  return { ok: true };
}
