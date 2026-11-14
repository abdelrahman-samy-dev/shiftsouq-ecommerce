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

import { getAdminContext } from "@/lib/admin/auth";
import { isOrderStatus, isPaymentMethod, isPaymentStatus, toOrderState } from "@/lib/admin/orders";
import { cleanSearchTerm, ilikeAny, phoneDigits } from "@/lib/admin/search";
import type { PromoRow } from "@/lib/admin/promos";
import type {
  AdminCategory,
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
  or(filters: string): FilterBuilder;
}

/** Applies the order list filters (only known values; anything else is ignored). */
function applyOrderFilters<Q>(query: Q, f: OrderFilters): Q {
  // Supabase's builder types are too deep to constrain generically; it has eq/or.
  let q = query as unknown as FilterBuilder;
  const search = orderSearchFilter(f.search);
  if (search) q = q.or(search);
  if (isOrderStatus(f.status)) q = q.eq("status", f.status);
  if (isPaymentStatus(f.payment)) q = q.eq("payment_status", f.payment);
  if (isPaymentMethod(f.method)) q = q.eq("payment_method", f.method);
  return q as unknown as Q;
}

export async function getAllOrders({
  page = 1,
  pageSize = 10,
  ...filters
}: PaginationParams & OrderFilters): Promise<{ orders: AdminOrderListItem[]; count: number; totalPages: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { orders: [], count: 0, totalPages: 0 };
  const offset = (clampPage(page) - 1) * pageSize;

  const query = applyOrderFilters(
    ctx.supabase.from("orders").select(ORDER_LIST_COLUMNS, { count: "exact" }),
    filters,
  );
  const { data, count, error } = await query
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

export async function getLowStockVariants(limit = 8): Promise<{ items: LowStockVariant[]; count: number }> {
  const ctx = await getAdminContext();
  if (!ctx) return { items: [], count: 0 };
  const { data, count, error } = await ctx.supabase
    .from("product_variants")
    .select("id, sku, size, color_en, stock, product:products(id, name_en, name_ar, is_active)", { count: "exact" })
    .lte("stock", LOW_STOCK_THRESHOLD)
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
