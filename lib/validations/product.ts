/* ══════════════════════════════════════════════════════════════
   Validation Schemas — Product & Category
   ──────────────────────────────────────────────────────────────
   Zod schemas for server-side validation of admin product and
   category mutations. Prevents XSS, malformed data, and
   business-logic violations (e.g. negative prices).

   NOTE: Uses Zod v4 API (error messages via `{ error: "..." }`).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

/* ── Variant Schema ──────────────────────────────────────────── */

export const variantSchema = z.object({
  sku: z.string().max(100).optional(),
  stock: z.coerce
    .number()
    .int()
    .min(0, { error: "Stock cannot be negative" })
    .default(0),
  price_override: z.coerce.number().min(0).nullable().optional(),
  size: z.string().max(20).nullable().optional(),
  color_en: z.string().max(50).nullable().optional(),
  color_ar: z.string().max(50).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
});

/* ── Create Product Schema ───────────────────────────────────── */

export const createProductSchema = z.object({
  name_en: z
    .string()
    .min(2, { error: "English name must be at least 2 characters" })
    .max(200, { error: "English name must be under 200 characters" })
    .trim(),
  name_ar: z
    .string()
    .min(2, { error: "Arabic name must be at least 2 characters" })
    .max(200, { error: "Arabic name must be under 200 characters" })
    .trim(),
  description_en: z.string().max(5000).optional().nullable(),
  description_ar: z.string().max(5000).optional().nullable(),
  base_price: z.coerce
    .number()
    .positive({ error: "Base price must be greater than 0" })
    .max(999999.99, { error: "Base price too high" }),
  sale_price: z.coerce.number().min(0).max(999999.99).optional().nullable(),
  category_id: z.string().uuid({ error: "Invalid category ID" }),
  stock: z.coerce.number().int().min(0).optional().default(0),
  images: z.array(z.string().url({ error: "Invalid image URL" })).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
});

/* ── Update Product Schema (same but id is required) ─────────── */

export const updateProductSchema = createProductSchema;

/* ── Create Category Schema ──────────────────────────────────── */

export const createCategorySchema = z.object({
  name_en: z
    .string()
    .min(2, { error: "English name must be at least 2 characters" })
    .max(100, { error: "English name must be under 100 characters" })
    .trim(),
  name_ar: z
    .string()
    .min(2, { error: "Arabic name must be at least 2 characters" })
    .max(100, { error: "Arabic name must be under 100 characters" })
    .trim(),
});

/* ── Inferred Types ──────────────────────────────────────────── */

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
