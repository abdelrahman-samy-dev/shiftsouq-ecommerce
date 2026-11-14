#!/usr/bin/env node
/**
 * Loads catalog/catalog.json into any Supabase project (local, staging or production).
 *
 * Usage
 *   npm run catalog:import -- [options]
 *   node scripts/catalog/import.mjs [options]
 *
 * Options
 *   --env <file>            Env file with NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and
 *                           SUPABASE_SERVICE_ROLE_KEY. Default: .env.local
 *   --catalog <file>        Catalogue to load. Default: catalog/catalog.json
 *   --dry-run               Show what would change; write nothing, upload nothing.
 *                           Without an env file it only validates the catalogue.
 *   --rehost                Download every image (products, categories, collections, hero)
 *                           and upload it to the public Storage bucket "product-images"
 *                           (created if missing); the database stores the Supabase URLs.
 *   --deactivate-missing    Set is_active = false on products that are not in the catalogue.
 *                           Nothing is ever deleted: old orders keep pointing at them.
 *   --settings              Also write the store_settings defaults (announcement, contact,
 *                           shipping zones, payments, policies, inventory, home hero).
 *                           Off by default so a live store keeps the owner's settings.
 *   --reset-stock           Overwrite the stock of variants that already exist with the
 *                           catalogue numbers. By default only NEW variants get stock.
 *   --yes                   Allow a URL that is neither https nor local (e.g. plain http).
 *
 *   CATALOG_SUPABASE_URL / CATALOG_SUPABASE_SERVICE_ROLE_KEY set in the shell override the
 *   values from the env file.
 *
 * What it does
 *   Upserts categories (by slug), products (by slug), variants (by SKU) and collections
 *   (by slug); replaces the images of catalogue products and the product lists of catalogue
 *   collections. Orders, customers, reviews and promo codes are never touched, and nothing
 *   is deleted except the image rows / collection links it rewrites.
 *
 * Examples
 *   node scripts/catalog/import.mjs --dry-run
 *   node scripts/catalog/import.mjs --env .env.production.local --dry-run
 *   node scripts/catalog/import.mjs --env .env.production.local --rehost --settings
 *   node scripts/catalog/import.mjs --env .env.production.local --deactivate-missing
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  ROOT,
  CATALOG_PATH,
  loadCatalog,
  validateCatalog,
  categoryRow,
  productRow,
  variantRow,
  imageRow,
  collectionRow,
  SETTINGS_COLUMNS,
  allImages,
  withImageUrls,
} from "./lib.mjs";

const BUCKET = "product-images";

// ── Arguments ───────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const KNOWN = ["--env", "--catalog", "--dry-run", "--rehost", "--deactivate-missing", "--settings", "--reset-stock", "--yes", "--help", "-h"];
for (const a of argv) {
  if (a.startsWith("--") && !KNOWN.includes(a)) {
    console.error(`Unknown option ${a}. See the comment at the top of scripts/catalog/import.mjs.`);
    process.exit(2);
  }
}
if (has("--help") || has("-h")) {
  const src = fs.readFileSync(new URL(import.meta.url), "utf8");
  console.log(src.slice(src.indexOf("/**") + 3, src.indexOf("*/")).replace(/^ \* ?/gm, ""));
  process.exit(0);
}
const DRY = has("--dry-run");
const opts = {
  rehost: has("--rehost"),
  deactivate: has("--deactivate-missing"),
  settings: has("--settings"),
  resetStock: has("--reset-stock"),
};
const envFile = path.resolve(ROOT, val("--env", ".env.local"));
const catalogFile = path.resolve(ROOT, val("--catalog", CATALOG_PATH));

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    env[m[1]] = v;
  }
  return env;
}

const chunk = (list, size = 100) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};
const fail = (what, error) => {
  console.error(`\n✗ ${what}: ${error?.message ?? error}`);
  process.exit(1);
};
async function must(what, promise) {
  const { data, error } = await promise;
  if (error) fail(what, error);
  return data;
}

// ── Catalogue ───────────────────────────────────────────────────
let catalog = loadCatalog(catalogFile);
const problems = validateCatalog(catalog);
if (problems.length) {
  console.error(`${path.relative(ROOT, catalogFile)} has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const counts = {
  categories: catalog.categories.length,
  products: catalog.products.length,
  variants: catalog.products.reduce((t, p) => t + p.variants.length, 0),
  images: catalog.products.reduce((t, p) => t + p.images.length, 0),
  collections: catalog.collections.length,
};
console.log(
  `Catalogue OK: ${counts.categories} categories, ${counts.products} products, ${counts.variants} variants, ${counts.images} images, ${counts.collections} collections.`,
);

// ── Target project ──────────────────────────────────────────────
const env = { ...readEnv(envFile), ...pick(process.env) };
function pick(e) {
  // Only take explicit overrides from the shell, never unrelated variables.
  const o = {};
  for (const k of ["CATALOG_SUPABASE_URL", "CATALOG_SUPABASE_SERVICE_ROLE_KEY"]) if (e[k]) o[k] = e[k];
  return o;
}
const url = (env.CATALOG_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
const key = env.CATALOG_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key) {
  if (DRY) {
    console.log(`No Supabase URL / service key in ${path.relative(ROOT, envFile)}: validated the catalogue only.`);
    process.exit(0);
  }
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in ${envFile}.`);
  process.exit(1);
}
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(url);
const isHttps = /^https:\/\//.test(url);
if (!isLocal && !isHttps && !has("--yes")) {
  console.error(`Refusing to import into ${url}: the URL is neither https nor local. Re-run with --yes if this is intended.`);
  process.exit(1);
}
console.log(`Target: ${url}${isLocal ? " (local)" : ""}${DRY ? "  [dry run: nothing will be written]" : ""}`);

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// ── Current state ───────────────────────────────────────────────
async function selectAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await must(`read ${table}`, db.from(table).select(columns).range(from, from + 999));
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
const existingCats = new Map((await selectAll("categories", "id, slug")).map((r) => [r.slug, r.id]));
const existingProducts = await selectAll("products", "id, slug, is_active");
const productBySlug = new Map(existingProducts.map((r) => [r.slug, r]));
const existingVariants = new Map((await selectAll("product_variants", "id, sku, product_id")).map((r) => [r.sku, r]));
const existingCols = new Map((await selectAll("collections", "id, slug")).map((r) => [r.slug, r.id]));

const catalogSlugs = new Set(catalog.products.map((p) => p.slug));
const catalogSkus = new Set(catalog.products.flatMap((p) => p.variants.map((v) => v.sku)));
const toDeactivate = existingProducts.filter((r) => r.is_active !== false && !catalogSlugs.has(r.slug));
const newVariants = [...catalogSkus].filter((s) => !existingVariants.has(s)).length;
const extraSkus = [...existingVariants.values()].filter((v) => {
  const owner = existingProducts.find((p) => p.id === v.product_id);
  return owner && catalogSlugs.has(owner.slug) && !catalogSkus.has(v.sku);
});

const plan = [
  ["categories", counts.categories, catalog.categories.filter((c) => !existingCats.has(c.slug)).length],
  ["products", counts.products, catalog.products.filter((p) => !productBySlug.has(p.slug)).length],
  ["variants", counts.variants, newVariants],
  ["collections", counts.collections, catalog.collections.filter((c) => !existingCols.has(c.slug)).length],
];
console.log("\nPlan:");
for (const [what, total, created] of plan) console.log(`  ${what.padEnd(12)} ${String(created).padStart(4)} new, ${String(total - created).padStart(4)} updated`);
console.log(`  images       ${counts.images} rows rewritten for the catalogue products${opts.rehost ? " (re-hosted to Storage)" : ""}`);
console.log(`  stock        ${opts.resetStock ? "reset to catalogue numbers for every variant" : "kept for existing variants; catalogue numbers for new ones"}`);
console.log(`  settings     ${opts.settings ? "written from the catalogue" : "left as they are (use --settings to write them)"}`);
if (opts.deactivate) console.log(`  deactivate   ${toDeactivate.length} product(s) not in the catalogue${toDeactivate.length ? ": " + toDeactivate.map((r) => r.slug).join(", ") : ""}`);
else if (toDeactivate.length) console.log(`  note         ${toDeactivate.length} active product(s) are not in the catalogue (use --deactivate-missing to hide them)`);
if (extraSkus.length) console.log(`  note         ${extraSkus.length} variant(s) of catalogue products are not in the catalogue and are left as they are: ${extraSkus.map((v) => v.sku).join(", ")}`);

if (DRY) {
  if (opts.rehost) console.log(`\nWould upload ${allImages(catalog).length} images to the "${BUCKET}" bucket.`);
  console.log("\nDry run finished. Nothing was written.");
  process.exit(0);
}

// ── Re-host images in Supabase Storage ──────────────────────────
if (opts.rehost) {
  const { data: bucket, error } = await db.storage.getBucket(BUCKET);
  if (error || !bucket) {
    await must(`create bucket ${BUCKET}`, db.storage.createBucket(BUCKET, { public: true }));
    console.log(`\nCreated public bucket "${BUCKET}".`);
  } else if (!bucket.public) {
    fail(`bucket ${BUCKET}`, "exists but is not public; make it public in the dashboard or choose another bucket");
  }
  const images = allImages(catalog);
  const map = new Map();
  const existingFiles = new Map(); // folder -> Set(file names)
  async function filesIn(folder) {
    if (!existingFiles.has(folder)) {
      const listed = await must(`list ${folder}`, db.storage.from(BUCKET).list(folder, { limit: 1000 }));
      existingFiles.set(folder, new Set(listed.map((f) => f.name)));
    }
    return existingFiles.get(folder);
  }
  let uploaded = 0;
  let skipped = 0;
  const queue = [...images];
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const objectPath = `${item.path}.jpg`;
      const folder = objectPath.slice(0, objectPath.lastIndexOf("/"));
      const name = objectPath.slice(objectPath.lastIndexOf("/") + 1);
      if (!(await filesIn(folder)).has(name)) {
        // Unsplash (imgix) URLs: ask for a JPEG so the stored file type is predictable.
        const src = /images\.unsplash\.com/.test(item.url) ? `${item.url}${item.url.includes("?") ? "&" : "?"}fm=jpg` : item.url;
        const res = await fetch(src);
        if (!res.ok) fail(`download ${item.url}`, `HTTP ${res.status}`);
        const body = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        await must(`upload ${objectPath}`, db.storage.from(BUCKET).upload(objectPath, body, { contentType, upsert: true, cacheControl: "31536000" }));
        uploaded++;
      } else skipped++;
      map.set(item.url, db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  catalog = withImageUrls(catalog, map);
  console.log(`\nImages: ${uploaded} uploaded, ${skipped} already in Storage.`);
}

// ── Write ───────────────────────────────────────────────────────
// Categories: parents first so children can point at them.
const catIds = new Map(existingCats);
for (const level of [false, true]) {
  const rows = catalog.categories
    .filter((c) => Boolean(c.parent) === level)
    .map((c) => ({ ...categoryRow(c), parent_id: c.parent ? catIds.get(c.parent) : null }));
  if (!rows.length) continue;
  const saved = await must("save categories", db.from("categories").upsert(rows, { onConflict: "slug" }).select("id, slug"));
  for (const r of saved) catIds.set(r.slug, r.id);
}

// Products.
const productIds = new Map();
for (const part of chunk(catalog.products, 50)) {
  const rows = part.map((p) => ({ ...productRow(p), category_id: catIds.get(p.category) }));
  const saved = await must("save products", db.from("products").upsert(rows, { onConflict: "slug" }).select("id, slug"));
  for (const r of saved) productIds.set(r.slug, r.id);
}

// Variants: new ones get the catalogue stock; existing ones keep theirs unless --reset-stock.
const insertRows = [];
const updateRows = [];
for (const p of catalog.products) {
  p.variants.forEach((v, i) => {
    const row = { ...variantRow(p, v, i), product_id: productIds.get(p.slug) };
    if (existingVariants.has(v.sku) && !opts.resetStock) {
      delete row.stock;
      updateRows.push(row);
    } else insertRows.push(row);
  });
}
for (const part of chunk(insertRows)) await must("save variants", db.from("product_variants").upsert(part, { onConflict: "sku" }));
for (const part of chunk(updateRows)) await must("update variants", db.from("product_variants").upsert(part, { onConflict: "sku" }));

// Images: the catalogue owns the image list of its products.
const ids = [...productIds.values()];
for (const part of chunk(ids)) await must("clear images", db.from("product_images").delete().in("product_id", part));
const imageRows = catalog.products.flatMap((p) => p.images.map((img, i) => ({ ...imageRow(img, i), product_id: productIds.get(p.slug) })));
for (const part of chunk(imageRows)) await must("save images", db.from("product_images").insert(part));

// Collections and their product lists.
const colRows = catalog.collections.map(collectionRow);
const savedCols = await must("save collections", db.from("collections").upsert(colRows, { onConflict: "slug" }).select("id, slug"));
const colIds = new Map(savedCols.map((r) => [r.slug, r.id]));
await must("clear collection products", db.from("collection_products").delete().in("collection_id", [...colIds.values()]));
const links = catalog.collections.flatMap((c) => c.products.map((slug, position) => ({ collection_id: colIds.get(c.slug), product_id: productIds.get(slug), position })));
for (const part of chunk(links)) await must("save collection products", db.from("collection_products").insert(part));

// Store settings.
if (opts.settings) {
  const row = { id: 1, updated_at: new Date().toISOString() };
  for (const c of SETTINGS_COLUMNS) row[c] = catalog.settings[c];
  await must("save store settings", db.from("store_settings").upsert(row, { onConflict: "id" }));
}

// Hide products that left the catalogue (never delete: orders reference them).
if (opts.deactivate && toDeactivate.length) {
  for (const part of chunk(toDeactivate.map((r) => r.id))) await must("deactivate products", db.from("products").update({ is_active: false }).in("id", part));
}

console.log(
  `\nDone: ${counts.categories} categories, ${productIds.size} products, ${insertRows.length} variants added${opts.resetStock ? "/reset" : ""}, ${updateRows.length} updated, ${imageRows.length} images, ${links.length} collection links${opts.settings ? ", store settings" : ""}${opts.deactivate ? `, ${toDeactivate.length} deactivated` : ""}.`,
);
