# ShiftSouq

A bilingual (English / Arabic) e-commerce storefront and back office, built to be re-branded. The default brand is a modern menswear store in Egypt, with prices in EGP, cash on delivery and Paymob cards and mobile wallets.

![ShiftSouq home page](./public/banner.png)

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres with row-level security, Auth, Storage) · Paymob · Vitest · Playwright

---

## What it does

**For shoppers**
- Editorial storefront: mega menu, home page from store settings, collections, and a light and dark theme.
- Search that understands Arabic spelling variants (أ/ا، ة/ه، ى/ي, diacritics), typos ("shrit" finds shirts) and everyday words («بنطلون» finds «بنطال», «جزمة» finds «حذاء»). It shows live suggestions as you type.
- Filters computed from the current results:
  - sizes grouped by type (clothing, waist, EU shoes, one size), in natural order;
  - named colours and in-stock / on-sale switches;
  - price filtering and sorting by the price actually charged.
- Product pages:
  - photos per colour, a full-screen viewer, a size guide and low-stock notes;
  - a delivery promise per governorate;
  - reviews from verified buyers only, after moderation;
  - "complete the look", related and recently viewed products.
- Bag and checkout:
  - a mini-cart drawer, and a bag that re-checks prices and stock with the server;
  - one-page checkout with guest checkout, saved addresses and promo codes;
  - cash on delivery, Paymob card and Paymob mobile wallet.
- After the order: a receipt with payment status, order tracking for guests (order number + email), and an account area with orders, addresses, wishlist, profile and password. Password reset by email is included.

**For the store team (admin)**
- Overview with real KPIs (revenue, orders, average order value, new customers), a 30-day revenue chart, work queues, top products and low stock.
- Orders: status rules enforced on the server, a timeline, internal notes, and printable packing slips and invoices.
- Catalogue:
  - product editor with names and content in both languages, size × colour matrix generator, drag-and-drop photo upload, photos per colour and SEO fields;
  - categories, collections and inventory with inline stock editing.
- Engagement: customers, promo codes, review moderation, contact inbox and newsletter, plus CSV exports where useful.
- Owner only (super admin): store settings and team.
  - Settings: announcement bar, contact and social, delivery fees for all 27 governorates, free-delivery threshold, payment methods, return policy, home hero, low-stock threshold.
  - Team: add an admin, remove one, transfer ownership.
- Activity log of every admin change.

**Platform**
- **Money is computed on the server only.** Orders are created by the `place_order()` database function. It prices from the database, reserves stock under row locks and applies promo codes atomically. The browser never sends prices.
- **Payments are verified.** The Paymob webhook checks the HMAC signature and that the amount matches the order. A payment can be confirmed once only. Unpaid online orders give their stock back after 60 minutes. Cancelling or refunding gives stock back exactly once, and cancelling also returns the promo-code use.
- **Security by default.**
  - Row-level security on every table.
  - Customers can't read promo codes, other customers' orders or contact messages, or raise their own role.
  - Only the owner changes roles, and the last owner can't be removed.
  - Content Security Policy and security headers.
  - Rate limits on promo codes, order tracking, the newsletter and the contact form.
- **Ready to swap the backend.** Components never talk to Supabase. Reads go through `lib/dal/*` and writes through server actions in `lib/actions/*`.
- **SEO.** Localized metadata, Product / BreadcrumbList / Organization / WebSite JSON-LD, a sitemap, robots rules, real 404s, and noindex on private pages.

---

## Run it locally

Requirements: Node.js 22+, Docker (for the local Supabase stack).

```bash
npm ci

# 1. Local database, auth and storage (applies supabase/migrations and loads supabase/seed.sql)
npm run db:start            # prints the API URL, anon key and service_role key

# 2. Environment
cp .env.example .env.local  # fill in the three Supabase values printed above

# 3. A store owner account
npm run admin:create -- --owner owner@example.com 'ChooseAStrongPassword1'

# 4. Start
npm run dev                 # http://localhost:3020
```

- Without Paymob keys, `PAYMOB_MOCK=1` in `.env.local` turns card and wallet payments into a local test panel (Approve / Decline). It is ignored in production builds.
- Emails sent by the local stack (sign-up, password reset) land in Mailpit at http://127.0.0.1:54324.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3020 |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database security tests against the local Supabase |
| `npm run e2e` | Browser tests (Playwright). Set `E2E_MOCK_PAYMENTS=1` when the server runs with `PAYMOB_MOCK=1`. |
| `npm run db:start` · `npm run db:reset` | Start the local stack · rebuild it from migrations and seed |
| `npm run admin:create -- [--owner] <email> [password]` | Create or promote an admin, or the owner |
| `npm run catalog:seed` | Regenerate `supabase/seed.sql` from `catalog/catalog.json` |
| `npm run catalog:import -- [options]` | Load the catalogue into any Supabase project (see [docs/catalog.md](docs/catalog.md)) |
| `node scripts/db/bundle-production.mjs` | Write the SQL files for upgrading a live database (see below) |

---

## Project layout

```
app/
  (store)/            storefront routes, with header and footer from app/(store)/layout.tsx
  admin/              back office, with its own shell
  api/                search suggestions, Paymob callback, wallet start, local mock
  auth/callback/      email link exchange (password reset)
components/
  ds/                 design-system components (buttons, fields, drawer, dialog, price…)
  layout/ home/ shop/ search/ product/ cart/ checkout/ orders/ admin-catalog/
lib/
  brand/config.ts     brand identity, the one file a new brand edits
  settings/           store settings (database) merged over brand defaults
  dal/                server-only reads
  actions/            server actions (writes)
  payments/paymob.ts  Paymob integration
  i18n/ seo/ search/ admin/ checkout/
supabase/
  migrations/         schema, security, search, admin, checkout (all idempotent)
  seed.sql            generated from catalog/catalog.json
catalog/catalog.json  demo catalogue: 39 products, 90 photos, collections, settings
docs/                 design-system.md, catalog.md
tests/                unit/, db/, e2e/
```

---

## Make it your brand

1. **Identity:** `lib/brand/config.ts`: name in both languages, tagline, description, currency label, contact defaults and social links.
2. **Look:** colours are tokens at the top of `app/globals.css` (§1 light, §2 dark); fonts are in `app/layout.tsx`. The rules every page follows are in [docs/design-system.md](docs/design-system.md).
3. **Catalogue:** edit `catalog/catalog.json` and run `npm run catalog:seed`, or manage products in Admin → Products.
4. **Everyday settings:** Admin → Settings (owner only): announcement bar, delivery fees per governorate, free-delivery threshold, payment methods, returns, home hero.

---

## Deploy to production

### 1. Database (Supabase)
Every migration is idempotent and was rehearsed on a copy shaped like an existing production database, including older orders.

- **With the Supabase CLI linked to the project:** `npx supabase db push`.
- **Or with the SQL editor:**
  1. Run `node scripts/db/bundle-production.mjs`.
  2. Run `supabase/production/01-roles.sql`, then `supabase/production/02-upgrade.sql`. The second file runs all-or-nothing.
- **Optional:** load the catalogue with `npm run catalog:import -- --env .env.production --rehost` (add `--settings` for the default store settings). Read [docs/catalog.md](docs/catalog.md) first.
- **Auth → URL configuration:** set the Site URL to your domain and add `https://your-domain/**` to the redirect URLs.
- **Recovery email template:** for reset links that work on any device, use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.

### 2. Environment variables (e.g. Vercel)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Orders, payment confirmation, uploads, rate limits |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (canonical URLs, sitemap, emails) |
| `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_WALLET`, `PAYMOB_IFRAME_ID` | Without them, card and wallet are disabled and checkout offers cash on delivery |

### 3. Paymob dashboard
Set both callbacks of each integration to `https://your-domain/api/checkout/paymob/callback`:
- **Transaction processed callback:** server to server; this is what marks orders paid.
- **Transaction response callback:** returns the buyer to the receipt.

### 4. First owner
`npm run admin:create -- --owner you@your-domain 'StrongPassword'` with the production env file. Add the rest of the team from Admin → Team.

---

## Tests and CI

- **Unit:** pricing, delivery fees, search normalisation, size ordering, admin rules, settings schema and checkout rules.
- **Database:** role escalation, private promo codes, server-only orders, server prices, overselling, payment amount and idempotency, stock release, promo limits, owner rules.
- **Browser:** guest and signed-in checkout, card decline then retry, order tracking, admin access, webhook signature, security headers, page health and Arabic layout.

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, a throwaway Supabase with the database tests, a production build and the browser tests on every pull request.

---

## Credits

Product and editorial photos are from [Unsplash](https://unsplash.com) and are used under the Unsplash licence. Photographers and photo ids are recorded per image in `catalog/catalog.json`.
