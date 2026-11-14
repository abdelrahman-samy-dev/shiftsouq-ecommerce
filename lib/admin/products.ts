/* ══════════════════════════════════════════════════════════════
   Admin — product input (shared by the form and the server)
   ──────────────────────────────────────────────────────────────
   • Image URLs must be https on a host that next/image is allowed
     to load (see next.config.ts `images.remotePatterns`); any other
     host makes product pages fail to render.
   • Variants carry their database id when they already exist, so
     an edit updates them in place (stock and order history stay
     linked) instead of deleting and re-creating them.
   • IDs are checked with z.guid(): seed data uses ids such as
     33333333-0000-0000-0000-000000000001, which z.uuid() rejects.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

/** Mirrors next.config.ts images.remotePatterns. Keep the two in sync. */
const IMAGE_HOSTS: ReadonlyArray<{ host: RegExp; path: RegExp }> = [
  { host: /^images\.unsplash\.com$/, path: /^\// },
  { host: /^cdn\.dummyjson\.com$/, path: /^\// },
  { host: /^[a-z0-9-]+\.supabase\.co$/, path: /^\/storage\// },
  { host: /^[a-z0-9-]+\.supabase\.in$/, path: /^\/storage\// },
];

export const ALLOWED_IMAGE_HOSTS_LABEL = "images.unsplash.com, cdn.dummyjson.com, *.supabase.co/storage";

export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  return IMAGE_HOSTS.some((h) => h.host.test(url.hostname) && h.path.test(url.pathname));
}

const text = (max: number) => z.string().trim().max(max);
// Blank → null; a missing key is allowed too (zod v4 needs .optional() outside the preprocess).
const nullableText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), text(max).nullable()).optional();
const price = z.coerce.number().finite().min(0).max(999999.99);

export const adminVariantSchema = z.object({
  id: z.guid().optional().nullable(),
  sku: z
    .string()
    .trim()
    .min(1, { error: "sku" })
    .max(64, { error: "sku" })
    .regex(/^[A-Za-z0-9._\-/]+$/, { error: "sku" }),
  stock: z.coerce.number().int({ error: "stock" }).min(0, { error: "stock" }).max(1_000_000, { error: "stock" }),
  price_override: z.preprocess((v) => (v === "" || v === undefined ? null : v), price.positive({ error: "price" }).nullable()).optional(),
  size: nullableText(40),
  color_en: nullableText(50),
  color_ar: nullableText(50),
});

export const adminProductSchema = z
  .object({
    name_en: text(200).min(2, { error: "name_en" }),
    name_ar: text(200).min(2, { error: "name_ar" }),
    description_en: nullableText(5000),
    description_ar: nullableText(5000),
    base_price: price.positive({ error: "base_price" }),
    sale_price: z.preprocess((v) => (v === "" || v === undefined || v === 0 ? null : v), price.positive().nullable()).optional(),
    category_id: z.guid({ error: "category" }),
    /** Stock of the single variant, for products without options. */
    stock: z.coerce.number().int({ error: "stock" }).min(0, { error: "stock" }).max(1_000_000).default(0),
    images: z
      .array(z.string().trim().refine(isAllowedImageUrl, { error: "image_url" }))
      .max(12, { error: "too_many_images" })
      .default([]),
    variants: z.array(adminVariantSchema).max(100, { error: "too_many_variants" }).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.sale_price != null && p.sale_price >= p.base_price) {
      ctx.addIssue({ code: "custom", path: ["sale_price"], message: "sale_price" });
    }
    const skus = new Set<string>();
    const combos = new Set<string>();
    for (const v of p.variants) {
      const sku = v.sku.toUpperCase();
      if (skus.has(sku)) ctx.addIssue({ code: "custom", path: ["variants"], message: "duplicate_sku" });
      skus.add(sku);
      const combo = `${v.size ?? ""}|${v.color_en ?? ""}`.toLowerCase();
      if (combos.has(combo)) ctx.addIssue({ code: "custom", path: ["variants"], message: "duplicate_variant" });
      combos.add(combo);
    }
    if (new Set(p.images).size !== p.images.length) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "duplicate_image" });
    }
  });

export type AdminProductInput = z.input<typeof adminProductSchema>;
export type AdminProductValues = z.output<typeof adminProductSchema>;

/** First problem as a short key the UI can translate. */
export function productErrorKey(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "generic";
  if (issue.message && /^[a-z_]+$/.test(issue.message)) return issue.message;
  return String(issue.path[0] ?? "generic");
}
