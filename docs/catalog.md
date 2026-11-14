# Catalogue

The demo catalogue (a menswear and lifestyle store in Egypt, prices in EGP, English and Arabic) lives in one file:

**`catalog/catalog.json`** is the single source of truth for categories, products, variants, images, collections and the store-settings defaults.

Two scripts read it:

| Command | What it does |
|---|---|
| `npm run catalog:seed` | Writes `supabase/seed.sql` for local development (`npm run db:reset` loads it). |
| `npm run catalog:import -- …` | Loads the catalogue into any Supabase project, for example production. |

Both scripts validate the file first and map it to database rows with the same code (`scripts/catalog/lib.mjs`). A seeded database and an imported one therefore hold the same data.

## What is in it

- **Clothing**: Shirts (4), Polos (3), T-Shirts (4), Trousers (4), Knitwear (3), Jackets (3)
- **Shoes**: Sneakers (3), Loafers & Formal (4)
- **Accessories**: Bags (3), Watches (2), Belts & Wallets (3), Sunglasses (3)

That is 39 products, 280 variants, 90 product photos and 4 collections (New In, The Linen Edit, Workwear, Weekend).

About a quarter of the products are on sale. A few are marked new or featured.

Every product has its own size system:

| `size_system` | Sizes | Used for |
|---|---|---|
| `apparel` | XS, S, M, L, XL, XXL | shirts, polos, tees, knitwear, jackets |
| `waist` | 30, 32, 34, 36, 38 | trousers |
| `shoes` | EU 40–45 | sneakers, loafers, boots |
| `one_size` | none (`size` is `NULL`) | bags, watches, belts, wallets, sunglasses |

The shop filters sizes per system, so clothing and shoe sizes never mix.

Checkout prices each line as `COALESCE(variant.price_override, product.sale_price if it is lower than base_price, base_price)`. The catalogue sets no variant price overrides.

## The file

```jsonc
{
  "categories": [ { "slug", "parent" /* slug or null */, "name": {en, ar}, "description": {en, ar},
                    "sort_order", "is_featured", "image": { "url", "alt": {en, ar}, "credit" } } ],
  "products": [ {
    "id": "…",            // optional; only the test product has a fixed id
    "slug", "category" /* sub-category slug */, "brand",
    "name": {en, ar}, "description": {en, ar},
    "details": { "en": [lines], "ar": [lines] },   // stored one per line in details_en / details_ar
    "care":    { "en": [lines], "ar": [lines] },
    "tags": [], "size_system", "price": { "base", "sale" /* or null */ },
    "is_new", "is_featured", "is_active",
    "seo": { "title": {en, ar}, "description": {en, ar} },
    "colors":   [ { "en", "ar", "hex" } ],
    "variants": [ { "sku", "color" /* colors[].en */, "size" /* or null */, "stock" } ],
    "images":   [ { "url", "color" /* colors[].en, or null = every colour */, "role", "alt": {en, ar}, "credit" } ]
  } ],
  "collections": [ { "slug", "title": {en, ar}, "description": {en, ar}, "sort_order", "image", "products": [product slugs] } ],
  "settings": { "announcement", "contact", "shipping", "payments", "policies", "inventory", "home" }
}
```

Rules that the scripts check before they write anything:

- Slugs and SKUs are unique.
- Every product has at least one variant and at least two images.
- Every colour has an image, either one tagged with that colour or one with `color: null`.
- Sizes match the product's size system.
- The sale price is lower than the base price.
- Every text has both an English and an Arabic version.
- The shipping zones match the governorate keys used by checkout (`lib/store/useCheckoutStore.ts`).

SKUs follow the pattern `SS-<product code>-<colour code>-<size>`, for example `SS-OXF-LB-M`. One-size items drop the size, for example `SS-WLS-TAN`.

The first image is the primary one (cards and order lines use it). The second image is what a card shows on hover.

Images tagged with a colour are shown when the buyer picks that colour.

### Store settings

`settings` holds the defaults for the single `store_settings` row:

- **Announcement bar:** three messages, covering free delivery over EGP 1,500, cash on delivery and 14-day returns.
- **Contact:** placeholder details.
- **Payments:** all methods switched on.
- **Returns:** `return_days` is 14.
- **Stock alerts:** `low_stock_threshold` is 5.
- **Home hero:** image, bilingual title and subtitle, and a CTA (`cta_href`, plus `cta_label_en` / `cta_label_ar`).
- **Shipping:**
  - A fee for every one of the 27 governorates in `zones` (keys as in checkout).
  - `free_threshold`: 1500.
  - `default_fee`: 100.
  - `eta_days`: the overall delivery window.
  - `eta_days_by_zone`: `{ min, max }` working days per governorate.

Cairo and Giza are cheapest (EGP 50, 1–2 days). Upper Egypt and the frontier governorates (New Valley, the Sinai governorates, Matruh, Red Sea) cost more and take longer.

## Local development

```bash
npm run catalog:seed   # regenerate supabase/seed.sql after editing catalog/catalog.json
npm run db:reset       # migrations + seed on the local Supabase
```

`seed.sql` is generated, so never edit it by hand. `npm run catalog:seed -- --check` exits with an error when it is out of date, which is useful in CI.

The seed:

- Uses fixed UUIDs and contains no timestamps.
- Can run twice in a row, or on top of the previous demo seed. It removes the old demo products by slug, then upserts everything by slug or SKU.
- Creates one promo code, `WELCOME10`: 10 % off orders of EGP 1,000 or more.
- Creates no user accounts, reviews or orders.

The browser tests create their own accounts (`tests/e2e/global-setup.ts`).

### Test product

`heavyweight-cotton-tee` is the product the tests use. It has the fixed id `44444444-0000-0000-0000-000000000001`, so `tests/db/security.test.ts` and `tests/e2e/fixtures.ts` find it.

It is a single-colour apparel product (Sage, sizes XS–XXL), priced at EGP 650 and on sale for EGP 490, with healthy stock in every size.

At 490 it stays under the free-delivery threshold, so a one-item checkout to Cairo costs 490 + 50 = EGP 540.

If you change this product, update those two test files.

## Importing into production

The importer uses the **service role key**, so run it from a trusted machine only. It never deletes orders or products.

1. Put the target project's keys in an env file that git does not track, for example `.env.production.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   ```

2. Make sure the project has every migration in `supabase/migrations` (the catalogue needs the columns and tables from `20261114010100_store_platform.sql`).

3. Do a dry run and read the plan:

   ```bash
   npm run catalog:import -- --env .env.production.local --dry-run
   ```

4. Import it:

   ```bash
   npm run catalog:import -- --env .env.production.local --rehost --settings
   ```

   - `--rehost` copies every photo into the public Storage bucket `product-images` (it creates the bucket if it is missing). The database then stores Supabase URLs, and the shop does not depend on Unsplash. `next.config.ts` already allows `*.supabase.co/storage/**`. Re-runs skip files that are already uploaded.
   - `--settings` writes the store-settings defaults. Leave it out on a live store whose owner has already set up shipping, contact details and the announcement bar.

5. Optional: hide products that are not in the catalogue, such as old demo items:

   ```bash
   npm run catalog:import -- --env .env.production.local --deactivate-missing
   ```

   These products are set to `is_active = false` and are not deleted, because old orders reference them.

Other behaviour:

- **Stock:**
  - Variants that already exist keep their stock.
  - New variants get the catalogue number.
  - `--reset-stock` overwrites the stock of every variant with the catalogue numbers. Use it only for a demo store.
- **Images:** the catalogue owns the image list of its products. Each run rewrites those `product_images` rows. Images that an admin added by hand to a catalogue product are replaced.
- **Collections:** the catalogue also owns the product list of its collections.
- **Leftover variants:** variants of catalogue products whose SKU is no longer in the file are left alone. The importer lists them.
- **Not touched:** orders, customers, reviews and promo codes.
- **URL check:** the script refuses a URL that is neither `https://` nor local (`http://localhost`, `http://127.0.0.1`) unless you pass `--yes`.
- **Help:** `node scripts/catalog/import.mjs --help` prints all options.

## Photos

All photos are free Unsplash photos (Unsplash licence), served from `images.unsplash.com`. URL parameters set the size and crop:

- **Product images:** `?w=1200&h=1500&q=80&auto=format&fit=crop` gives the 4:5 crop the cards and product page use.
- **Focal-point crops:** some images add `&crop=focalpoint&fp-x=…&fp-y=…&fp-z=…`. This keeps a model's face out of a product shot, or centres an item that sits off-centre.
- **Category tiles:** 4:5.
- **Collection images:** `w=1600`, original ratio.
- **Hero:** `w=2400`, landscape.

Each image's `credit` records the photographer, their Unsplash username and the photo id (`https://unsplash.com/photos/<id>`), so a credits page can be built from the file.

Rules used to choose them, to keep when you add products:

- The photo must show **exactly** that kind of product, in the stated colour. For example, a polo has a collar *and* a short button placket. Otherwise change the product, not the truth.
- Product shots: the product is the subject, on a calm neutral or warm background. No face as the main subject; worn shots are cropped below the face.
- No visible brand logos or slogans.
- Men only, decently dressed. Nothing inappropriate for a conservative audience.
- Never use one photo for two products.

## Copy

The Arabic is Modern Standard Arabic, written for the store rather than translated word for word. Check every new word for double meanings before adding it.

Colour names avoid words that refer to alcohol, so the catalogue uses *Chestnut*, not *Cognac*.
