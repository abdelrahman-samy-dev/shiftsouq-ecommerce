-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — Admin dashboard (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Safe to run more than once (IF NOT EXISTS / OR REPLACE / guarded
-- DO blocks). Run after 20261114000000_security_hardening.sql.
--
-- 1. Contact inbox: read time and archive for contact messages;
--    visitors can only submit new, unread, unarchived messages.
-- 2. Promo codes: one code per spelling regardless of case (checkout
--    matches codes case-insensitively) and sane values.
-- 3. admin_order_stats(): dashboard totals computed in the database,
--    counting only money actually received (paid online, or COD
--    delivered) — admins only.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Contact inbox ──────────────────────────────────────────
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE contact_messages SET is_read = false WHERE is_read IS NULL;
ALTER TABLE contact_messages ALTER COLUMN is_read SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contact_messages_inbox
  ON contact_messages (created_at DESC) WHERE archived_at IS NULL;

-- Visitors may only add a fresh message (not mark it read or archived).
DROP POLICY IF EXISTS "public_insert_contact" ON contact_messages;
CREATE POLICY "public_insert_contact" ON contact_messages FOR INSERT
  WITH CHECK (COALESCE(is_read, false) = false AND read_at IS NULL AND archived_at IS NULL);

-- ── 2. Promo codes ────────────────────────────────────────────
-- place_order / preview_promo look codes up with lower(code); two codes
-- that differ only by case would make that lookup ambiguous.
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS promocodes_code_lower_key ON promocodes (lower(code));
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'promocodes: some codes differ only by letter case — rename them, then run this migration again.';
END $$;

-- Checked for new and edited codes (existing rows are left as they are).
DO $$ BEGIN
  ALTER TABLE promocodes ADD CONSTRAINT promocodes_values_check CHECK (
    discount_value > 0
    AND (discount_type <> 'percentage' OR discount_value <= 100)
    AND COALESCE(min_order_amount, 0) >= 0
    AND (max_uses IS NULL OR max_uses > 0)
    AND COALESCE(current_uses, 0) >= 0
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Dashboard totals ───────────────────────────────────────
-- SECURITY INVOKER: runs with the caller's rights, so row-level security
-- applies too; non-admins are refused outright.
CREATE OR REPLACE FUNCTION public.admin_order_stats()
RETURNS TABLE (
  total_orders      BIGINT,   -- every order
  revenue           NUMERIC,  -- money received: paid online, or COD delivered; not cancelled / refunded
  revenue_orders    BIGINT,   -- orders behind that revenue
  awaiting_payment  BIGINT,   -- card / wallet orders still waiting for the gateway
  to_fulfil         BIGINT,   -- pending / confirmed / processing orders that can be worked on
  cash_to_collect   NUMERIC   -- COD orders on their way (not delivered, not cancelled)
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint,
    COALESCE(sum(o.total) FILTER (WHERE r.received), 0)::numeric,
    count(*) FILTER (WHERE r.received)::bigint,
    count(*) FILTER (
      WHERE o.payment_method IN ('card', 'wallet')
        AND o.payment_status IN ('unpaid', 'failed')
        AND o.status = 'pending'
    )::bigint,
    count(*) FILTER (
      WHERE o.status IN ('pending', 'confirmed', 'processing')
        AND (o.payment_status = 'paid' OR o.payment_method IS NULL OR o.payment_method = 'cod')
    )::bigint,
    COALESCE(sum(o.total) FILTER (
      WHERE o.payment_method = 'cod'
        AND o.payment_status = 'unpaid'
        AND o.status IN ('pending', 'confirmed', 'processing', 'shipped')
    ), 0)::numeric
  FROM orders o
  CROSS JOIN LATERAL (
    SELECT (
      o.status NOT IN ('cancelled', 'refunded')
      AND o.payment_status <> 'refunded'
      AND (o.payment_status = 'paid' OR (o.payment_method = 'cod' AND o.status = 'delivered'))
    ) AS received
  ) r;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_order_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_order_stats() TO authenticated, service_role;
