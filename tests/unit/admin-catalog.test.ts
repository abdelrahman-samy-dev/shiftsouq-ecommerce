import { describe, expect, it } from "vitest";
import {
  buildMatrix,
  colourCode,
  coloursFromVariants,
  compressWord,
  makeSku,
  moveItem,
  sizeCode,
  sizesFromVariants,
  skuBase,
  uniqueSku,
  type VariantRow,
} from "@/lib/admin/catalog-variants";
import {
  buildTree,
  descendantIds,
  detailLines,
  flattenTree,
  isValidSlug,
  moveAmongSiblings,
  nextFreeSlug,
  normalizeTags,
  productStockState,
  slugify,
  snippetText,
  stockState,
} from "@/lib/admin/catalog-utils";
import { buildImagePath, checkUploadFile, isAllowedImageUrl, publicImageUrl, storagePathFromUrl } from "@/lib/admin/catalog-images";
import {
  bulkStockSchema,
  catalogErrorKey,
  categoryInputSchema,
  collectionInputSchema,
  parseInventoryParams,
  parseProductListParams,
  productInputSchema,
  stockEditSchema,
  uploadRequestSchema,
  type ProductInput,
} from "@/lib/admin/catalog-schema";
import { editorFingerprint, initialEditorState, sectionForError, toProductInput } from "@/lib/admin/catalog-editor";
import type { ProductEditorData } from "@/lib/admin/catalog-types";

const CAT = "33333333-0000-0000-0000-000000000001";
const V1 = "55555555-0000-0000-0000-000000000001";
const V2 = "55555555-0000-0000-0000-000000000002";
const I1 = "66666666-0000-0000-0000-000000000001";
let k = 0;
const key = () => `t${k++}`;

const row = (over: Partial<VariantRow>): VariantRow => ({
  key: key(),
  id: null,
  sku: "SKU",
  size: null,
  color_en: null,
  color_ar: null,
  color_hex: null,
  stock: 0,
  stock_loaded: null,
  price_override: null,
  locked: false,
  ...over,
});

describe("slugs", () => {
  it("slugifies English names", () => {
    expect(slugify("Linen Overshirt — Sand")).toBe("linen-overshirt-sand");
    expect(slugify("  Men's  Café & Bar ")).toBe("mens-cafe-and-bar");
    expect(slugify("قميص كتان")).toBe("");
    expect(slugify("a".repeat(120)).length).toBeLessThanOrEqual(80);
  });
  it("validates slugs", () => {
    expect(isValidSlug("linen-shirt-2")).toBe(true);
    for (const bad of ["", "a", "Linen", "linen--shirt", "-linen", "linen_shirt", "لينين"]) expect(isValidSlug(bad)).toBe(false);
  });
  it("suggests the next free slug", () => {
    expect(nextFreeSlug("polo", new Set())).toBe("polo");
    expect(nextFreeSlug("polo", new Set(["polo", "polo-2"]))).toBe("polo-3");
  });
});

describe("SKU generation", () => {
  it("builds short codes", () => {
    expect(compressWord("Overshirt")).toBe("OVR");
    expect(compressWord("Navy")).toBe("NVY");
    expect(compressWord("Ox")).toBe("OX");
    expect(skuBase("Linen Overshirt")).toBe("LNNOVR");
    expect(skuBase("Polo")).toBe("PLO");
    expect(skuBase("قميص")).toBe("SKU");
    expect(colourCode("Black")).toBe("BLC");
    expect(colourCode("Off White")).toBe("OFFWHT");
    expect(colourCode("زيتي", 1)).toBe("C2");
    expect(sizeCode("2-3Y")).toBe("23Y");
    expect(makeSku("LNNOVR", "Olive", "M")).toBe("LNNOVR-OLV-M");
    expect(makeSku("BAG", null, null)).toBe("BAG");
  });
  it("makes SKUs unique regardless of case", () => {
    expect(uniqueSku("A-1", new Set(["A-1"]))).toBe("A-1-2");
    expect(uniqueSku("a-1", new Set(["A-1", "A-1-2"]))).toBe("a-1-3");
    expect(uniqueSku("B", new Set())).toBe("B");
  });
});

describe("variant matrix", () => {
  const colours = [
    { name_en: "Olive", name_ar: "زيتي", hex: "#556B2F" },
    { name_en: "Sand", name_ar: "رملي", hex: "#C2B280" },
  ];

  it("builds colour × size rows with unique SKUs", () => {
    const res = buildMatrix({ base: "LNNOVR", colours, sizes: ["S", "M", "L"], existing: [], newKey: key });
    expect(res.rows).toHaveLength(6);
    expect(res.added).toBe(6);
    expect(res.rows.map((r) => r.sku)).toEqual(["LNNOVR-OLV-S", "LNNOVR-OLV-M", "LNNOVR-OLV-L", "LNNOVR-SND-S", "LNNOVR-SND-M", "LNNOVR-SND-L"]);
    expect(res.rows[3]).toMatchObject({ color_en: "Sand", color_ar: "رملي", color_hex: "#C2B280", size: "S", stock: 0, id: null });
  });

  it("keeps existing variants (id, SKU, stock) and only adds what is missing", () => {
    const existing = [row({ id: "v1", sku: "OLD-1", color_en: "olive", size: "M", stock: 7, stock_loaded: 7 })];
    const res = buildMatrix({ base: "X", colours, sizes: ["M"], existing, newKey: key });
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({ id: "v1", sku: "OLD-1", stock: 7, color_en: "Olive", color_ar: "زيتي" });
    expect(res.added).toBe(1);
  });

  it("drops rows that no longer match, but keeps locked ones", () => {
    const existing = [
      row({ id: "a", sku: "A", color_en: "Red", size: "M", stock: 3 }),
      row({ id: "b", sku: "B", color_en: "Blue", size: "M", stock: 2, locked: true }),
    ];
    const res = buildMatrix({ base: "X", colours: [colours[0]], sizes: ["M"], existing, newKey: key });
    expect(res.removed).toBe(1);
    expect(res.keptLocked).toBe(1);
    expect(res.rows.map((r) => r.id)).toEqual([null, "b"]);
  });

  it("avoids SKUs other products use", () => {
    const res = buildMatrix({ base: "P", colours: [], sizes: ["M"], existing: [], takenSkus: new Set(["p-m"]), newKey: key });
    expect(res.rows[0].sku).toBe("P-M-2");
  });

  it("one size without colours gives a single variant", () => {
    const res = buildMatrix({ base: "BAG", colours: [], sizes: [], existing: [], newKey: key });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ sku: "BAG", size: null, color_en: null });
  });

  it("derives colours and sizes from saved variants", () => {
    const rows = [row({ color_en: "Navy", color_ar: "كحلي", color_hex: "#000080", size: "L" }), row({ color_en: "navy", size: "S" }), row({ size: "XS" })];
    expect(coloursFromVariants(rows, key).map((c) => c.name_en)).toEqual(["Navy"]);
    expect(sizesFromVariants(rows, "apparel")).toEqual(["XS", "S", "L"]);
    expect(sizesFromVariants([row({ size: "40" }), row({ size: "38" }), row({ size: "99" })], "shoes")).toEqual(["38", "40", "99"]);
  });

  it("moves items", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 5)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a"], 3, 0)).toEqual(["a"]);
  });
});

describe("category tree", () => {
  const cats = [
    { id: "men", parent_id: null, name_en: "Men", name_ar: "رجال", sort_order: 2 },
    { id: "polo", parent_id: "men", name_en: "Polo", name_ar: "بولو", sort_order: 1 },
    { id: "kids", parent_id: null, name_en: "Kids", name_ar: "أطفال", sort_order: 1 },
    { id: "tees", parent_id: "polo", name_en: "Tees", name_ar: "تيشيرت", sort_order: 1 },
    { id: "loop-a", parent_id: "loop-b", name_en: "A", name_ar: "أ", sort_order: 0 },
    { id: "loop-b", parent_id: "loop-a", name_en: "B", name_ar: "ب", sort_order: 0 },
  ];
  it("nests, orders and flattens with depth; cycles are not lost", () => {
    const flat = flattenTree(buildTree(cats));
    expect(flat.map((c) => [c.id, c.depth])).toEqual([
      ["kids", 0],
      ["men", 0],
      ["polo", 1],
      ["tees", 2],
      ["loop-a", 0],
      ["loop-b", 0],
    ]);
  });
  it("finds descendants (for the parent picker)", () => {
    expect([...descendantIds(cats, "men")].sort()).toEqual(["men", "polo", "tees"]);
  });
  it("moves among siblings", () => {
    expect(moveAmongSiblings(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveAmongSiblings(["a", "b", "c"], "c", "down")).toBeNull();
  });
});

describe("stock states", () => {
  it("variant", () => {
    expect(stockState(0, 5)).toBe("out");
    expect(stockState(5, 5)).toBe("low");
    expect(stockState(6, 5)).toBe("in");
  });
  it("product", () => {
    expect(productStockState(0, 0, 3, 5)).toBe("out");
    expect(productStockState(10, 0, 0, 5)).toBe("out");
    expect(productStockState(30, 2, 3, 5)).toBe("low");
    expect(productStockState(30, 9, 3, 5)).toBe("in");
  });
});

describe("images", () => {
  it("allows only hosts next/image may load", () => {
    expect(isAllowedImageUrl("https://images.unsplash.com/photo-1?w=600")).toBe(true);
    expect(isAllowedImageUrl("https://abc.supabase.co/storage/v1/object/public/product-images/x.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://abc.supabase.co/rest/v1/products")).toBe(false);
    expect(isAllowedImageUrl("http://images.unsplash.com/x")).toBe(false);
    expect(isAllowedImageUrl("https://images.unsplash.com:8443/x")).toBe(false);
    expect(isAllowedImageUrl("https://user:pw@images.unsplash.com/x")).toBe(false);
    expect(isAllowedImageUrl("https://evil.example.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
  });
  it("allows local Storage over http only in development", () => {
    const local = "http://127.0.0.1:54321/storage/v1/object/public/product-images/products/a.jpg";
    expect(isAllowedImageUrl(local, { allowLocal: false })).toBe(false);
    expect(isAllowedImageUrl(local, { allowLocal: true })).toBe(true);
    expect(isAllowedImageUrl("http://127.0.0.1:54321/rest/v1/x", { allowLocal: true })).toBe(false);
    expect(isAllowedImageUrl("http://127.0.0.1:9999/storage/x", { allowLocal: true })).toBe(false);
  });
  it("maps public URLs back to bucket paths (own files only)", () => {
    const base = "http://127.0.0.1:54321";
    const url = publicImageUrl(base, "products/2026/11/abc.webp");
    expect(url).toBe("http://127.0.0.1:54321/storage/v1/object/public/product-images/products/2026/11/abc.webp");
    expect(storagePathFromUrl(url, base)).toBe("products/2026/11/abc.webp");
    expect(storagePathFromUrl("https://images.unsplash.com/x.jpg", base)).toBeNull();
    expect(storagePathFromUrl(`${base}/storage/v1/object/public/other-bucket/a.jpg`, base)).toBeNull();
    expect(storagePathFromUrl(`${base}/storage/v1/object/public/product-images/products/../x.jpg`, base)).toBeNull();
  });
  it("builds object paths and checks files", () => {
    expect(buildImagePath("products", "image/webp", "ab-12", new Date(Date.UTC(2026, 10, 14)))).toBe("products/2026/11/ab12.webp");
    expect(checkUploadFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkUploadFile({ type: "image/gif", size: 1000 })).toBe("type");
    expect(checkUploadFile({ type: "image/png", size: 9 * 1024 * 1024 })).toBe("size");
    expect(uploadRequestSchema.safeParse({ scope: "products", type: "image/svg+xml", size: 10 }).success).toBe(false);
  });
});

const validProduct = (): ProductInput => ({
  id: null,
  expected_updated_at: null,
  product: {
    name_en: "Linen Overshirt",
    name_ar: "قميص كتان علوي",
    slug: "linen-overshirt",
    category_id: CAT,
    tags: ["Linen", " linen ", "summer"],
    base_price: "1200",
    sale_price: "990",
    size_system: "apparel",
    is_active: true,
  },
  variants: [
    { id: null, sku: "LNN-OLV-S", size: "S", color_en: "Olive", color_ar: "زيتي", color_hex: "#556b2f", stock: 3, price_override: "" },
    { id: null, sku: "LNN-OLV-M", size: "M", color_en: "Olive", color_ar: "زيتي", color_hex: "#556b2f", stock: "4", price_override: "1100" },
  ],
  images: [{ id: null, url: "https://images.unsplash.com/photo-1", color_en: "Olive", alt_text_en: "", alt_text_ar: "", is_primary: true }],
});

describe("product validation", () => {
  it("accepts a valid product and normalises it", () => {
    const r = productInputSchema.safeParse(validProduct());
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.product.tags).toEqual(["linen", "summer"]);
    expect(r.data.product.sale_price).toBe(990);
    expect(r.data.variants[0].price_override).toBeNull();
    expect(r.data.variants[1]).toMatchObject({ stock: 4, price_override: 1100, color_hex: "#556B2F" });
  });
  const failsWith = (mutate: (p: ProductInput) => void, key: string) => {
    const p = validProduct();
    mutate(p);
    const r = productInputSchema.safeParse(p);
    expect(r.success).toBe(false);
    if (!r.success) expect(catalogErrorKey(r.error)).toBe(key);
  };
  it("sale price must be lower than the price", () => failsWith((p) => (p.product.sale_price = "1200"), "sale_price"));
  it("names are required", () => failsWith((p) => (p.product.name_ar = " "), "name_ar"));
  it("slug format", () => failsWith((p) => (p.product.slug = "Linen Shirt"), "slug"));
  it("category is required", () => failsWith((p) => (p.product.category_id = ""), "category"));
  it("SKUs are unique (case-insensitive)", () => failsWith((p) => (p.variants![1].sku = "lnn-olv-s"), "duplicate_sku"));
  it("colour × size is unique", () => failsWith((p) => (p.variants![1].size = "S"), "duplicate_variant"));
  it("stock cannot be negative", () => failsWith((p) => (p.variants![0].stock = -1), "stock"));
  it("a colour needs a swatch", () => failsWith((p) => (p.variants![0].color_hex = ""), "color_hex"));
  it("a new colour needs an Arabic name", () => failsWith((p) => (p.variants![0].color_ar = ""), "color_ar"));
  it("photos may only be tied to existing colours", () => failsWith((p) => (p.images![0].color_en = "Red"), "image_colour"));
  it("photo hosts are checked", () => failsWith((p) => (p.images![0].url = "https://evil.example.com/a.jpg"), "image_url"));
  it("an active product needs a variant", () => failsWith((p) => (p.variants = []), "no_variants"));
  it("a draft may have no variants", () => {
    const p = validProduct();
    p.variants = [];
    p.images = [];
    p.product.is_active = false;
    expect(productInputSchema.safeParse(p).success).toBe(true);
  });
  it("existing variants may keep a missing Arabic colour (the database keeps the stored one)", () => {
    const p = validProduct();
    p.variants![0] = { ...p.variants![0], id: "44444444-0000-0000-0000-000000000001", color_ar: "" };
    expect(productInputSchema.safeParse(p).success).toBe(true);
  });
});

describe("other inputs", () => {
  it("categories and collections", () => {
    expect(categoryInputSchema.safeParse({ id: null, name_en: "Shoes", name_ar: "أحذية", slug: "shoes" }).success).toBe(true);
    expect(categoryInputSchema.safeParse({ id: null, name_en: "Shoes", name_ar: "أحذية", slug: "shoes", image_url: "https://evil.example.com/x.png" }).success).toBe(false);
    const c = collectionInputSchema.safeParse({ id: null, title_en: "Edit", title_ar: "مختارات", slug: "edit", sort_order: "2", product_ids: [CAT, CAT] });
    expect(c.success && c.data.product_ids).toEqual([CAT]);
  });
  it("stock edits", () => {
    expect(stockEditSchema.safeParse({ id: CAT, stock: -1 }).success).toBe(false);
    expect(stockEditSchema.safeParse({ id: CAT, stock: "12", expected: 10 }).success).toBe(true);
    expect(bulkStockSchema.safeParse({ ids: [], stock: 1 }).success).toBe(false);
  });
  it("list params from the URL", () => {
    expect(parseProductListParams({ status: "hacked", sort: "drop table", page: "-3", category: "x" })).toEqual({
      search: "",
      category: null,
      status: null,
      stock: null,
      sort: "updated",
      page: 1,
    });
    expect(parseProductListParams({ search: "polo", status: "draft", stock: "low", sort: "price_asc", page: "2", category: CAT })).toMatchObject({
      search: "polo",
      status: "draft",
      stock: "low",
      sort: "price_asc",
      page: 2,
      category: CAT,
    });
    expect(parseInventoryParams({ stock: "in", q: "sku" })).toMatchObject({ stock: null, search: "sku" });
  });
});

describe("editor state", () => {
  const data: ProductEditorData = {
    id: "44444444-0000-0000-0000-000000000001",
    slug: "classic-polo",
    name_en: "Classic Polo",
    name_ar: "بولو كلاسيكي",
    category_id: CAT,
    brand: null,
    tags: ["polo"],
    description_en: "Cotton.",
    description_ar: null,
    details_en: null,
    details_ar: null,
    care_en: null,
    care_ar: null,
    base_price: 150,
    sale_price: 120,
    size_system: "apparel",
    seo_title_en: null,
    seo_title_ar: null,
    seo_description_en: null,
    seo_description_ar: null,
    is_active: true,
    is_featured: false,
    is_new: true,
    created_at: null,
    updated_at: "2026-11-14T10:00:00.123456+00:00",
    variants: [
      { id: V2, sku: "POL-NVY-L", size: "L", color_en: "Navy", color_ar: "كحلي", color_hex: "#000080", stock: 2, price_override: null, position: 1, locked: false },
      { id: V1, sku: "POL-NVY-M", size: "M", color_en: "Navy", color_ar: "كحلي", color_hex: "#000080", stock: 5, price_override: null, position: 0, locked: true },
    ],
    images: [{ id: I1, url: "https://images.unsplash.com/a", color_en: null, alt_text_en: "Front", alt_text_ar: null, is_primary: true }],
    order_lines: 3,
  };

  it("round-trips without changes and remembers loaded stock", () => {
    const s = initialEditorState(data);
    expect(s.sizes).toEqual(["M", "L"]);
    expect(s.colours.map((c) => c.name_en)).toEqual(["Navy"]);
    const input = toProductInput(s, data.id, data.updated_at);
    expect(input.variants![0]).toMatchObject({ id: V2, stock: 2, stock_loaded: 2 });
    expect(input.images![0]).toMatchObject({ is_primary: true, alt_text_en: "Front" });
    expect(productInputSchema.safeParse(input).success).toBe(true);
    expect(editorFingerprint(s)).toBe(editorFingerprint(initialEditorState(data)));
    expect(editorFingerprint({ ...s, name_en: "Changed" })).not.toBe(editorFingerprint(s));
  });

  it("new products start as drafts with a sensible size set", () => {
    const s = initialEditorState(null);
    expect(s.is_active).toBe(false);
    expect(s.sizes).toEqual(["S", "M", "L", "XL"]);
  });

  it("errors point to their section", () => {
    expect(sectionForError("sale_price")).toBe("pricing");
    expect(sectionForError("duplicate_sku")).toBe("variants");
    expect(sectionForError("image_colour")).toBe("media");
    expect(sectionForError("unknown")).toBeNull();
  });
});

describe("text helpers", () => {
  it("snippets, detail lines and tags", () => {
    expect(snippetText("one two three four five", 16)).toBe("one two three…");
    expect(snippetText("onetwothreefour", 8)).toBe("onetwot…");
    expect(snippetText("short", 12)).toBe("short");
    expect(detailLines("- 100% linen\n\n• Relaxed fit\r\nMade in Egypt ")).toEqual(["100% linen", "Relaxed fit", "Made in Egypt"]);
    expect(normalizeTags(["Linen", "linen", "  Summer   Edit ", ""])).toEqual(["linen", "summer edit"]);
  });
});
