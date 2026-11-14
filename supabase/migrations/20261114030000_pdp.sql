-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — product page reviews (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent. Run after 20261114010100_store_platform.sql.
--   1. reviews.author_name: the public name shown under a review
--      ("Mona B."), written by the server, so the product page
--      never reads customer profiles.
--   2. Reviews are written only by the server (lib/actions/
--      reviews.ts) after it has checked that the buyer received
--      the product. Customers can no longer insert reviews
--      straight through the API (that skipped the purchase check
--      and let anyone choose the name shown).
--   3. Indexes for the product page list and the purchase check.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Public author name ─────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS author_name TEXT;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_author_name_check
    CHECK (author_name IS NULL OR char_length(author_name) <= 60);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. No direct inserts by customers ─────────────────────────
-- Reading (approved / own / admin), deleting one's own review and
-- the admin policy are unchanged.
DROP POLICY IF EXISTS "user_create_review" ON reviews;

-- ── 3. Indexes ────────────────────────────────────────────────
-- Approved reviews of one product, newest first.
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews (product_id, status, created_at DESC);
-- "Has this buyer received this product?" joins order lines by variant.
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items (product_variant_id);
