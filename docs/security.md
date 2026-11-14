# Security notes

How money, stock, accounts and private data are protected, and what to check on a live database. The fixes from the security review of 2026-11-14 are in `supabase/migrations/20261114080000_security_fixes.sql` plus the app code named below.

## Payments (Paymob)

- **Every payment is an attempt.** `startOnlinePayment` (`lib/payments/paymob.ts`) registers a Paymob order and records it in `payment_attempts` (Paymob order id → our order, amount in piastres). Retries add new attempts. Local test payments (`PAYMOB_MOCK=1`, never in production) record `mock-<uuid>` attempts and are confirmed the same way.
- **The webhook trusts only signed data.** `POST /api/checkout/paymob/callback` checks the HMAC, then finds the order from Paymob's signed order id (`obj.order.id`) through `payment_attempts`. `merchant_order_id` is not covered by the HMAC and is never used.
- **`mark_order_paid(order, paymob_order, amount, transaction, success)`** (service role only) runs under a row lock and returns:

| Result | Meaning |
|---|---|
| `paid` | Confirmed (a cancelled order is revived only if every item and the promo code can be taken again) |
| `already_paid` | Same transaction again: nothing changes |
| `already_paid_other` | A second successful payment for a paid order: recorded in the audit log |
| `failed` | Declined or errored payment |
| `amount_mismatch` | Amount differs from the attempt or the order total: not paid, recorded |
| `transaction_reused` | That transaction id already confirmed another order: refused, recorded |
| `paid_after_cancel` | Paid after the order was cancelled and it can't be revived: kept as paid, order stays cancelled, `needs_refund = true` |
| `unknown_attempt` | The Paymob order isn't an attempt of this order: refused |

- A unique index allows one paid order per transaction id.
- Upgrading: payments started by the previous app version (it only wrote `orders.paymob_order_id`) become attempts through a trigger, both those already in progress when the migration runs and any started before the new app is deployed.
- Refund and void callbacks don't change the order; they are recorded in the audit log (entity `payment`, no actor) for the owner to reconcile. Payment events show on the order's timeline and in Admin → Activity → Payments.
- The payment key expires with the order's 60-minute payment window.
- The return page (`GET` callback) only routes the buyer; it verifies the flat query (Paymob names the order id `order` there) and finds the order through its attempt.

## Orders and stock

- Prices, discount and stock come from `place_order()` only. It refuses more than 20 lines, more than 10 of one item, and a variant that doesn't belong to the product sent.
- `createOrder` refuses any line it can't price before deciding whether cash on delivery is allowed; `place_order(p_cod_max)` checks the cash on delivery ceiling again on its own total.
- Each order reserves stock, so orders are limited: 5 per hour per account (10 per guest IP), 5 per hour per phone, and at most 3 orders waiting for payment or confirmation per phone or email (`place_order(p_max_open_orders)`, serialised per buyer).

## Accounts

- Auth email links: PKCE only (`/auth/callback` exchanges a `code`; `token_hash` links are not accepted, to prevent login CSRF).
- Password reset: the callback reads the sign-in method from the new session (`recovery`), not from `?next=`, and sets `ss_recovery = <userId>.<expiry>.<HMAC>` (15 minutes, httpOnly). The key is derived from `SUPABASE_SERVICE_ROLE_KEY`. `/reset-password` and `resetPasswordAction` verify it in constant time.
- Rate limits per client (hashed IP) and per email on sign-in (failures only), sign-up, reset links, promo codes, order tracking and the newsletter (`lib/checkout/rate-limit.ts`, shared counters in `rate_limits`). The client IP comes from `x-vercel-forwarded-for` / `x-real-ip`, else the last `x-forwarded-for` hop.
- Redirect targets (`?next=`, `?redirect=`) go through `safeRedirectPath`, which refuses anything that resolves to `//host` or `/\host`.
- Supabase session cookies are `Secure` in production.
- Team: the owner can only promote accounts whose email is confirmed.

## Data access

- `orders.notes` is the buyer's own delivery note (the buyer can read it). Staff notes live in `order_internal_notes` (admins only).
- Profiles: staff can read and update customers (and their own row), never another team member or the owner; only the owner can delete a profile. Deleting a profile keeps its orders (`user_id` becomes NULL).
- Reviews: the public key can read only `id, product_id, rating, title, comment, author_name, is_verified, status, created_at` (not `user_id`).
- Contact form: no public INSERT policy; the server action (honeypot + throttle) writes with the service key.
- Images: next/image and the admin image links accept the stock photo hosts and this project's own Storage host only (from `NEXT_PUBLIC_SUPABASE_URL`).

## Accepted risk

- The Content Security Policy keeps `'unsafe-inline'` for scripts so pages stay statically rendered (no nonces). Scripts, frames, images and connections are still limited to known origins; XSS is prevented at the source (React escaping; the only raw HTML is JSON-LD, which escapes `<`).

## Expected row-level security policies

After upgrading production, run:

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage')
 ORDER BY tablename, policyname;
```

It should list exactly these (table: policies). Drop anything else that was created by hand.

| Table | Policies |
|---|---|
| audit_log | admin_read_audit (SELECT) |
| cart_items | user_cart (ALL, own rows) |
| categories | admin_categories (ALL), pub_read_categories (SELECT) |
| collection_products | admin_collection_products (ALL), pub_read_collection_products (SELECT) |
| collections | admin_collections (ALL), pub_read_collections (SELECT) |
| contact_messages | admin_contact_messages (ALL) |
| newsletter_subscribers | admin_newsletter (ALL) |
| order_internal_notes | admin_order_internal_notes (ALL) |
| order_items | admin_order_items (ALL), user_read_order_items (SELECT, own orders) |
| orders | admin_orders (ALL), user_read_orders (SELECT, own orders) |
| payment_attempts | none (server only) |
| product_images | admin_images (ALL), pub_read_images (SELECT) |
| product_variants | admin_variants (ALL), pub_read_variants (SELECT) |
| products | admin_products (ALL), pub_read_products (SELECT) |
| profiles | admin_read_profiles (SELECT), admin_update_profiles (UPDATE), owner_delete_profiles (DELETE), user_read_own_profile (SELECT), user_read_profile (SELECT), user_update_profile (UPDATE) |
| promocodes | admin_promos (ALL) |
| rate_limits | none (server only) |
| reviews | admin_reviews (ALL), pub_read_reviews (SELECT), user_delete_review (DELETE) |
| search_synonyms | admin_search_synonyms (ALL), pub_read_search_synonyms (SELECT) |
| store_settings | owner_update_settings (UPDATE), pub_read_settings (SELECT) |
| stores | admin_stores (ALL), pub_read_stores (SELECT) |
| user_addresses | admin_read_addresses (SELECT), own_addresses (ALL) |
| wishlist | user_wishlist (ALL, own rows) |
| storage.objects | product_images_admin_delete, product_images_admin_insert, product_images_admin_update, product_images_public_read |
