import "server-only";

/* ══════════════════════════════════════════════════════════════
   Admin catalogue — reads (server only)
   ──────────────────────────────────────────────────────────────
   Every function checks the caller is an admin (database role,
   per request) and reads with the admin's own session, so row-
   level security applies too. Non-admins get empty results.
   The two read models admin_catalog_products / admin_catalog_
   variants (migration 20261114050000) return rows to admins only.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getAdminContext } from "@/lib/admin/auth";
import { cleanSearchTerm, ilikeAny } from "@/lib/admin/search";
import { descendantIds } from "@/lib/admin/catalog-utils";
import { isSizeSystem } from "@/lib/admin/catalog-variants";
import type { InventoryListParams, ProductListParams } from "@/lib/admin/catalog-schema";
import type {
  CatalogCategory,
  CatalogProductRow,
  CollectionEditorData,
  CollectionRow,
  EditorImage,
  EditorVariant,
  InventoryRow,
  ListResult,
  PickerProduct,
  ProductEditorData,
} from "@/lib/admin/catalog-types";

export const PRODUCT_PAGE_SIZE = 25;
export const INVENTORY_PAGE_SIZE = 50;
const OPEN_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped"];

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v));
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type DbError = { code?: string; message?: string } | null | undefined;
function logDb(where: string, error: DbError) {
  if (error) console.error(`[admin-catalog:${where}]`, error.code ?? "", error.message ?? "");
}

/** Minimal shape of the PostgREST filter builder used by the list filters. */
interface Filterable {
  or(filters: string): Filterable;
  in(column: string, values: readonly string[]): Filterable;
  eq(column: string, value: unknown): Filterable;
  gt(column: string, value: unknown): Filterable;
  lte(column: string, value: unknown): Filterable;
}

/* ── Categories ───────────────────────────────────────────────── */

export async function getCatalogCategories(): Promise<CatalogCategory[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("categories")
    .select(
      "id, parent_id, name_en, name_ar, slug, description_en, description_ar, image_url, sort_order, is_active, is_featured, products(count)",
    )
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (error) {
    logDb("categories", error);
    return [];
  }
  type Row = Omit<CatalogCategory, "product_count"> & { products: { count: number }[] | null };
  return ((data ?? []) as unknown as Row[]).map(({ products, ...c }) => ({
    ...c,
    sort_order: num(c.sort_order),
    is_active: c.is_active !== false,
    is_featured: c.is_featured === true,
    product_count: num(one(products)?.count),
  }));
}

/* ── Products list ────────────────────────────────────────────── */

const PRODUCT_LIST_COLUMNS =
  "id, slug, name_en, name_ar, category_id, category_name_en, category_name_ar, base_price, sale_price, is_active, is_featured, is_new, created_at, updated_at, thumbnail_url, total_stock, variant_count, min_stock";

function toProductRow(r: Record<string, unknown>): CatalogProductRow {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name_en: String(r.name_en ?? ""),
    name_ar: String(r.name_ar ?? ""),
    category_id: (r.category_id as string | null) ?? null,
    category_name_en: (r.category_name_en as string | null) ?? null,
    category_name_ar: (r.category_name_ar as string | null) ?? null,
    base_price: num(r.base_price),
    sale_price: numOrNull(r.sale_price),
    is_active: r.is_active !== false,
    is_featured: r.is_featured === true,
    is_new: r.is_new === true,
    created_at: (r.created_at as string | null) ?? null,
    updated_at: (r.updated_at as string | null) ?? null,
    thumbnail_url: (r.thumbnail_url as string | null) ?? null,
    total_stock: num(r.total_stock),
    variant_count: num(r.variant_count),
    min_stock: num(r.min_stock),
  };
}

function applyProductFilters<Q>(
  query: Q,
  p: Pick<ProductListParams, "search" | "category" | "status" | "stock">,
  threshold: number,
  categories: CatalogCategory[],
): Q {
  // Supabase's builder types are too deep to constrain generically; it has these methods.
  let q = query as unknown as Filterable;
  const term = cleanSearchTerm(p.search);
  if (term) q = q.or(ilikeAny(["name_en", "name_ar", "slug", "skus"], term));
  if (p.category) q = q.in("category_id", [...descendantIds(categories, p.category)]);
  if (p.status === "active") q = q.eq("is_active", true);
  if (p.status === "draft") q = q.eq("is_active", false);
  if (p.stock === "out") q = q.lte("total_stock", 0);
  if (p.stock === "low") q = q.gt("total_stock", 0).lte("min_stock", threshold);
  if (p.stock === "in") q = q.gt("min_stock", threshold);
  return q as unknown as Q;
}

const PRODUCT_SORT: Record<ProductListParams["sort"], { column: string; ascending: boolean }[]> = {
  updated: [{ column: "updated_at", ascending: false }],
  newest: [{ column: "created_at", ascending: false }],
  name: [{ column: "name_en", ascending: true }],
  price_asc: [{ column: "base_price", ascending: true }],
  price_desc: [{ column: "base_price", ascending: false }],
  stock_asc: [{ column: "total_stock", ascending: true }],
  stock_desc: [{ column: "total_stock", ascending: false }],
};

export async function listCatalogProducts(
  params: ProductListParams,
  threshold: number,
  categories: CatalogCategory[],
): Promise<ListResult<CatalogProductRow>> {
  const empty = { rows: [], count: 0, totalPages: 0, page: params.page };
  const ctx = await getAdminContext();
  if (!ctx) return empty;
  const from = (params.page - 1) * PRODUCT_PAGE_SIZE;

  let query = applyProductFilters(
    ctx.supabase.from("admin_catalog_products").select(PRODUCT_LIST_COLUMNS, { count: "exact" }),
    params,
    threshold,
    categories,
  );
  for (const s of PRODUCT_SORT[params.sort]) query = query.order(s.column, { ascending: s.ascending, nullsFirst: false });
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + PRODUCT_PAGE_SIZE - 1);
  if (error) {
    logDb("products", error);
    return empty;
  }
  const total = count ?? 0;
  return {
    rows: ((data ?? []) as unknown as Record<string, unknown>[]).map(toProductRow),
    count: total,
    totalPages: Math.ceil(total / PRODUCT_PAGE_SIZE),
    page: params.page,
  };
}

/** All products matching the list filters (up to 5 000), for CSV. */
export async function listCatalogProductsForExport(
  params: ProductListParams,
  threshold: number,
  categories: CatalogCategory[],
): Promise<(CatalogProductRow & { skus: string })[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const out: (CatalogProductRow & { skus: string })[] = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    let query = applyProductFilters(
      ctx.supabase.from("admin_catalog_products").select(`${PRODUCT_LIST_COLUMNS}, skus`),
      params,
      threshold,
      categories,
    );
    for (const s of PRODUCT_SORT[params.sort]) query = query.order(s.column, { ascending: s.ascending, nullsFirst: false });
    const { data, error } = await query.order("id", { ascending: true }).range(offset, offset + 999);
    if (error) {
      logDb("products.export", error);
      break;
    }
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) out.push({ ...toProductRow(r), skus: String(r.skus ?? "") });
    if (!data || data.length < 1000) break;
  }
  return out;
}

/* ── Product editor ───────────────────────────────────────────── */

export const getProductForEditor = cache(async (id: string): Promise<ProductEditorData | null> => {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase
    .from("products")
    .select(
      `id, slug, name_en, name_ar, category_id, brand, tags, description_en, description_ar, details_en, details_ar,
       care_en, care_ar, base_price, sale_price, size_system, seo_title_en, seo_title_ar, seo_description_en,
       seo_description_ar, is_active, is_featured, is_new, created_at, updated_at,
       variants:product_variants(id, sku, size, color_en, color_ar, color_hex, stock, price_override, position, created_at),
       images:product_images(id, url, color_en, alt_text_en, alt_text_ar, is_primary, sort_order, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logDb("product", error);
    return null;
  }
  if (!data) return null;

  type V = Omit<EditorVariant, "locked"> & { created_at: string | null };
  type I = EditorImage & { sort_order: number | null; created_at: string | null };
  const row = data as unknown as Omit<ProductEditorData, "variants" | "images" | "order_lines"> & { variants: V[] | null; images: I[] | null };

  const variantIds = (row.variants ?? []).map((v) => v.id);
  const locked = new Set<string>();
  let orderLines = 0;
  if (variantIds.length) {
    const [open, all] = await Promise.all([
      ctx.supabase
        .from("order_items")
        .select("product_variant_id, order:orders!inner(status)")
        .in("product_variant_id", variantIds)
        .in("order.status", OPEN_ORDER_STATUSES),
      ctx.supabase.from("order_items").select("id", { count: "exact", head: true }).in("product_variant_id", variantIds),
    ]);
    logDb("product.open", open.error);
    logDb("product.lines", all.error);
    for (const r of (open.data ?? []) as { product_variant_id: string | null }[]) if (r.product_variant_id) locked.add(r.product_variant_id);
    orderLines = all.count ?? 0;
  }

  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    base_price: num(row.base_price),
    sale_price: numOrNull(row.sale_price),
    size_system: isSizeSystem(row.size_system) ? row.size_system : "apparel",
    is_active: row.is_active !== false,
    is_featured: row.is_featured === true,
    is_new: row.is_new === true,
    variants: (row.variants ?? [])
      .slice()
      .sort((a, b) => num(a.position) - num(b.position) || String(a.created_at).localeCompare(String(b.created_at)) || a.sku.localeCompare(b.sku))
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color_en: v.color_en,
        color_ar: v.color_ar,
        color_hex: v.color_hex,
        stock: num(v.stock),
        price_override: numOrNull(v.price_override),
        position: num(v.position),
        locked: locked.has(v.id),
      })),
    images: (row.images ?? [])
      .slice()
      .sort((a, b) => num(a.sort_order) - num(b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)))
      .map((i) => ({
        id: i.id,
        url: i.url,
        color_en: i.color_en,
        alt_text_en: i.alt_text_en,
        alt_text_ar: i.alt_text_ar,
        is_primary: i.is_primary === true,
      })),
    order_lines: orderLines,
  };
});

/** Is this slug used by another row of `table`? */
export async function isSlugTaken(table: "products" | "categories" | "collections", slug: string, exceptId: string | null): Promise<boolean> {
  const ctx = await getAdminContext();
  if (!ctx) return false;
  let q = ctx.supabase.from(table).select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  logDb("slug", error);
  return (data ?? []).length > 0;
}

/** SKUs from the list that other products already use. */
export async function findSkusInUse(skus: string[], exceptProductId: string | null): Promise<string[]> {
  const ctx = await getAdminContext();
  if (!ctx || skus.length === 0) return [];
  let q = ctx.supabase.from("product_variants").select("sku").in("sku", skus.slice(0, 500));
  if (exceptProductId) q = q.neq("product_id", exceptProductId);
  const { data, error } = await q;
  logDb("skus", error);
  return ((data ?? []) as { sku: string }[]).map((r) => r.sku);
}

/* ── Product picker (collections) ─────────────────────────────── */

function toPicker(r: Record<string, unknown>): PickerProduct {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name_en: String(r.name_en ?? ""),
    name_ar: String(r.name_ar ?? ""),
    thumbnail_url: (r.thumbnail_url as string | null) ?? null,
    is_active: r.is_active !== false,
    base_price: num(r.base_price),
    sale_price: numOrNull(r.sale_price),
  };
}

export async function searchPickerProducts(search: string, limit = 12): Promise<PickerProduct[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  let q = ctx.supabase.from("admin_catalog_products").select("id, slug, name_en, name_ar, thumbnail_url, is_active, base_price, sale_price");
  const term = cleanSearchTerm(search);
  if (term) q = q.or(ilikeAny(["name_en", "name_ar", "slug", "skus"], term));
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 30));
  logDb("picker", error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toPicker);
}

/* ── Collections ──────────────────────────────────────────────── */

const COLLECTION_COLUMNS = "id, slug, title_en, title_ar, image_url, is_active, sort_order, updated_at";

function toCollectionRow(r: Record<string, unknown>, count: number): CollectionRow {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title_en: String(r.title_en ?? ""),
    title_ar: String(r.title_ar ?? ""),
    image_url: (r.image_url as string | null) ?? null,
    is_active: r.is_active !== false,
    sort_order: num(r.sort_order),
    updated_at: (r.updated_at as string | null) ?? null,
    product_count: count,
  };
}

export async function listCollections(): Promise<CollectionRow[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("collections")
    .select(`${COLLECTION_COLUMNS}, collection_products(count)`)
    .order("sort_order", { ascending: true })
    .order("title_en", { ascending: true });
  if (error) {
    logDb("collections", error);
    return [];
  }
  return ((data ?? []) as unknown as (Record<string, unknown> & { collection_products: { count: number }[] | null })[]).map((r) =>
    toCollectionRow(r, num(one(r.collection_products)?.count)),
  );
}

export const getCollectionForEditor = cache(async (id: string): Promise<CollectionEditorData | null> => {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase
    .from("collections")
    .select(`${COLLECTION_COLUMNS}, description_en, description_ar, items:collection_products(product_id, position)`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logDb("collection", error);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as Record<string, unknown> & { items: { product_id: string; position: number | null }[] | null };
  const items = (row.items ?? []).slice().sort((a, b) => num(a.position) - num(b.position));
  const ids = items.map((i) => i.product_id);

  let products: PickerProduct[] = [];
  if (ids.length) {
    const { data: rows, error: e } = await ctx.supabase
      .from("admin_catalog_products")
      .select("id, slug, name_en, name_ar, thumbnail_url, is_active, base_price, sale_price")
      .in("id", ids);
    logDb("collection.products", e);
    const byId = new Map(((rows ?? []) as unknown as Record<string, unknown>[]).map((r) => [String(r.id), toPicker(r)]));
    products = ids.map((pid) => byId.get(pid)).filter((p): p is PickerProduct => !!p);
  }

  return {
    ...toCollectionRow(row, products.length),
    description_en: (row.description_en as string | null) ?? null,
    description_ar: (row.description_ar as string | null) ?? null,
    products,
  };
});

/* ── Inventory ────────────────────────────────────────────────── */

const INVENTORY_COLUMNS =
  "id, product_id, product_name_en, product_name_ar, product_slug, product_active, sku, size, color_en, color_ar, color_hex, stock, thumbnail_url";

function toInventoryRow(r: Record<string, unknown>): InventoryRow {
  return {
    id: String(r.id),
    product_id: String(r.product_id),
    product_name_en: String(r.product_name_en ?? ""),
    product_name_ar: String(r.product_name_ar ?? ""),
    product_slug: String(r.product_slug ?? ""),
    product_active: r.product_active !== false,
    sku: String(r.sku ?? ""),
    size: (r.size as string | null) ?? null,
    color_en: (r.color_en as string | null) ?? null,
    color_ar: (r.color_ar as string | null) ?? null,
    color_hex: (r.color_hex as string | null) ?? null,
    stock: num(r.stock),
    thumbnail_url: (r.thumbnail_url as string | null) ?? null,
  };
}

function applyInventoryFilters<Q>(
  query: Q,
  p: Pick<InventoryListParams, "search" | "category" | "stock">,
  threshold: number,
  categories: CatalogCategory[],
): Q {
  let q = query as unknown as Filterable;
  const term = cleanSearchTerm(p.search);
  if (term) q = q.or(ilikeAny(["sku", "product_name_en", "product_name_ar", "color_en", "color_ar"], term));
  if (p.category) q = q.in("category_id", [...descendantIds(categories, p.category)]);
  if (p.stock === "out") q = q.lte("stock", 0);
  if (p.stock === "low") q = q.gt("stock", 0).lte("stock", threshold);
  return q as unknown as Q;
}

const INVENTORY_SORT: Record<InventoryListParams["sort"], { column: string; ascending: boolean }[]> = {
  product: [
    { column: "product_name_en", ascending: true },
    { column: "position", ascending: true },
    { column: "created_at", ascending: true },
  ],
  stock_asc: [
    { column: "stock", ascending: true },
    { column: "product_name_en", ascending: true },
  ],
  stock_desc: [
    { column: "stock", ascending: false },
    { column: "product_name_en", ascending: true },
  ],
  sku: [{ column: "sku", ascending: true }],
};

export async function listInventory(
  params: InventoryListParams,
  threshold: number,
  categories: CatalogCategory[],
): Promise<ListResult<InventoryRow>> {
  const empty = { rows: [], count: 0, totalPages: 0, page: params.page };
  const ctx = await getAdminContext();
  if (!ctx) return empty;
  const from = (params.page - 1) * INVENTORY_PAGE_SIZE;
  let query = applyInventoryFilters(
    ctx.supabase.from("admin_catalog_variants").select(INVENTORY_COLUMNS, { count: "exact" }),
    params,
    threshold,
    categories,
  );
  for (const s of INVENTORY_SORT[params.sort]) query = query.order(s.column, { ascending: s.ascending });
  const { data, count, error } = await query.order("id", { ascending: true }).range(from, from + INVENTORY_PAGE_SIZE - 1);
  if (error) {
    logDb("inventory", error);
    return empty;
  }
  const total = count ?? 0;
  return {
    rows: ((data ?? []) as unknown as Record<string, unknown>[]).map(toInventoryRow),
    count: total,
    totalPages: Math.ceil(total / INVENTORY_PAGE_SIZE),
    page: params.page,
  };
}

export async function listInventoryForExport(
  params: InventoryListParams,
  threshold: number,
  categories: CatalogCategory[],
): Promise<InventoryRow[]> {
  const ctx = await getAdminContext();
  if (!ctx) return [];
  const out: InventoryRow[] = [];
  for (let offset = 0; offset < 20_000; offset += 1000) {
    let query = applyInventoryFilters(ctx.supabase.from("admin_catalog_variants").select(INVENTORY_COLUMNS), params, threshold, categories);
    for (const s of INVENTORY_SORT[params.sort]) query = query.order(s.column, { ascending: s.ascending });
    const { data, error } = await query.order("id", { ascending: true }).range(offset, offset + 999);
    if (error) {
      logDb("inventory.export", error);
      break;
    }
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) out.push(toInventoryRow(r));
    if (!data || data.length < 1000) break;
  }
  return out;
}
