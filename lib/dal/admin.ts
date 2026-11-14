import "server-only";

/* ══════════════════════════════════════════════════════════════
   Admin Data Access Layer (DAL)
   ──────────────────────────────────────────────────────────────
   Every function first confirms the caller is an admin (database
   role, per request) and then reads with the admin's own session,
   so row-level security (is_admin()) applies as a second check.
   Non-admins get empty results, never data.

   Results are small DTOs with only the fields the admin screens
   show — no order access tokens or other secrets.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getAdminContext } from "@/lib/admin/auth";
import { STORE_TIME_ZONE, fillDailySeries, periodRange, zonedMidnight, type DailyPoint, type KpiPeriod } from "@/lib/admin/kpi";
import { isOrderStatus, isPaymentMethod, isPaymentStatus, toOrderState } from "@/lib/admin/orders";
import { cleanSearchTerm, ilikeAny, phoneDigits } from "@/lib/admin/search";
import type { PromoRow } from "@/lib/admin/promos";
import type {
  AdminCategory,
  AdminCustomerAddress,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminReview,
  AuditEntry,
  NewsletterSubscriber,
  NewsletterView,
  PeriodStats,
  QueueCounts,
  QuickSearchResults,
  ReviewStatus,
  TeamMember,
  TopProduct,
  AdminContactMessage,
  AdminDashboardStats,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProduct,
  InboxView,
  LowStockVariant,
  OrderFilters,
} from "@/lib/admin/types";
import type { PaginationParams } from "@/lib/types";

export interface AdminPaginationParams extends PaginationParams {
  search?: string;
  status?: string;
}

export const LOW_STOCK_THRESHOLD = 5;

/** Page numbers from the URL: a whole number from 1 to 10 000. */
export function clampPage(raw: unknown): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ── Orders ───────────────────────────────────────────────────── */

const ORDER_LIST_COLUMNS =
  "id, order_number, created_at, status, payment_status, payment_method, total, " +
  "shipping_name, shipping_email, shipping_phone, shipping_governorate, shipping_city, user:profiles(full_name)";

type OrderListRow = {
  id: string;
  order_number: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  total: number | string | null;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  shipping_governorate: string | null;
  shipping_city: string | null;
  user: { full_name: string | null } | { full_name: string | null }[] | null;
};

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

function toOrderListItem(row: OrderListRow): AdminOrderListItem {
  const state = toOrderState(row);
  return {
    id: row.id,
    order_number: row.order_number,
    created_at: row.created_at,
    ...state,
    total: num(row.total),
    customer_name: row.shipping_name || one(row.user)?.full_name || null,
    email: row.shipping_email,
    phone: row.shipping_phone,
    governorate: row.shipping_governorate,
    city: row.shipping_city,
  };
}

/** The `or=(…)` filter for an order search, or null when there is nothing to search. */
function orderSearchFilter(raw: string | undefined): string | null {
  const term = cleanSearchTerm(raw);
  if (!term) return null;
  const parts = [ilikeAny(["order_number", "shipping_email", "shipping_name", "shipping_phone"], term)];
  const digits = phoneDigits(term);
  if (digits && digits !== term) parts.push(ilikeAny(["shipping_phone"], digits));
  return parts.join(",");
}

/** The part of a PostgREST filter builder used by applyOrderFilters. */
interface FilterBuilder {
  eq(column: string, value: string): FilterBuilder;
  in(column: string, values: string[]): FilterBuilder;
  or(filters: string): FilterBuilder;
}

/** Work queues on the orders list (same definitions as admin_queue_counts() in the database). */
export const ORDER_QUEUES = ["fulfil", "awaiting", "cash"] as const;
export type OrderQueue = (typeof ORDER_QUEUES)[number];
export const isOrderQueue = (v: unknown): v is OrderQueue =>
  typeof v === "string" && (ORDER_QUEUES as readonly string[]).includes(v);

/** Applies the order list filters (only known values; anything else is ignored). */
function applyOrderFilters<Q>(query: Q, f: OrderFilters): Q {
  // Supabase's builder types are too deep to constrain generically; it has eq/in/or.
  let q = query as unknown as FilterBuilder;
  const search = orderSearchFilter(f.search);
  if (search) q = q.or(search);
  if (isOrderStatus(f.status)) q = q.eq("status", f.status);
  if (isPaymentStatus(f.payment)) q = q.eq("payment_status", f.payment);
  if (isPaymentMethod(f.method)) q = q.eq("payment_method", f.method);
  if (f.customer && GUID.test(f.customer)) q = q.eq("user_id", f.customer);
  if (f.queue === "fulfil") {
    q = q.in("status", ["pending", "confirmed", "processing"]).or("payment_status.eq.paid,payment_method.is.null,payment_method.eq.cod");
  } else if (f.queue === "awaiting") {
    q = q.eq("status", "pending").in("payment_method", ["card", "wallet"]).in("payment_status", ["unpaid", "failed"]);
  } else if (f.queue === "cash") {
    q = q.eq("payment_method", "cod").eq("payment_status", "unpaid").in("status", ["shipped", "delivered"]);
  }
  return q as unknown as Q;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_SORTS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  total_desc: { column: "total", ascending: false },
  total_asc: { column: "total", ascending: true },
};

export async function getAllOrders({
  page = 1,
  pageSize = 10,
  ...filters
}: PaginationParams & OrderFilters): Promise<{ orders: AdminOrderListItem[]; count: number; totalPages: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { orders: [], count: 0, totalPages: 0 };
  const offset = (clampPage(page) - 1) * pageSize;
  const sort = ORDER_SORTS[filters.sort ?? ""] ?? ORDER_SORTS.newest;

  const query = applyOrderFilters(
    ctx.supabase.from("orders").select(ORDER_LIST_COLUMNS, { count: "exact" }),
    filters,
  );
  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("[getAllOrders]", error.message);
    return { orders: [], count: 0, totalPages: 0 };
  }
  return {
    orders: ((data ?? []) as unknown as OrderListRow[]).map(toOrderListItem),
    count: count ?? 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}

export async function getOrderForAdmin(id: string): Promise<AdminOrderDetail | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const { data, error } = await ctx.supabase
    .from("orders")
    .select(
      `${ORDER_LIST_COLUMNS}, user_id, updated_at, subtotal, discount_amount, shipping_cost, tax_amount,
       shipping_country, shipping_address, notes, transaction_id, paymob_order_id, stock_released,
       promo:promocodes(code),
       items:order_items(id, product_name, variant_label, unit_price, quantity, image_url, created_at,
         variant:product_variants(sku, product:products(slug)))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getOrderForAdmin]", error.message);
    return null;
  }
  if (!data) return null;

  type ItemRow = {
    id: string;
    product_name: string;
    variant_label: string | null;
    unit_price: number | string;
    quantity: number;
    image_url: string | null;
    created_at: string | null;
    variant: { sku: string | null; product: { slug: string } | { slug: string }[] | null } | null;
  };
  type DetailRow = OrderListRow & {
    user_id: string | null;
    updated_at: string | null;
    subtotal: number | string;
    discount_amount: number | string | null;
    shipping_cost: number | string | null;
    tax_amount: number | string | null;
    shipping_country: string | null;
    shipping_address: string | null;
    notes: string | null;
    transaction_id: string | null;
    paymob_order_id: string | null;
    stock_released: boolean | null;
    promo: { code: string } | { code: string }[] | null;
    items: ItemRow[] | null;
  };
  const row = data as unknown as DetailRow;

  return {
    ...toOrderListItem(row),
    updated_at: row.updated_at,
    subtotal: num(row.subtotal),
    discount_amount: num(row.discount_amount),
    shipping_cost: num(row.shipping_cost),
    tax_amount: num(row.tax_amount),
    promo_code: one(row.promo)?.code ?? null,
    country: row.shipping_country,
    address: row.shipping_address,
    notes: row.notes,
    transaction_id: row.transaction_id,
    paymob_order_id: row.paymob_order_id,
    stock_released: Boolean(row.stock_released),
    has_account: Boolean(row.user_id),
    customer_id: row.user_id,
    items: (row.items ?? [])
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((it) => ({
        id: it.id,
        product_name: it.product_name,
        variant_label: it.variant_label,
        unit_price: num(it.unit_price),
        quantity: it.quantity,
        image_url: it.image_url,
        sku: it.variant?.sku ?? null,
        product_slug: one(it.variant?.product)?.slug ?? null,
      })),
  };
}

export interface OrderExportRow extends AdminOrderListItem {
  address: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  promo_code: string | null;
  transaction_id: string | null;
  items: string;
}

/** Orders matching the filters, newest first, for CSV export (up to 10 000). */
export async function getOrdersForExport(filters: OrderFilters): Promise<OrderExportRow[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const PAGE = 1000; // PostgREST returns at most 1000 rows per request
  const rows: OrderExportRow[] = [];

  for (let offset = 0; offset < 10_000; offset += PAGE) {
    const { data, error } = await applyOrderFilters(
      ctx.supabase
        .from("orders")
        .select(
          `${ORDER_LIST_COLUMNS}, shipping_address, subtotal, discount_amount, shipping_cost, transaction_id,
           promo:promocodes(code), items:order_items(product_name, variant_label, quantity)`,
        ),
      filters,
    )
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("[getOrdersForExport]", error.message);
      break;
    }
    type Row = OrderListRow & {
      shipping_address: string | null;
      subtotal: number | string;
      discount_amount: number | string | null;
      shipping_cost: number | string | null;
      transaction_id: string | null;
      promo: { code: string } | { code: string }[] | null;
      items: { product_name: string; variant_label: string | null; quantity: number }[] | null;
    };
    for (const r of (data ?? []) as unknown as Row[]) {
      rows.push({
        ...toOrderListItem(r),
        address: r.shipping_address,
        subtotal: num(r.subtotal),
        discount_amount: num(r.discount_amount),
        shipping_cost: num(r.shipping_cost),
        promo_code: one(r.promo)?.code ?? null,
        transaction_id: r.transaction_id,
        items: (r.items ?? [])
          .map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} x${i.quantity}`)
          .join("; "),
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/* ── Dashboard ────────────────────────────────────────────────── */

const EMPTY_STATS: AdminDashboardStats = {
  totalOrders: 0,
  revenue: 0,
  revenueOrders: 0,
  awaitingPayment: 0,
  toFulfil: 0,
  cashToCollect: 0,
  totalProducts: 0,
  totalUsers: 0,
  recentOrders: [],
  lowStock: [],
  lowStockCount: 0,
};

export async function getLowStockVariants(
  limit = 8,
  threshold = LOW_STOCK_THRESHOLD,
): Promise<{ items: LowStockVariant[]; count: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { items: [], count: 0 };
  const { data, count, error } = await ctx.supabase
    .from("product_variants")
    .select("id, sku, size, color_en, stock, product:products(id, name_en, name_ar, is_active)", { count: "exact" })
    .lte("stock", threshold)
    .order("stock", { ascending: true })
    .order("sku", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[getLowStockVariants]", error.message);
    return { items: [], count: 0 };
  }
  type Row = {
    id: string;
    sku: string;
    size: string | null;
    color_en: string | null;
    stock: number | null;
    product: { id: string; name_en: string; name_ar: string; is_active: boolean | null } | { id: string; name_en: string; name_ar: string; is_active: boolean | null }[] | null;
  };
  const items = ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const p = one(r.product);
    if (!p) return [];
    return [
      {
        id: r.id,
        sku: r.sku,
        size: r.size,
        color_en: r.color_en,
        stock: r.stock ?? 0,
        product_id: p.id,
        product_name_en: p.name_en,
        product_name_ar: p.name_ar,
        product_active: p.is_active !== false,
      },
    ];
  });
  return { items, count: count ?? items.length };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const ctx = await getAdminContext();
  if (!ctx) return EMPTY_STATS;
  const { supabase } = ctx;

  const [stats, products, users, recent, lowStock] = await Promise.all([
    supabase.rpc("admin_order_stats").single(),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("orders").select(ORDER_LIST_COLUMNS).order("created_at", { ascending: false }).limit(6),
    getLowStockVariants(),
  ]);

  for (const r of [stats, products, users, recent]) {
    if (r.error) console.error("[getAdminDashboardStats]", r.error.message);
  }
  const s = (stats.data ?? {}) as Record<string, unknown>;

  return {
    totalOrders: num(s.total_orders),
    revenue: num(s.revenue),
    revenueOrders: num(s.revenue_orders),
    awaitingPayment: num(s.awaiting_payment),
    toFulfil: num(s.to_fulfil),
    cashToCollect: num(s.cash_to_collect),
    totalProducts: products.count ?? 0,
    totalUsers: users.count ?? 0,
    recentOrders: ((recent.data ?? []) as unknown as OrderListRow[]).map(toOrderListItem),
    lowStock: lowStock.items,
    lowStockCount: lowStock.count,
  };
}

/* ── Products ─────────────────────────────────────────────────── */

export async function getAllProducts({
  page = 1,
  pageSize = 10,
  search,
  status,
}: AdminPaginationParams): Promise<{ products: AdminProduct[]; count: number; totalPages: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { products: [], count: 0, totalPages: 0 };
  const offset = (clampPage(page) - 1) * pageSize;

  let query = ctx.supabase
    .from("products")
    .select(
      `id, slug, name_en, name_ar, description_en, description_ar, base_price, sale_price, category_id, is_active, created_at,
       category:categories(name_en, name_ar),
       images:product_images(url, is_primary, sort_order),
       variants:product_variants(id, sku, size, color_en, color_ar, stock, price_override, created_at)`,
      { count: "exact" },
    );

  const term = cleanSearchTerm(search);
  if (term) query = query.or(ilikeAny(["name_en", "name_ar"], term));
  if (status === "active") query = query.eq("is_active", true);
  if (status === "draft") query = query.eq("is_active", false);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("[getAllProducts]", error.message);
    return { products: [], count: 0, totalPages: 0 };
  }

  type Row = Omit<AdminProduct, "category" | "images" | "variants" | "total_stock"> & {
    category: AdminProduct["category"] | AdminProduct["category"][];
    images: AdminProduct["images"] | null;
    variants: (AdminProduct["variants"][number] & { created_at: string | null })[] | null;
  };
  const products = ((data ?? []) as unknown as Row[]).map((p): AdminProduct => {
    const variants = (p.variants ?? [])
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.sku.localeCompare(b.sku))
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color_en: v.color_en,
        color_ar: v.color_ar,
        stock: v.stock ?? 0,
        price_override: v.price_override == null ? null : num(v.price_override),
      }));
    return {
      id: p.id,
      slug: p.slug,
      name_en: p.name_en,
      name_ar: p.name_ar,
      description_en: p.description_en,
      description_ar: p.description_ar,
      base_price: num(p.base_price),
      sale_price: p.sale_price == null ? null : num(p.sale_price),
      category_id: p.category_id,
      is_active: p.is_active !== false,
      category: one(p.category),
      images: (p.images ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      variants,
      total_stock: variants.reduce((sum, v) => sum + v.stock, 0),
    };
  });

  return { products, count: count ?? 0, totalPages: count ? Math.ceil(count / pageSize) : 0 };
}

/** All products flattened for CSV (newest first). */
export async function getProductsForExport(): Promise<Record<string, string | number | boolean | null>[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("products")
    .select(
      "name_en, name_ar, slug, base_price, sale_price, is_active, created_at, category:categories(name_en, name_ar), variants:product_variants(sku, size, color_en, stock)",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[getProductsForExport]", error.message);
    return [];
  }
  type Row = {
    name_en: string;
    name_ar: string;
    slug: string;
    base_price: number | string;
    sale_price: number | string | null;
    is_active: boolean | null;
    created_at: string;
    category: { name_en: string; name_ar: string } | { name_en: string; name_ar: string }[] | null;
    variants: { sku: string; size: string | null; color_en: string | null; stock: number | null }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((p) => {
    const variants = p.variants ?? [];
    return {
      name_en: p.name_en,
      name_ar: p.name_ar,
      category_en: one(p.category)?.name_en ?? null,
      category_ar: one(p.category)?.name_ar ?? null,
      base_price: num(p.base_price),
      sale_price: p.sale_price == null ? null : num(p.sale_price),
      active: p.is_active !== false,
      total_stock: variants.reduce((s, v) => s + (v.stock ?? 0), 0),
      variants: variants
        .map((v) => `${v.sku}${v.size || v.color_en ? ` (${[v.size, v.color_en].filter(Boolean).join(" / ")})` : ""}: ${v.stock ?? 0}`)
        .join("; "),
      slug: p.slug,
      created_at: p.created_at,
    };
  });
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase.from("categories").select("id, name_en, name_ar").order("name_en");
  if (error) console.error("[getAdminCategories]", error.message);
  return (data ?? []) as AdminCategory[];
}

/* ── Contact inbox ────────────────────────────────────────────── */

const MESSAGE_COLUMNS = "id, name, email, subject, message, is_read, read_at, archived_at, created_at";

export async function getContactMessages({
  view = "inbox",
  page = 1,
  pageSize = 20,
}: { view?: InboxView } & Partial<PaginationParams>): Promise<{
  messages: AdminContactMessage[];
  count: number;
  totalPages: number;
}> {
  const ctx = await getAdminContext();
  if (!ctx) return { messages: [], count: 0, totalPages: 0 };
  const offset = (clampPage(page) - 1) * pageSize;

  let query = ctx.supabase.from("contact_messages").select(MESSAGE_COLUMNS, { count: "exact" });
  if (view === "archived") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (view === "unread") query = query.or("is_read.is.null,is_read.eq.false");

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) {
    console.error("[getContactMessages]", error.message);
    return { messages: [], count: 0, totalPages: 0 };
  }
  return {
    messages: ((data ?? []) as AdminContactMessage[]).map((m) => ({ ...m, is_read: Boolean(m.is_read) })),
    count: count ?? 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}

export async function getContactMessage(id: string): Promise<AdminContactMessage | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase.from("contact_messages").select(MESSAGE_COLUMNS).eq("id", id).maybeSingle();
  if (error) console.error("[getContactMessage]", error.message);
  return data ? { ...(data as AdminContactMessage), is_read: Boolean(data.is_read) } : null;
}

/** Unread, not archived messages (sidebar badge, notification bell). */
export async function getUnreadMessageCount(): Promise<number> {
  const ctx = await getAdminContext();
  if (!ctx) return 0;
  const { count, error } = await ctx.supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .or("is_read.is.null,is_read.eq.false");
  if (error) console.error("[getUnreadMessageCount]", error.message);
  return count ?? 0;
}

/* ── Promo codes ──────────────────────────────────────────────── */

export async function getPromoCodes(): Promise<PromoRow[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("promocodes")
    .select("id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) console.error("[getPromoCodes]", error.message);
  return ((data ?? []) as PromoRow[]).map((p) => ({
    ...p,
    discount_value: num(p.discount_value),
    min_order_amount: p.min_order_amount == null ? null : num(p.min_order_amount),
  }));
}

/* ══ Operations: queues, KPIs, customers, engagement, team, activity ══ */

const EMPTY_QUEUES: QueueCounts = {
  toFulfil: 0,
  awaitingPayment: 0,
  cashToCollect: 0,
  lowStock: 0,
  pendingReviews: 0,
  unreadMessages: 0,
  lowStockThreshold: LOW_STOCK_THRESHOLD,
};

/** Work queues for the dashboard and the sidebar counters (one query, cached per request). */
export const getQueueCounts = cache(async (): Promise<QueueCounts> => {
  const ctx = await getAdminContext();
  if (!ctx) return EMPTY_QUEUES;
  const { data, error } = await ctx.supabase.rpc("admin_queue_counts").maybeSingle();
  if (error || !data) {
    if (error) console.error("[getQueueCounts]", error.message);
    return EMPTY_QUEUES;
  }
  const r = data as Record<string, unknown>;
  return {
    toFulfil: num(r.to_fulfil),
    awaitingPayment: num(r.awaiting_payment),
    cashToCollect: num(r.cash_to_collect),
    lowStock: num(r.low_stock),
    pendingReviews: num(r.pending_reviews),
    unreadMessages: num(r.unread_messages),
    lowStockThreshold: num(r.low_stock_threshold),
  };
});

const EMPTY_PERIOD: PeriodStats = { orders: 0, revenue: 0, revenueOrders: 0, newCustomers: 0 };

async function getPeriodStats(from: Date, to: Date): Promise<PeriodStats> {
  const ctx = await getAdminContext();
  if (!ctx) return EMPTY_PERIOD;
  const { data, error } = await ctx.supabase
    .rpc("admin_period_stats", { p_from: from.toISOString(), p_to: to.toISOString() })
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[getPeriodStats]", error.message);
    return EMPTY_PERIOD;
  }
  const r = data as Record<string, unknown>;
  return { orders: num(r.orders), revenue: num(r.revenue), revenueOrders: num(r.revenue_orders), newCustomers: num(r.new_customers) };
}

export interface KpiSnapshot {
  period: KpiPeriod;
  current: PeriodStats;
  previous: PeriodStats;
}

/** KPIs for a period and the period before it (store time zone). */
export async function getKpis(period: KpiPeriod, now: Date = new Date()): Promise<KpiSnapshot> {
  const range = periodRange(period, now, STORE_TIME_ZONE);
  const [current, previous] = await Promise.all([getPeriodStats(range.from, range.to), getPeriodStats(range.prevFrom, range.prevTo)]);
  return { period, current, previous };
}

/** Revenue and orders per day for the last `days` days, oldest first, no gaps. */
export async function getDailyRevenue(days = 30): Promise<DailyPoint[]> {
  const ctx = await getAdminContext();
  if (!ctx) return fillDailySeries([], days);
  const { data, error } = await ctx.supabase.rpc("admin_daily_revenue", { p_days: days, p_tz: STORE_TIME_ZONE });
  if (error) console.error("[getDailyRevenue]", error.message);
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    day: String(r.day),
    revenue: num(r.revenue),
    orders: num(r.orders),
  }));
  return fillDailySeries(rows, days);
}

/** Best sellers by units over a KPI period (default: the last 30 days). */
export async function getTopProducts(period: KpiPeriod = "30d", limit = 5): Promise<TopProduct[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const range = periodRange(period);
  const { data, error } = await ctx.supabase.rpc("admin_top_products", {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_limit: limit,
  });
  if (error) console.error("[getTopProducts]", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    productId: (r.product_id as string | null) ?? null,
    nameEn: String(r.name_en ?? ""),
    nameAr: String(r.name_ar ?? r.name_en ?? ""),
    slug: (r.slug as string | null) ?? null,
    imageUrl: (r.image_url as string | null) ?? null,
    units: num(r.units),
    revenue: num(r.revenue),
  }));
}

export async function getRecentOrders(limit = 6): Promise<AdminOrderListItem[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("orders")
    .select(ORDER_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[getRecentOrders]", error.message);
  return ((data ?? []) as unknown as OrderListRow[]).map(toOrderListItem);
}

/* ── Audit log: order timeline and the activity viewer ────────── */

type AuditRow = {
  id: number;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  actor_id: string | null;
  actor: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
};

const AUDIT_COLUMNS = "id, created_at, action, entity, entity_id, data, actor_id, actor:profiles(id, full_name)";

/** E-mail + last sign-in for profile ids (admins only; e-mail lives in the auth schema). */
async function profileEmails(ids: string[]): Promise<Map<string, { email: string | null; lastSignInAt: string | null }>> {
  const out = new Map<string, { email: string | null; lastSignInAt: string | null }>();
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 500);
  if (!unique.length) return out;
  const ctx = await getAdminContext();
  if (!ctx) return out;
  const { data, error } = await ctx.supabase.rpc("admin_profile_emails", { p_ids: unique });
  if (error) console.error("[profileEmails]", error.message);
  for (const r of (data ?? []) as { profile_id: string; email: string | null; last_sign_in_at: string | null }[]) {
    out.set(r.profile_id, { email: r.email, lastSignInAt: r.last_sign_in_at });
  }
  return out;
}

async function toAuditEntries(rows: AuditRow[]): Promise<AuditEntry[]> {
  const emails = await profileEmails(rows.map((r) => r.actor_id ?? ""));
  return rows.map((r) => {
    const actor = one(r.actor);
    return {
      id: r.id,
      createdAt: r.created_at,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      data: r.data && typeof r.data === "object" ? r.data : {},
      actor: actor ? { id: actor.id, name: actor.full_name, email: emails.get(actor.id)?.email ?? null } : null,
    };
  });
}

/** What admins did to one order, oldest first. */
export async function getOrderTimeline(orderId: string): Promise<AuditEntry[]> {
  const ctx = await getAdminContext();
  if (!ctx || !GUID.test(orderId)) return [];
  const { data, error } = await ctx.supabase
    .from("audit_log")
    .select(AUDIT_COLUMNS)
    .eq("entity", "orders")
    .eq("entity_id", orderId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) console.error("[getOrderTimeline]", error.message);
  return toAuditEntries((data ?? []) as unknown as AuditRow[]);
}

export interface AuditFilters {
  entity?: string;
  actor?: string;
  from?: string; // YYYY-MM-DD (store time)
  to?: string; // YYYY-MM-DD (store time), inclusive
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local midnight (store time) at the start of a YYYY-MM-DD day (+ addDays), as ISO; null if invalid. */
function dayStart(ymd: string | undefined, addDays = 0): string | null {
  const m = ymd ? YMD.exec(ymd) : null;
  if (!m) return null;
  const date = zonedMidnight(Number(m[1]), Number(m[2]), Number(m[3]) + addDays, STORE_TIME_ZONE);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getAuditLog({
  page = 1,
  pageSize = 30,
  ...f
}: AuditFilters & Partial<PaginationParams>): Promise<{ entries: AuditEntry[]; count: number; totalPages: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { entries: [], count: 0, totalPages: 0 };
  const offset = (clampPage(page) - 1) * pageSize;

  let query = ctx.supabase.from("audit_log").select(AUDIT_COLUMNS, { count: "exact" });
  if (f.entity && /^[a-z_]{1,40}$/.test(f.entity)) query = query.eq("entity", f.entity);
  if (f.actor && GUID.test(f.actor)) query = query.eq("actor_id", f.actor);
  const from = dayStart(f.from);
  const to = dayStart(f.to, 1);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) {
    console.error("[getAuditLog]", error.message);
    return { entries: [], count: 0, totalPages: 0 };
  }
  return {
    entries: await toAuditEntries((data ?? []) as unknown as AuditRow[]),
    count: count ?? 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
  };
}

/* ── Customers ────────────────────────────────────────────────── */

export const CUSTOMER_SORTS = ["joined", "name", "email", "orders", "spent", "last_order"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];
export const isCustomerSort = (v: unknown): v is CustomerSort =>
  typeof v === "string" && (CUSTOMER_SORTS as readonly string[]).includes(v);

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  joined_at: string | null;
  last_sign_in_at: string | null;
  orders_count: number | string | null;
  total_spent: number | string | null;
  last_order_at: string | null;
  total_count: number | string | null;
};

const toCustomer = (r: CustomerRow): AdminCustomerListItem => ({
  id: r.id,
  name: r.full_name,
  email: r.email,
  phone: r.phone,
  joinedAt: r.joined_at,
  lastSignInAt: r.last_sign_in_at,
  ordersCount: num(r.orders_count),
  totalSpent: num(r.total_spent),
  lastOrderAt: r.last_order_at,
});

export interface CustomerQuery {
  search?: string;
  sort?: string;
  dir?: string;
  page?: number;
  pageSize?: number;
}

export async function getCustomers({
  search,
  sort,
  dir,
  page = 1,
  pageSize = 25,
}: CustomerQuery): Promise<{ customers: AdminCustomerListItem[]; count: number; totalPages: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { customers: [], count: 0, totalPages: 0 };
  const term = cleanSearchTerm(search);
  const { data, error } = await ctx.supabase.rpc("admin_customers", {
    p_search: term || null,
    p_digits: term ? phoneDigits(term) : null,
    p_sort: isCustomerSort(sort) ? sort : "joined",
    p_desc: dir !== "asc",
    p_limit: pageSize,
    p_offset: (clampPage(page) - 1) * pageSize,
  });
  if (error) {
    console.error("[getCustomers]", error.message);
    return { customers: [], count: 0, totalPages: 0 };
  }
  const rows = (data ?? []) as CustomerRow[];
  const count = rows.length ? num(rows[0].total_count) : 0;
  return { customers: rows.map(toCustomer), count, totalPages: Math.ceil(count / pageSize) };
}

/** Every customer matching the search (up to 10 000), for CSV export. */
export async function getCustomersForExport(search?: string): Promise<AdminCustomerListItem[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const term = cleanSearchTerm(search);
  const out: AdminCustomerListItem[] = [];
  for (let offset = 0; offset < 10_000; offset += 1000) {
    const { data, error } = await ctx.supabase.rpc("admin_customers", {
      p_search: term || null,
      p_digits: term ? phoneDigits(term) : null,
      p_sort: "joined",
      p_desc: true,
      p_limit: 1000,
      p_offset: offset,
    });
    if (error) {
      console.error("[getCustomersForExport]", error.message);
      break;
    }
    const rows = (data ?? []) as CustomerRow[];
    out.push(...rows.map(toCustomer));
    if (rows.length < 1000) break;
  }
  return out;
}

type AddressJson = Partial<Record<"governorate" | "city" | "address" | "apartment" | "postalCode", unknown>>;
const textOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export async function getCustomerDetail(id: string): Promise<AdminCustomerDetail | null> {
  const ctx = await getAdminContext();
  if (!ctx || !GUID.test(id)) return null;

  const [summary, profile, book, orders] = await Promise.all([
    ctx.supabase.rpc("admin_customers", { p_id: id, p_limit: 1 }),
    ctx.supabase.from("profiles").select("id, country, city, default_address").eq("id", id).maybeSingle(),
    ctx.supabase
      .from("user_addresses")
      .select("id, label, full_name, phone, governorate, city, address, apartment, postal_code, is_default, created_at")
      .eq("user_id", id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    ctx.supabase.from("orders").select(ORDER_LIST_COLUMNS).eq("user_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  for (const r of [summary, profile, book, orders]) if (r.error) console.error("[getCustomerDetail]", r.error.message);

  const row = ((summary.data ?? []) as CustomerRow[])[0];
  if (!row || !profile.data) return null;

  type BookRow = {
    id: string;
    label: string | null;
    full_name: string | null;
    phone: string | null;
    governorate: string | null;
    city: string | null;
    address: string | null;
    apartment: string | null;
    postal_code: string | null;
    is_default: boolean | null;
  };
  const addresses: AdminCustomerAddress[] = ((book.data ?? []) as BookRow[]).map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.full_name,
    phone: a.phone,
    governorate: a.governorate,
    city: a.city,
    address: a.address,
    apartment: a.apartment,
    postalCode: a.postal_code,
    isDefault: Boolean(a.is_default),
    source: "book",
  }));
  const saved = profile.data.default_address as AddressJson | null;
  if (saved && typeof saved === "object" && textOrNull(saved.address)) {
    addresses.push({
      id: "checkout",
      label: null,
      fullName: row.full_name,
      phone: row.phone,
      governorate: textOrNull(saved.governorate),
      city: textOrNull(saved.city),
      address: textOrNull(saved.address),
      apartment: textOrNull(saved.apartment),
      postalCode: textOrNull(saved.postalCode),
      isDefault: addresses.length === 0,
      source: "checkout",
    });
  }

  return {
    ...toCustomer(row),
    country: (profile.data.country as string | null) ?? null,
    city: (profile.data.city as string | null) ?? null,
    addresses,
    orders: ((orders.data ?? []) as unknown as OrderListRow[]).map(toOrderListItem),
  };
}

/* ── Reviews ──────────────────────────────────────────────────── */

export const REVIEW_STATUSES: readonly ReviewStatus[] = ["pending", "approved", "rejected"];
export const isReviewStatus = (v: unknown): v is ReviewStatus =>
  typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v);

export async function getReviews({
  status = "pending",
  page = 1,
  pageSize = 20,
}: { status?: ReviewStatus } & Partial<PaginationParams>): Promise<{
  reviews: AdminReview[];
  count: number;
  totalPages: number;
  counts: Record<ReviewStatus, number>;
}> {
  const empty = { reviews: [], count: 0, totalPages: 0, counts: { pending: 0, approved: 0, rejected: 0 } };
  const ctx = await getAdminContext();
  if (!ctx) return empty;
  const offset = (clampPage(page) - 1) * pageSize;

  const countOf = (s: ReviewStatus) => ctx.supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", s);
  const [list, ...counts] = await Promise.all([
    ctx.supabase
      .from("reviews")
      .select(
        `id, status, rating, title, comment, is_verified, created_at,
         author:profiles(id, full_name),
         product:products(id, name_en, name_ar, slug, images:product_images(url, is_primary, sort_order))`,
        { count: "exact" },
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1),
    ...REVIEW_STATUSES.map(countOf),
  ]);
  if (list.error) {
    console.error("[getReviews]", list.error.message);
    return empty;
  }

  type Img = { url: string; is_primary: boolean | null; sort_order: number | null };
  type ProductRow = { id: string; name_en: string; name_ar: string; slug: string; images: Img[] | null };
  type Row = {
    id: string;
    status: string;
    rating: number;
    title: string | null;
    comment: string | null;
    is_verified: boolean | null;
    created_at: string;
    author: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
    product: ProductRow | ProductRow[] | null;
  };
  const reviews = ((list.data ?? []) as unknown as Row[]).map((r): AdminReview => {
    const author = one(r.author);
    const product = one(r.product);
    const image = (product?.images ?? [])
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    return {
      id: r.id,
      status: isReviewStatus(r.status) ? r.status : "pending",
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      isVerified: Boolean(r.is_verified),
      createdAt: r.created_at,
      author: author ? { id: author.id, name: author.full_name } : null,
      product: product
        ? { id: product.id, nameEn: product.name_en, nameAr: product.name_ar, slug: product.slug, imageUrl: image?.url ?? null }
        : null,
    };
  });
  const [pending, approved, rejected] = counts.map((c) => c.count ?? 0);
  return {
    reviews,
    count: list.count ?? 0,
    totalPages: list.count ? Math.ceil(list.count / pageSize) : 0,
    counts: { pending, approved, rejected },
  };
}

/* ── Newsletter ───────────────────────────────────────────────── */

const NEWSLETTER_COLUMNS = "id, email, locale, source, created_at, unsubscribed_at";
type NewsletterRow = {
  id: string;
  email: string;
  locale: string | null;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
};
const toSubscriber = (r: NewsletterRow): NewsletterSubscriber => ({
  id: r.id,
  email: r.email,
  locale: r.locale === "ar" ? "ar" : "en",
  source: r.source,
  createdAt: r.created_at,
  unsubscribedAt: r.unsubscribed_at,
});

interface NewsletterFilter {
  is(column: string, value: null): NewsletterFilter;
  not(column: string, op: string, value: null): NewsletterFilter;
  ilike(column: string, pattern: string): NewsletterFilter;
}

function applyNewsletterFilters<Q>(query: Q, view: NewsletterView, search?: string): Q {
  let q = query as unknown as NewsletterFilter;
  if (view === "subscribed") q = q.is("unsubscribed_at", null);
  if (view === "unsubscribed") q = q.not("unsubscribed_at", "is", null);
  const term = cleanSearchTerm(search);
  if (term) q = q.ilike("email", `%${term.replace(/[%_\\]/g, "\\$&")}%`);
  return q as unknown as Q;
}

export async function getNewsletterSubscribers({
  view = "subscribed",
  search,
  page = 1,
  pageSize = 30,
}: { view?: NewsletterView; search?: string } & Partial<PaginationParams>): Promise<{
  subscribers: NewsletterSubscriber[];
  count: number;
  totalPages: number;
  active: number;
}> {
  const ctx = await getAdminContext();
  if (!ctx) return { subscribers: [], count: 0, totalPages: 0, active: 0 };
  const offset = (clampPage(page) - 1) * pageSize;
  const [list, active] = await Promise.all([
    applyNewsletterFilters(ctx.supabase.from("newsletter_subscribers").select(NEWSLETTER_COLUMNS, { count: "exact" }), view, search)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1),
    ctx.supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
  ]);
  if (list.error) console.error("[getNewsletterSubscribers]", list.error.message);
  return {
    subscribers: ((list.data ?? []) as NewsletterRow[]).map(toSubscriber),
    count: list.count ?? 0,
    totalPages: list.count ? Math.ceil(list.count / pageSize) : 0,
    active: active.count ?? 0,
  };
}

export async function getNewsletterForExport(view: NewsletterView, search?: string): Promise<NewsletterSubscriber[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const out: NewsletterSubscriber[] = [];
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data, error } = await applyNewsletterFilters(ctx.supabase.from("newsletter_subscribers").select(NEWSLETTER_COLUMNS), view, search)
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);
    if (error) {
      console.error("[getNewsletterForExport]", error.message);
      break;
    }
    out.push(...((data ?? []) as NewsletterRow[]).map(toSubscriber));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/* ── Team ─────────────────────────────────────────────────────── */

export async function getTeam(): Promise<TeamMember[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, role, created_at, auth_user_id")
    .in("role", ["super_admin", "admin"])
    .order("created_at", { ascending: true });
  if (error) console.error("[getTeam]", error.message);
  type Row = { id: string; full_name: string | null; role: string; created_at: string | null; auth_user_id: string | null };
  const rows = (data ?? []) as Row[];
  const emails = await profileEmails(rows.map((r) => r.id));
  return rows
    .map(
      (r): TeamMember => ({
        id: r.id,
        name: r.full_name,
        email: emails.get(r.id)?.email ?? null,
        role: r.role === "super_admin" ? "super_admin" : "admin",
        joinedAt: r.created_at,
        lastSignInAt: emails.get(r.id)?.lastSignInAt ?? null,
        hasAccount: Boolean(r.auth_user_id),
      }),
    )
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "super_admin" ? -1 : 1));
}

/* ── Quick search (top bar) ───────────────────────────────────── */

export async function quickSearch(raw: string): Promise<QuickSearchResults> {
  const empty: QuickSearchResults = { orders: [], customers: [], products: [] };
  const ctx = await getAdminContext();
  const term = cleanSearchTerm(raw);
  if (!ctx || term.length < 2) return empty;

  const orderFilter = orderSearchFilter(term);
  const [orders, customers, products] = await Promise.all([
    orderFilter
      ? ctx.supabase.from("orders").select(ORDER_LIST_COLUMNS).or(orderFilter).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    ctx.supabase.rpc("admin_customers", { p_search: term, p_digits: phoneDigits(term), p_sort: "last_order", p_limit: 5 }),
    ctx.supabase
      .from("products")
      .select("id, name_en, name_ar, slug, is_active")
      .or(ilikeAny(["name_en", "name_ar", "slug"], term))
      .order("is_active", { ascending: false })
      .limit(5),
  ]);
  for (const r of [orders, customers, products]) if (r.error) console.error("[quickSearch]", r.error.message);

  return {
    orders: ((orders.data ?? []) as unknown as OrderListRow[]).map((r) => {
      const o = toOrderListItem(r);
      return { id: o.id, orderNumber: o.order_number, customer: o.customer_name, total: o.total, status: o.status };
    }),
    customers: ((customers.data ?? []) as CustomerRow[]).map((c) => ({ id: c.id, name: c.full_name, email: c.email, phone: c.phone })),
    products: ((products.data ?? []) as { id: string; name_en: string; name_ar: string; slug: string; is_active: boolean | null }[]).map(
      (p) => ({ id: p.id, nameEn: p.name_en, nameAr: p.name_ar, slug: p.slug, active: p.is_active !== false }),
    ),
  };
}

/* ── Low stock for the dashboard (live products, threshold from settings) ── */

export async function getLowStockLive(limit: number, threshold: number): Promise<LowStockVariant[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("product_variants")
    .select("id, sku, size, color_en, stock, product:products!inner(id, name_en, name_ar, is_active)")
    .lte("stock", threshold)
    .eq("product.is_active", true)
    .order("stock", { ascending: true })
    .order("sku", { ascending: true })
    .limit(limit);
  if (error) console.error("[getLowStockLive]", error.message);
  type P = { id: string; name_en: string; name_ar: string; is_active: boolean | null };
  type Row = { id: string; sku: string; size: string | null; color_en: string | null; stock: number | null; product: P | P[] | null };
  return ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const p = one(r.product);
    return p
      ? [
          {
            id: r.id,
            sku: r.sku,
            size: r.size,
            color_en: r.color_en,
            stock: r.stock ?? 0,
            product_id: p.id,
            product_name_en: p.name_en,
            product_name_ar: p.name_ar,
            product_active: p.is_active !== false,
          },
        ]
      : [];
  });
}

/** Display name of the signed-in admin (top bar). */
export async function getAdminProfileName(): Promise<string | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  const { data } = await ctx.supabase.from("profiles").select("full_name").eq("id", ctx.profileId).maybeSingle();
  const name = (data?.full_name as string | null | undefined)?.trim();
  return name || null;
}
