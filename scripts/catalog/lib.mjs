/**
 * Shared helpers for the catalogue tools (build-seed.mjs and import.mjs).
 *
 * catalog/catalog.json is the single source of truth for the demo catalogue:
 * categories, products, variants, images, collections and store-settings defaults.
 * Both tools map it to database rows with the functions below, so the local seed
 * and a production import always write exactly the same columns.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CATALOG_PATH = path.join(ROOT, "catalog", "catalog.json");

/** Sizes allowed per size system (`null` = the product has no size option). */
export const SIZE_SYSTEMS = {
  apparel: ["XS", "S", "M", "L", "XL", "XXL"],
  waist: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"],
  shoes: ["39", "40", "41", "42", "43", "44", "45", "46"],
  kids: null, // any label, e.g. "4Y"
  one_size: [null],
};

export function loadCatalog(file = CATALOG_PATH) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Stable UUID (version-5 layout) derived from a name, so generated ids never change between runs. */
export function stableUuid(kind, key) {
  const h = crypto.createHash("sha1").update(`shiftsouq:${kind}:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/** Same rule as place_order(): variant override, else the sale price when it is lower, else the base price. */
export function unitPrice(product, variant = {}) {
  if (variant.price_override != null) return Number(variant.price_override);
  const { base, sale } = product.price;
  return sale != null && sale > 0 && sale < base ? Number(sale) : Number(base);
}

export const colorOf = (product, name) => product.colors.find((c) => c.en === name);

/** Governorate keys used by checkout (lib/store/useCheckoutStore.ts). Empty if the file isn't there. */
export function checkoutGovernorates() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "lib", "store", "useCheckoutStore.ts"), "utf8");
    const block = src.slice(src.indexOf("GOVERNORATES"));
    return [...block.matchAll(/value:\s*"([a-z-]+)"/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

/** Returns a list of problems; an empty list means the catalogue is consistent. */
export function validateCatalog(c) {
  const errors = [];
  const err = (m) => errors.push(m);
  const bi = (v, where) => {
    if (!v || typeof v.en !== "string" || typeof v.ar !== "string" || !v.en.trim() || !v.ar.trim()) err(`${where}: needs non-empty en and ar`);
  };
  const isUrl = (u) => typeof u === "string" && /^https:\/\//.test(u);

  const cats = new Map();
  for (const cat of c.categories ?? []) {
    if (cats.has(cat.slug)) err(`category ${cat.slug}: duplicate slug`);
    cats.set(cat.slug, cat);
    bi(cat.name, `category ${cat.slug} name`);
    bi(cat.description, `category ${cat.slug} description`);
    if (cat.image && !isUrl(cat.image.url)) err(`category ${cat.slug}: image url must be https`);
  }
  for (const cat of cats.values()) {
    if (cat.parent && !cats.has(cat.parent)) err(`category ${cat.slug}: unknown parent ${cat.parent}`);
    if (cat.parent && cats.get(cat.parent)?.parent) err(`category ${cat.slug}: only two levels are supported`);
  }

  const slugs = new Set();
  const skus = new Set();
  for (const p of c.products ?? []) {
    const w = `product ${p.slug}`;
    if (!p.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) err(`${w}: slug must be lowercase words joined by '-'`);
    if (slugs.has(p.slug)) err(`${w}: duplicate slug`);
    slugs.add(p.slug);
    if (!cats.has(p.category)) err(`${w}: unknown category ${p.category}`);
    bi(p.name, `${w} name`);
    bi(p.description, `${w} description`);
    for (const k of ["details", "care"]) {
      if (!Array.isArray(p[k]?.en) || !Array.isArray(p[k]?.ar) || !p[k].en.length || p[k].en.length !== p[k].ar.length)
        err(`${w}: ${k} needs en and ar lists of the same length`);
    }
    bi(p.seo?.title, `${w} seo.title`);
    bi(p.seo?.description, `${w} seo.description`);
    if (!(p.size_system in SIZE_SYSTEMS)) err(`${w}: unknown size_system ${p.size_system}`);
    const { base, sale } = p.price ?? {};
    if (!(base > 0)) err(`${w}: base price must be > 0`);
    if (sale != null && !(sale > 0 && sale < base)) err(`${w}: sale price must be between 0 and the base price`);
    if (p.id && !/^[0-9a-f-]{36}$/.test(p.id)) err(`${w}: id must be a UUID`);

    const colors = new Set();
    for (const col of p.colors ?? []) {
      if (colors.has(col.en)) err(`${w}: duplicate colour ${col.en}`);
      colors.add(col.en);
      bi(col, `${w} colour ${col.en}`);
      if (!/^#[0-9A-Fa-f]{6}$/.test(col.hex ?? "")) err(`${w}: colour ${col.en} needs a #RRGGBB hex`);
    }
    if (!p.variants?.length) err(`${w}: needs at least one variant`);
    const allowed = SIZE_SYSTEMS[p.size_system];
    const combos = new Set();
    for (const v of p.variants ?? []) {
      if (!v.sku || skus.has(v.sku)) err(`${w}: missing or duplicate sku ${v.sku}`);
      skus.add(v.sku);
      if (colors.size && !colors.has(v.color)) err(`${w}: variant ${v.sku} uses unknown colour ${v.color}`);
      if (allowed && !allowed.includes(v.size ?? null)) err(`${w}: variant ${v.sku} size ${v.size} is not a ${p.size_system} size`);
      if (!Number.isInteger(v.stock) || v.stock < 0) err(`${w}: variant ${v.sku} stock must be a whole number ≥ 0`);
      if (v.price_override != null && !(v.price_override > 0)) err(`${w}: variant ${v.sku} price_override must be > 0`);
      const combo = `${v.color}|${v.size}`;
      if (combos.has(combo)) err(`${w}: two variants for ${combo}`);
      combos.add(combo);
    }
    if ((p.images?.length ?? 0) < 2) err(`${w}: needs at least 2 images`);
    for (const img of p.images ?? []) {
      if (!isUrl(img.url)) err(`${w}: image url must be https`);
      if (img.color != null && !colors.has(img.color)) err(`${w}: image colour ${img.color} is not one of the product colours`);
      bi(img.alt, `${w} image alt`);
    }
    for (const col of colors) {
      if (!(p.images ?? []).some((i) => i.color === col || i.color == null)) err(`${w}: colour ${col} has no image`);
    }
  }

  const cols = new Set();
  for (const col of c.collections ?? []) {
    if (cols.has(col.slug)) err(`collection ${col.slug}: duplicate slug`);
    cols.add(col.slug);
    bi(col.title, `collection ${col.slug} title`);
    for (const s of col.products ?? []) if (!slugs.has(s)) err(`collection ${col.slug}: unknown product ${s}`);
  }

  const zones = c.settings?.shipping?.zones;
  if (zones) {
    const govs = checkoutGovernorates();
    for (const g of govs) if (!(g in zones)) err(`settings.shipping.zones: missing governorate ${g}`);
    if (govs.length) for (const g of Object.keys(zones)) if (!govs.includes(g)) err(`settings.shipping.zones: ${g} is not a checkout governorate`);
  }
  return errors;
}

// ── Row mapping (shared by the seed builder and the importer) ─────────────

const lines = (list) => (list && list.length ? list.join("\n") : null);

export function categoryRow(cat) {
  return {
    slug: cat.slug,
    name_en: cat.name.en,
    name_ar: cat.name.ar,
    description_en: cat.description?.en ?? null,
    description_ar: cat.description?.ar ?? null,
    image_url: cat.image?.url ?? null,
    sort_order: cat.sort_order ?? 0,
    is_active: cat.is_active ?? true,
    is_featured: cat.is_featured ?? false,
  };
}

export function productRow(p) {
  return {
    slug: p.slug,
    name_en: p.name.en,
    name_ar: p.name.ar,
    description_en: p.description.en,
    description_ar: p.description.ar,
    base_price: p.price.base,
    sale_price: p.price.sale ?? null,
    brand: p.brand ?? null,
    is_featured: Boolean(p.is_featured),
    is_new: Boolean(p.is_new),
    is_active: p.is_active ?? true,
    details_en: lines(p.details?.en),
    details_ar: lines(p.details?.ar),
    care_en: lines(p.care?.en),
    care_ar: lines(p.care?.ar),
    tags: p.tags ?? [],
    size_system: p.size_system,
    seo_title_en: p.seo?.title?.en ?? null,
    seo_title_ar: p.seo?.title?.ar ?? null,
    seo_description_en: p.seo?.description?.en ?? null,
    seo_description_ar: p.seo?.description?.ar ?? null,
  };
}

export function variantRow(p, v, position) {
  const col = colorOf(p, v.color);
  return {
    sku: v.sku,
    size: v.size ?? null,
    color_en: col?.en ?? null,
    color_ar: col?.ar ?? null,
    color_hex: col?.hex ?? null,
    stock: v.stock,
    price_override: v.price_override ?? null,
    position,
  };
}

export function imageRow(img, index) {
  return {
    url: img.url,
    alt_text_en: img.alt?.en ?? null,
    alt_text_ar: img.alt?.ar ?? null,
    is_primary: index === 0,
    sort_order: index,
    color_en: img.color ?? null,
  };
}

export function collectionRow(col) {
  return {
    slug: col.slug,
    title_en: col.title.en,
    title_ar: col.title.ar,
    description_en: col.description?.en ?? null,
    description_ar: col.description?.ar ?? null,
    image_url: col.image?.url ?? null,
    is_active: col.is_active ?? true,
    sort_order: col.sort_order ?? 0,
  };
}

/** store_settings columns written from catalogue.settings (the row id is always 1). */
export const SETTINGS_COLUMNS = ["announcement", "contact", "shipping", "payments", "policies", "inventory", "home"];

/** Every image URL in the catalogue, with a stable storage path for re-hosting. */
export function allImages(c) {
  const out = [];
  const tag = (url, credit) => credit?.unsplash_id ?? crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  for (const cat of c.categories ?? [])
    if (cat.image?.url) out.push({ url: cat.image.url, path: `catalog/categories/${cat.slug}-${tag(cat.image.url, cat.image.credit)}` });
  for (const p of c.products ?? [])
    p.images.forEach((img, i) => out.push({ url: img.url, path: `catalog/products/${p.slug}/${String(i + 1).padStart(2, "0")}-${tag(img.url, img.credit)}` }));
  for (const col of c.collections ?? [])
    if (col.image?.url) out.push({ url: col.image.url, path: `catalog/collections/${col.slug}-${tag(col.image.url, col.image.credit)}` });
  const hero = c.settings?.home?.hero;
  if (hero?.image) out.push({ url: hero.image, path: `catalog/home/hero-${tag(hero.image, hero.credit)}` });
  return out;
}

/** Returns a copy of the catalogue with every image URL replaced through `map` (old URL → new URL). */
export function withImageUrls(c, map) {
  const r = (u) => (u && map.has(u) ? map.get(u) : u);
  const copy = structuredClone(c);
  for (const cat of copy.categories ?? []) if (cat.image) cat.image.url = r(cat.image.url);
  for (const p of copy.products ?? []) for (const img of p.images) img.url = r(img.url);
  for (const col of copy.collections ?? []) if (col.image) col.image.url = r(col.image.url);
  if (copy.settings?.home?.hero?.image) copy.settings.home.hero.image = r(copy.settings.home.hero.image);
  return copy;
}

/** Product slugs of the demo catalogue that shipped before catalog.json (removed by the local seed). */
export const RETIRED_DEMO_PRODUCTS = [
  "classic-navy-polo", "essential-white-polo", "linen-summer-shirt", "chino-trousers-beige", "kids-denim-jacket",
  "kids-graphic-tee", "urban-runner-x", "classic-canvas-low", "leather-wallet-black", "aviator-sunglasses",
  "formal-oxford-shoes", "everyday-zip-up-hoodie", "kids-cotton-shorts", "kids-slip-on-sneakers", "retro-high-tops",
  "slip-resistant-trainers", "summer-resort-shirt", "winter-puffer-coat", "classic-leather-belt", "essential-cargo-pants",
];
/** Category slugs of the old demo that no longer exist (removed by the local seed when empty). Children first. */
export const RETIRED_DEMO_CATEGORIES = ["polo", "kids", "collections", "men"];
