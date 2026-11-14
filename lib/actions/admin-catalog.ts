"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions — admin catalogue
   ──────────────────────────────────────────────────────────────
   Products, categories, collections, inventory, image uploads and
   promo codes. Every action:
   1. checks on the server that the caller is an admin
      (getAdminContext: database role, per request);
   2. validates its input with zod (lib/admin/catalog-schema.ts);
   3. writes with the admin's own session, so row-level security
      (is_admin()) applies too — no service key is used for writes;
   4. records the change in the audit log;
   5. refreshes the admin and storefront pages it affects;
   6. returns { ok: true } or { ok: false, error: <key> }; database
      details are logged on the server, never sent to the browser.
   ══════════════════════════════════════════════════════════════ */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext, type AdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { toCsv } from "@/lib/admin/csv";
import { buildImagePath, IMAGE_BUCKET, publicImageUrl, storagePathFromUrl, type ImageMime } from "@/lib/admin/catalog-images";
import {
  bulkProductsSchema,
  bulkStockSchema,
  catalogErrorKey,
  catalogErrorPath,
  categoryInputSchema,
  collectionInputSchema,
  parseInventoryParams,
  parseProductListParams,
  productInputSchema,
  stockEditSchema,
  uploadRequestSchema,
  type CategoryInput,
  type CollectionInput,
  type ProductInput,
} from "@/lib/admin/catalog-schema";
import { descendantIds, isValidSlug, moveAmongSiblings, nextFreeSlug } from "@/lib/admin/catalog-utils";
import type { PickerProduct } from "@/lib/admin/catalog-types";
import { promoErrorKey, promoInputSchema, type PromoErrorKey, type PromoInput } from "@/lib/admin/promos";
import {
  findSkusInUse,
  getCatalogCategories,
  isSlugTaken,
  listCatalogProductsForExport,
  listInventoryForExport,
  searchPickerProducts,
} from "@/lib/dal/admin-catalog";
import { getStoreSettings } from "@/lib/settings";

export type CatalogResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; path?: (string | number)[] };

const fail = (error: string, path?: (string | number)[]): { ok: false; error: string; path?: (string | number)[] } =>
  path ? { ok: false, error, path } : { ok: false, error };

const guid = z.guid();
const SUPABASE_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type DbError = { code?: string; message?: string; details?: string } | null | undefined;
function logDb(where: string, error: DbError) {
  if (error) console.error(`[admin-catalog:${where}]`, error.code ?? "", error.message ?? "", error.details ?? "");
}

/** Error keys raised on purpose by the catalogue database functions. */
const RPC_KEYS = new Set([
  "not_found",
  "changed",
  "variant_has_open_orders",
  "stock_changed",
  "duplicate_slug",
  "duplicate_sku",
  "category",
]);

/* ── Page refresh ─────────────────────────────────────────────── */

/** Admin screens (lists, dashboard counters, sidebar badges). */
function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/** Storefront pages that show products: listings, search, home and the given product pages. */
function refreshStorefront(productSlugs: (string | null | undefined)[] = []) {
  for (const slug of new Set(productSlugs.filter((s): s is string => !!s))) revalidatePath(`/product/${slug}`);
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/shop");
  revalidatePath("/search");
  revalidatePath("/wishlist");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

/** Category and collection changes also reach the navigation in the root layout. */
function refreshWholeStore() {
  revalidatePath("/", "layout");
}

/* ── Storage clean-up ─────────────────────────────────────────── */

/**
 * Deletes our own Storage files for these URLs, unless a product image, a
 * category or a collection still uses them. External links are ignored.
 */
async function removeStoredImages(ctx: AdminContext, urls: (string | null | undefined)[]): Promise<void> {
  const candidates = [...new Set(urls.filter((u): u is string => !!u))];
  const own = candidates
    .map((url) => ({ url, path: storagePathFromUrl(url, SUPABASE_URL()) }))
    .filter((x): x is { url: string; path: string } => !!x.path);
  if (!own.length) return;
  const list = own.map((x) => x.url);
  const [imgs, cats, cols] = await Promise.all([
    ctx.supabase.from("product_images").select("url").in("url", list),
    ctx.supabase.from("categories").select("image_url").in("image_url", list),
    ctx.supabase.from("collections").select("image_url").in("image_url", list),
  ]);
  if (imgs.error || cats.error || cols.error) {
    logDb("storage.refs", imgs.error ?? cats.error ?? cols.error);
    return; // when unsure, keep the file
  }
  const used = new Set<string>([
    ...((imgs.data ?? []) as { url: string }[]).map((r) => r.url),
    ...((cats.data ?? []) as { image_url: string }[]).map((r) => r.image_url),
    ...((cols.data ?? []) as { image_url: string }[]).map((r) => r.image_url),
  ]);
  const paths = own.filter((x) => !used.has(x.url)).map((x) => x.path);
  if (!paths.length) return;
  const { error } = await ctx.supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error("[admin-catalog:storage.remove]", error.message);
}

/* ══ Uploads ══════════════════════════════════════════════════ */

/**
 * A one-time URL the admin's browser uploads one image to, directly to
 * Storage. Created only after the admin check; the bucket itself enforces
 * the size and type limits again.
 */
export async function createImageUpload(input: {
  scope: string;
  type: string;
  size: number;
}): Promise<CatalogResult<{ uploadUrl: string; publicUrl: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const path = buildImagePath(parsed.data.scope, parsed.data.type as ImageMime, randomUUID());
  const { data, error } = await ctx.supabase.storage.from(IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin-catalog:upload.sign]", error?.message);
    return fail("upload_failed");
  }
  await logAdminAction(ctx, "image.upload", "storage", path, { scope: parsed.data.scope, type: parsed.data.type, size: parsed.data.size });
  return { ok: true, uploadUrl: data.signedUrl, publicUrl: publicImageUrl(SUPABASE_URL(), path) };
}

/** Removes an uploaded image that was never saved (the admin took it out again before saving). */
export async function discardUploadedImage(url: string): Promise<CatalogResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (typeof url !== "string" || !storagePathFromUrl(url, SUPABASE_URL())) return { ok: true };
  await removeStoredImages(ctx, [url]);
  return { ok: true };
}

/* ══ Slugs & SKUs ═════════════════════════════════════════════ */

const SLUG_TABLES = { product: "products", category: "categories", collection: "collections" } as const;

/** Whether a slug is free; when it isn't, a free variation to suggest. */
export async function checkSlug(
  kind: keyof typeof SLUG_TABLES,
  slug: string,
  exceptId: string | null,
): Promise<CatalogResult<{ available: boolean; suggestion: string | null }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!(kind in SLUG_TABLES) || typeof slug !== "string" || !isValidSlug(slug)) return fail("slug");
  if (exceptId !== null && !guid.safeParse(exceptId).success) return fail("not_found");
  const table = SLUG_TABLES[kind];
  if (!(await isSlugTaken(table, slug, exceptId))) return { ok: true, available: true, suggestion: null };
  const { data } = await ctx.supabase.from(table).select("slug").like("slug", `${slug.replace(/[%_\\]/g, "\\$&")}-%`).limit(200);
  const taken = new Set<string>([slug, ...((data ?? []) as { slug: string }[]).map((r) => r.slug)]);
  return { ok: true, available: false, suggestion: nextFreeSlug(slug, taken) };
}

/** Which of these SKUs other products already use (so generated SKUs don't clash). */
export async function findTakenSkus(skus: string[], productId: string | null): Promise<CatalogResult<{ taken: string[] }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = z.array(z.string().max(64)).max(500).safeParse(skus);
  if (!parsed.success || (productId !== null && !guid.safeParse(productId).success)) return fail("generic");
  return { ok: true, taken: await findSkusInUse(parsed.data, productId) };
}

/* ══ Products ═════════════════════════════════════════════════ */

/**
 * Creates or updates a product with its variants and images in one database
 * transaction (admin_save_product), then deletes Storage files of removed photos.
 */
export async function saveProduct(input: ProductInput): Promise<CatalogResult<{ id: string; slug: string; created: boolean }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error), catalogErrorPath(parsed.error));
  const v = parsed.data;

  let oldSlug: string | null = null;
  if (v.id) {
    const { data: current } = await ctx.supabase.from("products").select("slug").eq("id", v.id).maybeSingle();
    if (!current) return fail("not_found");
    oldSlug = current.slug as string;
  }

  const primaryIndex = Math.max(0, v.images.findIndex((i) => i.is_primary));
  const payload = {
    id: v.id,
    expected_updated_at: v.expected_updated_at,
    product: { ...v.product },
    variants: v.variants.map((row, i) => ({ ...row, position: i })),
    images: v.images.map((img, i) => ({ ...img, sort_order: i + 1, is_primary: i === primaryIndex })),
  };

  const { data, error } = await ctx.supabase.rpc("admin_save_product", { p_payload: payload });
  if (error) {
    if (error.code === "P0001" && RPC_KEYS.has(error.message)) return fail(error.message);
    logDb("saveProduct", error);
    return fail(error.code === "42501" ? "unauthorized" : "save_failed");
  }
  const result = data as { id: string; slug: string; removed_image_urls: string[] | null };

  await removeStoredImages(ctx, result.removed_image_urls ?? []);
  await logAdminAction(ctx, v.id ? "product.update" : "product.create", "products", result.id, {
    name: v.product.name_en,
    slug: result.slug,
    active: v.product.is_active,
    variants: v.variants.length,
    images: v.images.length,
  });
  refreshAdmin();
  refreshStorefront([oldSlug, result.slug]);
  return { ok: true, id: result.id, slug: result.slug, created: !v.id };
}

/**
 * Deletes products that were never ordered (and their Storage photos). Products
 * with order history are hidden from the store instead, so past orders keep their link.
 */
async function deleteOrHide(ctx: AdminContext, ids: string[]): Promise<{ deleted: string[]; hidden: string[] } | null> {
  const { data: products, error } = await ctx.supabase
    .from("products")
    .select("id, slug, variants:product_variants(id), images:product_images(url)")
    .in("id", ids);
  if (error) return (logDb("delete.read", error), null);
  type Row = { id: string; slug: string; variants: { id: string }[] | null; images: { url: string }[] | null };
  const rows = (products ?? []) as unknown as Row[];
  const variantOwner = new Map<string, string>();
  for (const p of rows) for (const v of p.variants ?? []) variantOwner.set(v.id, p.id);

  const ordered = new Set<string>();
  const variantIds = [...variantOwner.keys()];
  for (let i = 0; i < variantIds.length; i += 300) {
    const { data: lines, error: e } = await ctx.supabase
      .from("order_items")
      .select("product_variant_id")
      .in("product_variant_id", variantIds.slice(i, i + 300));
    if (e) return (logDb("delete.orders", e), null);
    for (const l of (lines ?? []) as { product_variant_id: string | null }[]) {
      const owner = l.product_variant_id ? variantOwner.get(l.product_variant_id) : undefined;
      if (owner) ordered.add(owner);
    }
  }

  const hide = rows.filter((p) => ordered.has(p.id));
  const remove = rows.filter((p) => !ordered.has(p.id));
  if (hide.length) {
    const { error: e } = await ctx.supabase.from("products").update({ is_active: false }).in("id", hide.map((p) => p.id));
    if (e) return (logDb("delete.hide", e), null);
  }
  if (remove.length) {
    const { error: e } = await ctx.supabase.from("products").delete().in("id", remove.map((p) => p.id));
    if (e) return (logDb("delete", e), null);
    await removeStoredImages(ctx, remove.flatMap((p) => (p.images ?? []).map((i) => i.url)));
  }
  for (const p of hide) await logAdminAction(ctx, "product.hide", "products", p.id, { slug: p.slug, reason: "has_orders" });
  for (const p of remove) await logAdminAction(ctx, "product.delete", "products", p.id, { slug: p.slug });
  refreshStorefront(rows.map((p) => p.slug));
  return { deleted: remove.map((p) => p.id), hidden: hide.map((p) => p.id) };
}

export async function deleteProduct(id: string): Promise<CatalogResult<{ hidden: boolean }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!guid.safeParse(id).success) return fail("not_found");
  const res = await deleteOrHide(ctx, [id]);
  if (!res) return fail("save_failed");
  if (!res.deleted.length && !res.hidden.length) return fail("not_found");
  refreshAdmin();
  return { ok: true, hidden: res.hidden.length > 0 };
}

/** Activate, set to draft, or delete (hide when ordered) several products. */
export async function bulkUpdateProducts(input: { ids: string[]; op: string }): Promise<CatalogResult<{ changed: number; deleted: number; hidden: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = bulkProductsSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const { ids, op } = parsed.data;

  if (op === "delete") {
    const res = await deleteOrHide(ctx, ids);
    if (!res) return fail("save_failed");
    refreshAdmin();
    return { ok: true, changed: res.deleted.length + res.hidden.length, deleted: res.deleted.length, hidden: res.hidden.length };
  }

  const active = op === "activate";
  const { data, error } = await ctx.supabase.from("products").update({ is_active: active }).in("id", ids).select("id, slug");
  if (error) return (logDb("bulk", error), fail("save_failed"));
  const rows = (data ?? []) as { id: string; slug: string }[];
  await logAdminAction(ctx, active ? "product.bulk_activate" : "product.bulk_deactivate", "products", null, { ids: rows.map((r) => r.id) });
  refreshAdmin();
  refreshStorefront(rows.map((r) => r.slug));
  return { ok: true, changed: rows.length, deleted: 0, hidden: 0 };
}

/* ══ Categories ═══════════════════════════════════════════════ */

export async function saveCategory(input: CategoryInput): Promise<CatalogResult<{ id: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const { id, ...v } = parsed.data;

  let previousImage: string | null = null;
  if (id) {
    const { data: current } = await ctx.supabase.from("categories").select("id, image_url").eq("id", id).maybeSingle();
    if (!current) return fail("not_found");
    previousImage = (current.image_url as string | null) ?? null;
    if (v.parent_id) {
      const all = await getCatalogCategories();
      if (descendantIds(all, id).has(v.parent_id)) return fail("category_parent");
    }
  }
  if (v.parent_id) {
    const { data: parent } = await ctx.supabase.from("categories").select("id").eq("id", v.parent_id).maybeSingle();
    if (!parent) return fail("category_parent");
  }

  let sortOrder: number | undefined;
  if (!id) {
    let q = ctx.supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    q = v.parent_id ? q.eq("parent_id", v.parent_id) : q.is("parent_id", null);
    const { data: last } = await q;
    sortOrder = Number((last ?? [])[0]?.sort_order ?? 0) + 1;
  }

  const row = { ...v, ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}) };
  const { data, error } = id
    ? await ctx.supabase.from("categories").update(row).eq("id", id).select("id").maybeSingle()
    : await ctx.supabase.from("categories").insert(row).select("id").single();
  if (error) {
    logDb("saveCategory", error);
    return fail(error.code === "23505" ? "duplicate_slug" : "save_failed");
  }
  if (!data) return fail("not_found");
  if (previousImage && previousImage !== v.image_url) await removeStoredImages(ctx, [previousImage]);
  await logAdminAction(ctx, id ? "category.update" : "category.create", "categories", data.id as string, { slug: v.slug, name: v.name_en });
  refreshAdmin();
  refreshWholeStore();
  return { ok: true, id: data.id as string };
}

/** Deletes a category only when it has no products and no subcategories. */
export async function deleteCategory(id: string): Promise<CatalogResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!guid.safeParse(id).success) return fail("not_found");
  const [products, children, current] = await Promise.all([
    ctx.supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id),
    ctx.supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id),
    ctx.supabase.from("categories").select("id, slug, image_url").eq("id", id).maybeSingle(),
  ]);
  if (products.error || children.error || current.error) {
    logDb("deleteCategory.check", products.error ?? children.error ?? current.error);
    return fail("save_failed");
  }
  if (!current.data) return fail("not_found");
  // products.category_id cascades on delete: never delete a category that still has products.
  if ((products.count ?? 0) > 0) return fail("category_has_products");
  if ((children.count ?? 0) > 0) return fail("category_has_children");

  const { error } = await ctx.supabase.from("categories").delete().eq("id", id);
  if (error) return (logDb("deleteCategory", error), fail("save_failed"));
  await removeStoredImages(ctx, [current.data.image_url as string | null]);
  await logAdminAction(ctx, "category.delete", "categories", id, { slug: current.data.slug });
  refreshAdmin();
  refreshWholeStore();
  return { ok: true };
}

/** Moves a category one place up or down among its siblings. */
export async function moveCategory(id: string, direction: "up" | "down"): Promise<CatalogResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!guid.safeParse(id).success || (direction !== "up" && direction !== "down")) return fail("not_found");
  const all = await getCatalogCategories();
  const me = all.find((c) => c.id === id);
  if (!me) return fail("not_found");
  const siblings = all
    .filter((c) => (c.parent_id ?? null) === (me.parent_id ?? null))
    .sort((a, b) => a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en))
    .map((c) => c.id);
  const next = moveAmongSiblings(siblings, id, direction);
  if (!next) return { ok: true };
  const { error } = await ctx.supabase.rpc("admin_set_category_order", { p_ids: next });
  if (error) return (logDb("moveCategory", error), fail("save_failed"));
  await logAdminAction(ctx, "category.reorder", "categories", id, { direction });
  refreshAdmin();
  refreshWholeStore();
  return { ok: true };
}

/* ══ Collections ══════════════════════════════════════════════ */

export async function saveCollection(input: CollectionInput): Promise<CatalogResult<{ id: string; created: boolean }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = collectionInputSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const { id, product_ids, ...v } = parsed.data;

  let previousImage: string | null = null;
  if (id) {
    const { data: current } = await ctx.supabase.from("collections").select("id, image_url").eq("id", id).maybeSingle();
    if (!current) return fail("not_found");
    previousImage = (current.image_url as string | null) ?? null;
  }

  const row = { ...v, updated_at: new Date().toISOString() };
  const { data, error } = id
    ? await ctx.supabase.from("collections").update(row).eq("id", id).select("id").maybeSingle()
    : await ctx.supabase.from("collections").insert(row).select("id").single();
  if (error) {
    logDb("saveCollection", error);
    return fail(error.code === "23505" ? "duplicate_slug" : "save_failed");
  }
  if (!data) return fail("not_found");
  const collectionId = data.id as string;

  const { error: e } = await ctx.supabase.rpc("admin_set_collection_products", { p_collection: collectionId, p_products: product_ids });
  if (e) {
    logDb("saveCollection.products", e);
    return fail("save_failed");
  }
  if (previousImage && previousImage !== v.image_url) await removeStoredImages(ctx, [previousImage]);
  await logAdminAction(ctx, id ? "collection.update" : "collection.create", "collections", collectionId, {
    slug: v.slug,
    products: product_ids.length,
  });
  refreshAdmin();
  refreshWholeStore();
  return { ok: true, id: collectionId, created: !id };
}

export async function deleteCollection(id: string): Promise<CatalogResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!guid.safeParse(id).success) return fail("not_found");
  const { data, error } = await ctx.supabase.from("collections").delete().eq("id", id).select("id, slug, image_url");
  if (error) return (logDb("deleteCollection", error), fail("save_failed"));
  const row = (data ?? [])[0] as { slug: string; image_url: string | null } | undefined;
  if (!row) return fail("not_found");
  await removeStoredImages(ctx, [row.image_url]);
  await logAdminAction(ctx, "collection.delete", "collections", id, { slug: row.slug });
  refreshAdmin();
  refreshWholeStore();
  return { ok: true };
}

export async function searchProductsForPicker(search: string): Promise<CatalogResult<{ products: PickerProduct[] }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  return { ok: true, products: await searchPickerProducts(typeof search === "string" ? search.slice(0, 100) : "") };
}

/* ══ Inventory ════════════════════════════════════════════════ */

/**
 * Sets one variant's stock. The update only applies if the stock is still what
 * the admin saw, so an order placed meanwhile is never overwritten.
 */
export async function setVariantStock(input: { id: string; stock: number | string; expected?: number | null }): Promise<
  CatalogResult<{ stock: number }> | { ok: false; error: "stock_changed"; current: number }
> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = stockEditSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const { id, stock, expected } = parsed.data;

  let q = ctx.supabase.from("product_variants").update({ stock }).eq("id", id);
  if (expected != null) q = q.eq("stock", expected);
  const { data, error } = await q.select("id, sku, product:products(slug)");
  if (error) return (logDb("setStock", error), fail(error.code === "23514" ? "stock" : "save_failed"));
  if (!data?.length) {
    const { data: now } = await ctx.supabase.from("product_variants").select("stock").eq("id", id).maybeSingle();
    if (!now) return fail("not_found");
    return { ok: false, error: "stock_changed", current: Number(now.stock ?? 0) };
  }
  const row = data[0] as unknown as { sku: string; product: { slug: string } | { slug: string }[] | null };
  const slug = Array.isArray(row.product) ? row.product[0]?.slug : row.product?.slug;
  await logAdminAction(ctx, "inventory.set", "product_variants", id, { sku: row.sku, from: expected ?? null, to: stock });
  refreshAdmin();
  refreshStorefront([slug]);
  return { ok: true, stock };
}

export async function bulkSetStock(input: { ids: string[]; stock: number | string }): Promise<CatalogResult<{ count: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const parsed = bulkStockSchema.safeParse(input);
  if (!parsed.success) return fail(catalogErrorKey(parsed.error));
  const { ids, stock } = parsed.data;
  const { data, error } = await ctx.supabase.from("product_variants").update({ stock }).in("id", ids).select("id, sku");
  if (error) return (logDb("bulkStock", error), fail("save_failed"));
  await logAdminAction(ctx, "inventory.bulk_set", "product_variants", null, {
    to: stock,
    skus: ((data ?? []) as { sku: string }[]).map((r) => r.sku),
  });
  refreshAdmin();
  refreshStorefront();
  return { ok: true, count: data?.length ?? 0 };
}

/* ══ CSV exports ══════════════════════════════════════════════ */

type SearchParams = Record<string, string | string[] | undefined>;

function cleanParams(raw: unknown): SearchParams {
  if (!raw || typeof raw !== "object") return {};
  const out: SearchParams = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 20)) if (typeof v === "string") out[k] = v.slice(0, 200);
  return out;
}

export async function exportProductsCsv(rawParams: Record<string, string>): Promise<CatalogResult<{ csv: string; count: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const params = parseProductListParams(cleanParams(rawParams));
  const [settings, categories] = await Promise.all([getStoreSettings(), getCatalogCategories()]);
  const rows = await listCatalogProductsForExport(params, settings.inventory.lowStockThreshold, categories);
  const csv = toCsv(rows, [
    { header: "name_en", value: (r) => r.name_en },
    { header: "name_ar", value: (r) => r.name_ar },
    { header: "slug", value: (r) => r.slug },
    { header: "category_en", value: (r) => r.category_name_en },
    { header: "category_ar", value: (r) => r.category_name_ar },
    { header: "base_price", value: (r) => r.base_price },
    { header: "sale_price", value: (r) => r.sale_price },
    { header: "status", value: (r) => (r.is_active ? "active" : "draft") },
    { header: "featured", value: (r) => r.is_featured },
    { header: "new", value: (r) => r.is_new },
    { header: "variants", value: (r) => r.variant_count },
    { header: "total_stock", value: (r) => r.total_stock },
    { header: "skus", value: (r) => r.skus },
    { header: "updated_at", value: (r) => r.updated_at },
  ]);
  await logAdminAction(ctx, "product.export", "products", null, { count: rows.length });
  return { ok: true, csv, count: rows.length };
}

export async function exportInventoryCsv(rawParams: Record<string, string>): Promise<CatalogResult<{ csv: string; count: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  const params = parseInventoryParams(cleanParams(rawParams));
  const [settings, categories] = await Promise.all([getStoreSettings(), getCatalogCategories()]);
  const rows = await listInventoryForExport(params, settings.inventory.lowStockThreshold, categories);
  const csv = toCsv(rows, [
    { header: "product_en", value: (r) => r.product_name_en },
    { header: "product_ar", value: (r) => r.product_name_ar },
    { header: "sku", value: (r) => r.sku },
    { header: "colour_en", value: (r) => r.color_en },
    { header: "colour_ar", value: (r) => r.color_ar },
    { header: "size", value: (r) => r.size },
    { header: "stock", value: (r) => r.stock },
    { header: "product_status", value: (r) => (r.product_active ? "active" : "draft") },
  ]);
  await logAdminAction(ctx, "inventory.export", "product_variants", null, { count: rows.length });
  return { ok: true, csv, count: rows.length };
}

/* ══ Promo codes ══════════════════════════════════════════════ */

/** Creates (id = null) or edits a promo code. Codes are stored in capitals and unique regardless of case. */
export async function savePromo(id: string | null, input: PromoInput): Promise<CatalogResult<{ id: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (id !== null && !guid.safeParse(id).success) return fail("not_found" satisfies PromoErrorKey);
  const parsed = promoInputSchema.safeParse(input);
  if (!parsed.success) return fail(promoErrorKey(parsed.error));
  const v = parsed.data;

  // Checkout matches codes case-insensitively: refuse the same code in other letter case.
  const { data: clash, error: clashError } = await ctx.supabase
    .from("promocodes")
    .select("id")
    .ilike("code", v.code.replace(/[%_\\]/g, "\\$&"))
    .limit(2);
  if (clashError) return (logDb("promo.clash", clashError), fail("generic"));
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
      logDb("promo.insert", error);
      return fail(error?.code === "23505" ? "duplicate" : "generic");
    }
    await logAdminAction(ctx, "promo.create", "promocodes", data.id as string, { code: v.code });
    refreshAdmin();
    return { ok: true, id: data.id as string };
  }

  const { data: existing, error: readError } = await ctx.supabase.from("promocodes").select("id, current_uses").eq("id", id).maybeSingle();
  if (readError) return (logDb("promo.read", readError), fail("generic"));
  if (!existing) return fail("not_found");
  if (v.max_uses != null && v.max_uses < (existing.current_uses ?? 0)) return fail("max_below_used" satisfies PromoErrorKey);

  const { error } = await ctx.supabase.from("promocodes").update(row).eq("id", id);
  if (error) {
    logDb("promo.update", error);
    return fail(error.code === "23505" ? "duplicate" : "generic");
  }
  await logAdminAction(ctx, "promo.update", "promocodes", id, { code: v.code });
  refreshAdmin();
  return { ok: true, id };
}

export async function setPromoActive(id: string, active: boolean): Promise<CatalogResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (!guid.safeParse(id).success || typeof active !== "boolean") return fail("not_found");
  const { data, error } = await ctx.supabase.from("promocodes").update({ is_active: active }).eq("id", id).select("id, code");
  if (error) return (logDb("promo.active", error), fail("generic"));
  if (!data?.length) return fail("not_found");
  await logAdminAction(ctx, active ? "promo.activate" : "promo.deactivate", "promocodes", id, { code: data[0].code });
  refreshAdmin();
  return { ok: true };
}
