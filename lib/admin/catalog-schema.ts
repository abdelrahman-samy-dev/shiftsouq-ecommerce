/* ══════════════════════════════════════════════════════════════
   Admin catalogue — input validation (shared by forms and server)
   ──────────────────────────────────────────────────────────────
   Every server action parses its input with these schemas; the
   editor uses the same ones for instant feedback. A failure gives
   a short key (see catalogErrorKey) that the UI translates.
   IDs use z.guid(): seed ids like 33333333-0000-0000-0000-000000000001
   are not RFC-4122 UUIDs, so z.uuid() would reject them.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { isAllowedImageUrl, isImageMime, MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES } from "./catalog-images";
import { HEX_PATTERN, SIZE_SYSTEMS, SKU_PATTERN } from "./catalog-variants";
import { isValidSlug, MAX_TAGS, normalizeTags, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, TAG_MAX } from "./catalog-utils";

/* ── Building blocks ─────────────────────────────────────────── */

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Optional text: trimmed, blank → null. */
const optText = (max: number, error: string) =>
  z.preprocess(blankToNull, z.string().trim().max(max, { error }).nullable()).optional().transform((v) => v ?? null);

const reqText = (min: number, max: number, error: string) => z.string({ error }).trim().min(min, { error }).max(max, { error });

const money = (error: string) => z.coerce.number({ error }).finite({ error }).max(999_999.99, { error });

const optMoney = (error: string) =>
  z
    .preprocess((v) => (v === "" || v === undefined || v === null ? null : v), money(error).positive({ error }).nullable())
    .optional()
    .transform((v) => v ?? null);

const slug = z.string().trim().toLowerCase().refine(isValidSlug, { error: "slug" });
const guid = z.guid();
const nullableGuid = z.preprocess((v) => (v === "" || v === undefined ? null : v), guid.nullable());
const stockInt = z.coerce.number({ error: "stock" }).int({ error: "stock" }).min(0, { error: "stock" }).max(1_000_000, { error: "stock" });

const imageUrl = z.string().trim().refine((u) => isAllowedImageUrl(u), { error: "image_url" });
const optImageUrl = z
  .preprocess(blankToNull, imageUrl.nullable())
  .optional()
  .transform((v) => v ?? null);

/* ── Product ─────────────────────────────────────────────────── */

export const variantInputSchema = z.object({
  id: nullableGuid.optional().transform((v) => v ?? null),
  sku: z.string().trim().regex(SKU_PATTERN, { error: "sku" }),
  size: optText(40, "size"),
  color_en: optText(50, "color_en"),
  color_ar: optText(50, "color_ar"),
  color_hex: z
    .preprocess(blankToNull, z.string().trim().regex(HEX_PATTERN, { error: "color_hex" }).nullable())
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  stock: stockInt,
  stock_loaded: z
    .preprocess((v) => (v === "" || v === undefined ? null : v), stockInt.nullable())
    .optional()
    .transform((v) => v ?? null),
  price_override: optMoney("price"),
});

export const imageInputSchema = z.object({
  id: nullableGuid.optional().transform((v) => v ?? null),
  url: imageUrl,
  color_en: optText(50, "image_colour"),
  alt_text_en: optText(200, "alt_text"),
  alt_text_ar: optText(200, "alt_text"),
  is_primary: z.boolean().default(false),
});

export const productInputSchema = z
  .object({
    id: nullableGuid,
    expected_updated_at: z
      .preprocess(blankToNull, z.iso.datetime({ offset: true }).nullable())
      .optional()
      .transform((v) => v ?? null),
    product: z.object({
      name_en: reqText(2, 200, "name_en"),
      name_ar: reqText(2, 200, "name_ar"),
      slug,
      category_id: z.guid({ error: "category" }),
      brand: optText(80, "brand"),
      tags: z
        .array(z.string().max(TAG_MAX * 2, { error: "tags" }))
        .max(MAX_TAGS * 2, { error: "tags" })
        .default([])
        .transform((t) => normalizeTags(t)),
      description_en: optText(5000, "description"),
      description_ar: optText(5000, "description"),
      details_en: optText(3000, "details"),
      details_ar: optText(3000, "details"),
      care_en: optText(2000, "care"),
      care_ar: optText(2000, "care"),
      base_price: money("base_price").positive({ error: "base_price" }),
      sale_price: optMoney("sale_price"),
      size_system: z.enum(SIZE_SYSTEMS, { error: "size_system" }),
      seo_title_en: optText(SEO_TITLE_MAX + 20, "seo_title"),
      seo_title_ar: optText(SEO_TITLE_MAX + 20, "seo_title"),
      seo_description_en: optText(SEO_DESCRIPTION_MAX + 40, "seo_description"),
      seo_description_ar: optText(SEO_DESCRIPTION_MAX + 40, "seo_description"),
      is_active: z.boolean().default(false),
      is_featured: z.boolean().default(false),
      is_new: z.boolean().default(false),
    }),
    variants: z.array(variantInputSchema).max(200, { error: "too_many_variants" }).default([]),
    images: z.array(imageInputSchema).max(MAX_PRODUCT_IMAGES, { error: "too_many_images" }).default([]),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const p = v.product;
    if (p.sale_price != null && p.sale_price >= p.base_price) issue("sale_price", ["product", "sale_price"]);
    if (p.is_active && v.variants.length === 0) issue("no_variants", ["variants"]);

    const skus = new Set<string>();
    const combos = new Set<string>();
    const colours = new Set<string>();
    v.variants.forEach((row, i) => {
      const sku = row.sku.toUpperCase();
      if (skus.has(sku)) issue("duplicate_sku", ["variants", i, "sku"]);
      skus.add(sku);
      const combo = `${row.color_en ?? ""}|${row.size ?? ""}`.toLowerCase();
      if (combos.has(combo)) issue("duplicate_variant", ["variants", i]);
      combos.add(combo);
      if (row.color_en) {
        colours.add(row.color_en.toLowerCase());
        if (!row.color_hex) issue("color_hex", ["variants", i, "color_hex"]);
        if (!row.color_ar && row.id == null) issue("color_ar", ["variants", i, "color_ar"]);
      }
    });

    const urls = new Set<string>();
    v.images.forEach((img, i) => {
      if (urls.has(img.url)) issue("duplicate_image", ["images", i, "url"]);
      urls.add(img.url);
      if (img.color_en && !colours.has(img.color_en.toLowerCase())) issue("image_colour", ["images", i, "color_en"]);
    });
  });

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductValues = z.output<typeof productInputSchema>;

/* ── Categories & collections ────────────────────────────────── */

export const categoryInputSchema = z.object({
  id: nullableGuid,
  name_en: reqText(2, 100, "name_en"),
  name_ar: reqText(2, 100, "name_ar"),
  slug,
  parent_id: nullableGuid.optional().transform((v) => v ?? null),
  description_en: optText(1000, "description"),
  description_ar: optText(1000, "description"),
  image_url: optImageUrl,
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const collectionInputSchema = z.object({
  id: nullableGuid,
  title_en: reqText(2, 120, "title_en"),
  title_ar: reqText(2, 120, "title_ar"),
  slug,
  description_en: optText(2000, "description"),
  description_ar: optText(2000, "description"),
  image_url: optImageUrl,
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number({ error: "sort_order" }).int({ error: "sort_order" }).min(0, { error: "sort_order" }).max(10_000, { error: "sort_order" }),
  product_ids: z
    .array(guid)
    .max(500, { error: "too_many_products" })
    .default([])
    .transform((ids) => [...new Set(ids)]),
});
export type CollectionInput = z.input<typeof collectionInputSchema>;

/* ── Stock, bulk actions, uploads ────────────────────────────── */

export const stockEditSchema = z.object({
  id: guid,
  stock: stockInt,
  /** The value the admin saw; the edit is refused if stock moved meanwhile. */
  expected: z.coerce.number().int().min(0).nullable().optional(),
});

export const bulkStockSchema = z.object({
  ids: z.array(guid).min(1, { error: "nothing_selected" }).max(500, { error: "too_many" }),
  stock: stockInt,
});

export const BULK_PRODUCT_OPS = ["activate", "deactivate", "delete"] as const;
export const bulkProductsSchema = z.object({
  ids: z.array(guid).min(1, { error: "nothing_selected" }).max(200, { error: "too_many" }),
  op: z.enum(BULK_PRODUCT_OPS),
});

export const uploadRequestSchema = z.object({
  scope: z.enum(["products", "categories", "collections"]),
  type: z.string().refine(isImageMime, { error: "upload_type" }),
  size: z.number().int().positive({ error: "upload_size" }).max(MAX_IMAGE_BYTES, { error: "upload_size" }),
});

/* ── Lists (URL search params) ───────────────────────────────── */

export const PRODUCT_SORTS = ["updated", "newest", "name", "price_asc", "price_desc", "stock_asc", "stock_desc"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const STOCK_FILTERS = ["in", "low", "out"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export interface ProductListParams {
  search: string;
  category: string | null;
  status: "active" | "draft" | null;
  stock: StockFilter | null;
  sort: ProductSort;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function clampPage(raw: unknown): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

/** Reads the product list state from the URL; unknown values fall back to defaults. */
export function parseProductListParams(sp: Record<string, string | string[] | undefined>): ProductListParams {
  const search = (first(sp.search) ?? first(sp.q) ?? "").slice(0, 100);
  const category = first(sp.category);
  const status = first(sp.status);
  const stock = first(sp.stock);
  const sort = first(sp.sort);
  return {
    search,
    category: category && guid.safeParse(category).success ? category : null,
    status: status === "active" || status === "draft" ? status : null,
    stock: (STOCK_FILTERS as readonly string[]).includes(stock ?? "") ? (stock as StockFilter) : null,
    sort: (PRODUCT_SORTS as readonly string[]).includes(sort ?? "") ? (sort as ProductSort) : "updated",
    page: clampPage(first(sp.page)),
  };
}

export const INVENTORY_SORTS = ["product", "stock_asc", "stock_desc", "sku"] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export interface InventoryListParams {
  search: string;
  category: string | null;
  stock: Exclude<StockFilter, "in"> | null;
  sort: InventorySort;
  page: number;
}

export function parseInventoryParams(sp: Record<string, string | string[] | undefined>): InventoryListParams {
  const stock = first(sp.stock);
  const sort = first(sp.sort);
  const category = first(sp.category);
  return {
    search: (first(sp.search) ?? first(sp.q) ?? "").slice(0, 100),
    category: category && guid.safeParse(category).success ? category : null,
    stock: stock === "low" || stock === "out" ? stock : null,
    sort: (INVENTORY_SORTS as readonly string[]).includes(sort ?? "") ? (sort as InventorySort) : "product",
    page: clampPage(first(sp.page)),
  };
}

/* ── Errors ──────────────────────────────────────────────────── */

/** First problem as a short key (e.g. "sale_price", "duplicate_sku") the UI can translate. */
export function catalogErrorKey(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "generic";
  if (issue.message && /^[a-z_]+$/.test(issue.message)) return issue.message;
  const last = [...issue.path].reverse().find((p) => typeof p === "string");
  return typeof last === "string" ? last : "generic";
}

/** Where a problem shows up in the product editor, for scrolling to it. */
export function catalogErrorPath(error: z.ZodError): (string | number)[] {
  return (error.issues[0]?.path ?? []) as (string | number)[];
}
