-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — security review fixes (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent and safe on a database that already has orders.
--
--  1. payment_attempts: every Paymob order we register is recorded
--     with its order and amount. The payment webhook finds the
--     order from Paymob's SIGNED order id, never from the unsigned
--     merchant_order_id.
--  2. mark_order_paid(order, paymob order, amount, transaction,
--     success): refuses attempts that don't belong to the order,
--     one transaction id can confirm one order only, a payment that
--     arrives after the order was cancelled revives it only when
--     every item (and the promo code) can be taken again; otherwise
--     the payment is recorded and the order is flagged needs_refund.
--     Remarks go to audit_log (entity 'payment'), not orders.notes.
--  3. place_order(): at most 20 lines and 10 of each item, the
--     variant must belong to the product sent, an optional cash on
--     delivery ceiling (p_cod_max) and an optional cap on open
--     unpaid orders per phone / email (p_max_open_orders).
--  4. order_internal_notes: staff notes live in their own table
--     (admins only). orders.notes is the buyer's delivery note.
--  5. profiles: staff may read and update (not delete) profiles,
--     and may not edit other team members; only the owner deletes.
--     Deleting a profile keeps its orders (user_id becomes NULL).
--  6. admin_profile_by_email() also returns email_confirmed_at and
--     last_sign_in_at (the owner can't promote unconfirmed accounts).
--  7. rate_limit_hit(): a negative cost gives hits back (refund).
--  8. contact_messages: no direct inserts with the public key.
--  9. reviews: the public key can read only the public columns
--     (not user_id).
-- ══════════════════════════════════════════════════════════════

-- ── 1. Payment attempts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  paymob_order_id TEXT PRIMARY KEY CHECK (char_length(paymob_order_id) BETWEEN 1 AND 100),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON public.payment_attempts(order_id, created_at DESC);

-- Server only: RLS on, no policies, no grants for the public roles.
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_attempts FROM anon, authenticated;

-- Payments started before this migration: their (latest) Paymob order is on the order row.
INSERT INTO public.payment_attempts (paymob_order_id, order_id, amount_cents, created_at)
SELECT o.paymob_order_id, o.id, ROUND(o.total * 100)::bigint, COALESCE(o.updated_at, o.created_at, now())
  FROM public.orders o
 WHERE o.paymob_order_id IS NOT NULL
   AND btrim(o.paymob_order_id) <> ''
   AND char_length(o.paymob_order_id) <= 100
   AND o.total > 0
ON CONFLICT (paymob_order_id) DO NOTHING;

-- Between running this migration and deploying the new app, the previous
-- app registers Paymob orders by writing orders.paymob_order_id only. Turn
-- those into attempts too, so their payments can still be confirmed. (The
-- new app records the attempt first; this then changes nothing.)
CREATE OR REPLACE FUNCTION public.record_paymob_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.paymob_order_id IS NOT NULL AND btrim(NEW.paymob_order_id) <> ''
     AND char_length(NEW.paymob_order_id) <= 100
     AND NEW.paymob_order_id IS DISTINCT FROM OLD.paymob_order_id
     AND NEW.total > 0 THEN
    INSERT INTO payment_attempts (paymob_order_id, order_id, amount_cents)
    VALUES (NEW.paymob_order_id, NEW.id, ROUND(NEW.total * 100)::bigint)
    ON CONFLICT (paymob_order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_paymob_attempt ON public.orders;
CREATE TRIGGER trg_orders_paymob_attempt AFTER UPDATE OF paymob_order_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_paymob_attempt();
REVOKE ALL ON FUNCTION public.record_paymob_attempt() FROM PUBLIC, anon, authenticated;

-- ── 2. Orders: refund flag, one transaction per paid order ────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS needs_refund BOOLEAN NOT NULL DEFAULT false;

-- Paid orders that share a transaction id (only possible through the old
-- webhook): the earliest keeps it, the others get a suffix and an audit
-- entry so the owner can check them with Paymob.
WITH dup AS (
  SELECT id, transaction_id,
         row_number() OVER (PARTITION BY transaction_id ORDER BY created_at, id) AS rn
    FROM public.orders
   WHERE payment_status = 'paid' AND transaction_id IS NOT NULL
), renamed AS (
  UPDATE public.orders o
     SET transaction_id = dup.transaction_id || ' (duplicate ' || o.order_number || ')'
    FROM dup
   WHERE dup.id = o.id AND dup.rn > 1
  RETURNING o.id, dup.transaction_id AS original
)
INSERT INTO public.audit_log (actor_id, action, entity, entity_id, data)
SELECT NULL, 'payment.duplicate_transaction', 'payment', renamed.id::text,
       jsonb_build_object('transaction_id', renamed.original,
                          'remark', 'This transaction id had already confirmed another order. Check the payment with Paymob.')
  FROM renamed;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_paid_transaction
  ON public.orders(transaction_id)
  WHERE payment_status = 'paid' AND transaction_id IS NOT NULL;

-- Open unpaid orders per phone / email (place_order's cap).
CREATE INDEX IF NOT EXISTS idx_orders_open_phone ON public.orders(shipping_phone)
  WHERE status = 'pending' AND payment_status IN ('unpaid', 'failed');
CREATE INDEX IF NOT EXISTS idx_orders_open_email ON public.orders(lower(shipping_email))
  WHERE status = 'pending' AND payment_status IN ('unpaid', 'failed');

-- ── 3. Internal staff notes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_internal_notes (
  order_id   UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  note       TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.order_internal_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_internal_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_internal_notes TO authenticated;
DROP POLICY IF EXISTS admin_order_internal_notes ON public.order_internal_notes;
CREATE POLICY admin_order_internal_notes ON public.order_internal_notes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notes the team edited (audited 'order.note') move to the internal note;
-- the order keeps no staff text. Orders that already have an internal note
-- are left alone, so this runs once per order.
WITH moved AS (
  INSERT INTO public.order_internal_notes (order_id, note, updated_at, updated_by)
  SELECT o.id,
         left(o.notes, 2000),
         now(),
         (SELECT a.actor_id FROM public.audit_log a
           WHERE a.action = 'order.note' AND a.entity = 'orders' AND a.entity_id = o.id::text
           ORDER BY a.created_at DESC LIMIT 1)
    FROM public.orders o
   WHERE o.notes IS NOT NULL AND btrim(o.notes) <> ''
     AND EXISTS (SELECT 1 FROM public.audit_log a
                  WHERE a.action = 'order.note' AND a.entity = 'orders' AND a.entity_id = o.id::text)
     AND NOT EXISTS (SELECT 1 FROM public.order_internal_notes n WHERE n.order_id = o.id)
  ON CONFLICT (order_id) DO NOTHING
  RETURNING order_id
)
UPDATE public.orders o SET notes = NULL FROM moved WHERE o.id = moved.order_id;

-- Payment remarks the old webhook appended to orders.notes.
WITH m AS (
  SELECT id,
         array_to_string(ARRAY(
           SELECT r[1] FROM regexp_matches(notes, '(Amount mismatch: paid \d+ cents, expected \d+)', 'g') AS r
         ), E'\n') AS remarks
    FROM public.orders
   WHERE notes ~ 'Amount mismatch: paid \d+ cents, expected \d+'
), kept AS (
  INSERT INTO public.order_internal_notes AS n (order_id, note)
  SELECT m.id, left(m.remarks, 2000) FROM m
  ON CONFLICT (order_id) DO UPDATE
    SET note = left(concat_ws(E'\n', NULLIF(n.note, ''), EXCLUDED.note), 2000)
  RETURNING n.order_id
)
UPDATE public.orders o
   SET notes = NULLIF(btrim(regexp_replace(o.notes, '\n?Amount mismatch: paid \d+ cents, expected \d+', '', 'g'), E' \n'), '')
  FROM kept
 WHERE o.id = kept.order_id;

-- ── 4. place_order(): caps and checks ─────────────────────────
DROP FUNCTION IF EXISTS public.place_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id          UUID,
  p_items            JSONB,
  p_shipping_cost    NUMERIC,
  p_payment_method   TEXT,
  p_contact          JSONB,
  p_promo_code       TEXT DEFAULT NULL,
  p_cod_max          NUMERIC DEFAULT NULL,
  p_max_open_orders  INT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, order_number TEXT, total NUMERIC, access_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  it         JSONB;
  v          RECORD;
  v_product  UUID;
  v_variant  UUID;
  v_count    INT;
  v_open     INT;
  v_phone    TEXT;
  v_email    TEXT;
  qty        INT;
  price      NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_total    NUMERIC;
  v_promo    promocodes%ROWTYPE;
  v_order    orders%ROWTYPE;
  v_number   TEXT;
  lines      JSONB := '[]'::jsonb;
BEGIN
  IF p_payment_method NOT IN ('cod', 'card', 'wallet') THEN
    RAISE EXCEPTION 'invalid_payment_method' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) > 20 THEN
    RAISE EXCEPTION 'too_many_items' USING ERRCODE = '22023';
  END IF;
  IF p_shipping_cost IS NULL OR p_shipping_cost < 0 THEN
    RAISE EXCEPTION 'invalid_shipping' USING ERRCODE = '22023';
  END IF;
  -- At most 10 of one item, even when it is sent on several lines.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) e
     GROUP BY COALESCE(NULLIF(e.value ->> 'variant_id', ''), e.value ->> 'product_id')
    HAVING sum((e.value ->> 'quantity')::int) > 10
  ) THEN
    RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '22023';
  END IF;

  -- Give back stock held by abandoned online orders before checking availability.
  PERFORM public.expire_unpaid_orders();

  -- Open unpaid orders per phone / email (serialised per buyer so two requests can't both pass).
  IF p_max_open_orders IS NOT NULL THEN
    v_phone := NULLIF(btrim(p_contact ->> 'phone'), '');
    v_email := lower(NULLIF(btrim(p_contact ->> 'email'), ''));
    PERFORM pg_advisory_xact_lock(hashtext('shiftsouq.open_orders.phone:' || COALESCE(v_phone, '')));
    PERFORM pg_advisory_xact_lock(hashtext('shiftsouq.open_orders.email:' || COALESCE(v_email, '')));
    SELECT count(*) INTO v_open
      FROM orders o
     WHERE o.status = 'pending'
       AND o.payment_status IN ('unpaid', 'failed')
       AND ((v_phone IS NOT NULL AND o.shipping_phone = v_phone)
         OR (v_email IS NOT NULL AND lower(o.shipping_email) = v_email));
    IF v_open >= p_max_open_orders THEN
      RAISE EXCEPTION 'too_many_open_orders' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Price and reserve every line. Rows are locked in a stable order to avoid deadlocks.
  FOR it IN SELECT value FROM jsonb_array_elements(p_items)
             ORDER BY value ->> 'product_id', value ->> 'variant_id'
  LOOP
    qty := (it ->> 'quantity')::int;
    IF qty IS NULL OR qty < 1 OR qty > 10 THEN
      RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '22023';
    END IF;

    v_product := NULLIF(it ->> 'product_id', '')::uuid;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'product_unavailable:%', it ->> 'variant_id' USING ERRCODE = 'P0001';
    END IF;

    -- Products without options are added to the cart without a variant: use their only variant.
    v_variant := NULLIF(it ->> 'variant_id', '')::uuid;
    IF v_variant IS NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_count, v_variant
        FROM product_variants WHERE product_id = v_product;
      IF v_count <> 1 THEN
        RAISE EXCEPTION 'choose_variant:%', v_product USING ERRCODE = 'P0001';
      END IF;
    END IF;

    SELECT pv.id, pv.stock, pv.size, pv.color_en, pv.price_override,
           p.id AS product_id, p.name_en, p.base_price, p.sale_price, p.is_active,
           (SELECT url FROM product_images pi WHERE pi.product_id = p.id
             ORDER BY pi.is_primary DESC, pi.sort_order LIMIT 1) AS image_url
      INTO v
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
     WHERE pv.id = v_variant
       FOR UPDATE OF pv;

    -- The variant must exist, be on sale and belong to the product the buyer chose.
    IF NOT FOUND OR NOT v.is_active OR v.product_id <> v_product THEN
      RAISE EXCEPTION 'product_unavailable:%', v_variant USING ERRCODE = 'P0001';
    END IF;
    IF COALESCE(v.stock, 0) < qty THEN
      RAISE EXCEPTION 'out_of_stock:%', v_variant USING ERRCODE = 'P0001';
    END IF;

    price := COALESCE(v.price_override,
                      CASE WHEN v.sale_price IS NOT NULL AND v.sale_price > 0 AND v.sale_price < v.base_price
                           THEN v.sale_price ELSE v.base_price END);

    UPDATE product_variants SET stock = stock - qty WHERE id = v.id;
    v_subtotal := v_subtotal + price * qty;

    lines := lines || jsonb_build_object(
      'variant_id', v.id,
      'name', v.name_en,
      'label', NULLIF(CONCAT_WS(' / ', NULLIF(v.size, ''), NULLIF(v.color_en, '')), ''),
      'price', price,
      'quantity', qty,
      'image', v.image_url
    );
  END LOOP;

  -- Promo code (locked so max_uses can't be exceeded by concurrent orders).
  IF p_promo_code IS NOT NULL AND trim(p_promo_code) <> '' THEN
    SELECT * INTO v_promo FROM promocodes
     WHERE lower(code) = lower(trim(p_promo_code)) FOR UPDATE;
    IF NOT FOUND OR NOT v_promo.is_active
       OR (v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now())
       OR (v_promo.max_uses IS NOT NULL AND COALESCE(v_promo.current_uses, 0) >= v_promo.max_uses)
       OR v_subtotal < COALESCE(v_promo.min_order_amount, 0) THEN
      RAISE EXCEPTION 'invalid_promo' USING ERRCODE = 'P0001';
    END IF;
    v_discount := LEAST(v_subtotal, ROUND(CASE WHEN v_promo.discount_type = 'percentage'
                                               THEN v_subtotal * v_promo.discount_value / 100
                                               ELSE v_promo.discount_value END, 2));
    UPDATE promocodes SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = v_promo.id;
  END IF;

  v_total := v_subtotal - v_discount + p_shipping_cost;

  -- Cash on delivery only up to the store's limit (the whole transaction rolls back).
  IF p_payment_method = 'cod' AND p_cod_max IS NOT NULL AND v_total > p_cod_max THEN
    RAISE EXCEPTION 'cod_limit' USING ERRCODE = 'P0001';
  END IF;

  -- Human-readable, collision-checked order number: SS-YYYYMMDD-XXXXXX
  LOOP
    v_number := 'SS-' || to_char(now() AT TIME ZONE 'Africa/Cairo', 'YYYYMMDD') || '-' ||
                upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_number = v_number);
  END LOOP;

  INSERT INTO orders (
    user_id, order_number, status, payment_status, payment_method,
    subtotal, discount_amount, shipping_cost, tax_amount, total, promocode_id,
    shipping_name, shipping_phone, shipping_email, shipping_country,
    shipping_governorate, shipping_city, shipping_address, notes
  ) VALUES (
    p_user_id, v_number, 'pending', 'unpaid', p_payment_method,
    v_subtotal, v_discount, p_shipping_cost, 0, v_total, v_promo.id,
    p_contact ->> 'name', p_contact ->> 'phone', p_contact ->> 'email', 'EG',
    p_contact ->> 'governorate', p_contact ->> 'city', p_contact ->> 'address', p_contact ->> 'notes'
  )
  RETURNING * INTO v_order;

  INSERT INTO order_items (order_id, product_variant_id, product_name, variant_label, unit_price, quantity, image_url)
  SELECT v_order.id, (l ->> 'variant_id')::uuid, l ->> 'name', l ->> 'label',
         (l ->> 'price')::numeric, (l ->> 'quantity')::int, l ->> 'image'
    FROM jsonb_array_elements(lines) AS l;

  RETURN QUERY SELECT v_order.id, v_order.order_number, v_order.total, v_order.access_token;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, NUMERIC, INT) TO service_role;

-- ── 5. mark_order_paid(): tied to a payment attempt ───────────
DROP FUNCTION IF EXISTS public.mark_order_paid(UUID, BIGINT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id        UUID,
  p_paymob_order_id TEXT,
  p_amount_cents    BIGINT,
  p_transaction_id  TEXT,
  p_success         BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  o          orders%ROWTYPE;
  a          payment_attempts%ROWTYPE;
  v_txn      TEXT := NULLIF(btrim(p_transaction_id), '');
  v_expected BIGINT;
  v_promo    promocodes%ROWTYPE;
  v_recount  BOOLEAN := false;
  v_can      BOOLEAN := true;
BEGIN
  -- The attempt (Paymob's signed order id) must have been registered for this order.
  SELECT * INTO a FROM payment_attempts WHERE paymob_order_id = p_paymob_order_id;
  IF NOT FOUND OR a.order_id IS DISTINCT FROM p_order_id THEN
    RETURN 'unknown_attempt';
  END IF;

  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF o.payment_status = 'paid' THEN
    IF COALESCE(p_success, false) AND v_txn IS DISTINCT FROM o.transaction_id THEN
      -- A second successful payment for a paid order: keep it on record for the owner.
      INSERT INTO audit_log (actor_id, action, entity, entity_id, data)
      VALUES (NULL, 'payment.duplicate', 'payment', o.id::text,
              jsonb_build_object('transaction_id', v_txn, 'paid_with', o.transaction_id,
                                 'amount_cents', p_amount_cents, 'paymob_order_id', p_paymob_order_id));
      RETURN 'already_paid_other';
    END IF;
    RETURN 'already_paid';
  END IF;

  IF NOT COALESCE(p_success, false) THEN
    UPDATE orders SET payment_status = 'failed', transaction_id = v_txn WHERE id = o.id;
    RETURN 'failed';
  END IF;

  IF v_txn IS NULL THEN RETURN 'invalid_transaction'; END IF;

  v_expected := ROUND(o.total * 100);
  IF p_amount_cents IS DISTINCT FROM a.amount_cents OR p_amount_cents IS DISTINCT FROM v_expected THEN
    UPDATE orders SET payment_status = 'failed', transaction_id = v_txn WHERE id = o.id;
    INSERT INTO audit_log (actor_id, action, entity, entity_id, data)
    VALUES (NULL, 'payment.amount_mismatch', 'payment', o.id::text,
            jsonb_build_object('transaction_id', v_txn, 'paid_cents', p_amount_cents,
                               'expected_cents', v_expected, 'paymob_order_id', p_paymob_order_id));
    RETURN 'amount_mismatch';
  END IF;

  -- One transaction confirms one order.
  IF EXISTS (SELECT 1 FROM orders x WHERE x.transaction_id = v_txn AND x.payment_status = 'paid' AND x.id <> o.id) THEN
    INSERT INTO audit_log (actor_id, action, entity, entity_id, data)
    VALUES (NULL, 'payment.transaction_reused', 'payment', o.id::text,
            jsonb_build_object('transaction_id', v_txn, 'paymob_order_id', p_paymob_order_id));
    RETURN 'transaction_reused';
  END IF;

  IF o.status IN ('cancelled', 'refunded') THEN
    -- Paid after the order was cancelled (e.g. its payment window ran out).
    -- Revive it only if every item can be taken from stock again and the
    -- promo code (if its use was given back) still has a use left.
    IF o.status <> 'cancelled' THEN
      v_can := false;
    END IF;

    IF v_can AND o.stock_released THEN
      PERFORM 1 FROM product_variants v
        WHERE v.id IN (SELECT oi.product_variant_id FROM order_items oi WHERE oi.order_id = o.id)
        ORDER BY v.id
        FOR UPDATE;
      IF EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_variant_id IS NULL)
         OR EXISTS (
           SELECT 1
             FROM (SELECT oi.product_variant_id AS vid, sum(oi.quantity) AS qty
                     FROM order_items oi WHERE oi.order_id = o.id GROUP BY 1) need
             LEFT JOIN product_variants v ON v.id = need.vid
            WHERE v.id IS NULL OR COALESCE(v.stock, 0) < need.qty) THEN
        v_can := false;
      END IF;
    END IF;

    IF v_can AND o.promocode_id IS NOT NULL AND o.promo_released THEN
      SELECT * INTO v_promo FROM promocodes WHERE id = o.promocode_id FOR UPDATE;
      IF NOT FOUND OR NOT COALESCE(v_promo.is_active, false)
         OR (v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= o.created_at)
         OR (v_promo.max_uses IS NOT NULL AND COALESCE(v_promo.current_uses, 0) >= v_promo.max_uses) THEN
        v_can := false;
      ELSE
        v_recount := true;
      END IF;
    END IF;

    IF NOT v_can THEN
      UPDATE orders SET payment_status = 'paid', transaction_id = v_txn, needs_refund = true WHERE id = o.id;
      INSERT INTO audit_log (actor_id, action, entity, entity_id, data)
      VALUES (NULL, 'payment.paid_after_cancel', 'payment', o.id::text,
              jsonb_build_object('transaction_id', v_txn, 'amount_cents', p_amount_cents, 'revived', false));
      RETURN 'paid_after_cancel';
    END IF;

    IF o.stock_released THEN
      UPDATE product_variants v
         SET stock = v.stock - need.qty
        FROM (SELECT oi.product_variant_id AS vid, sum(oi.quantity) AS qty
                FROM order_items oi WHERE oi.order_id = o.id GROUP BY 1) need
       WHERE v.id = need.vid;
    END IF;
    IF v_recount THEN
      UPDATE promocodes SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = v_promo.id;
    END IF;
    UPDATE orders
       SET payment_status = 'paid', transaction_id = v_txn, status = 'confirmed',
           stock_released = false, promo_released = CASE WHEN v_recount THEN false ELSE promo_released END,
           needs_refund = false
     WHERE id = o.id;
    INSERT INTO audit_log (actor_id, action, entity, entity_id, data)
    VALUES (NULL, 'payment.paid_after_cancel', 'payment', o.id::text,
            jsonb_build_object('transaction_id', v_txn, 'amount_cents', p_amount_cents, 'revived', true));
    RETURN 'paid';
  END IF;

  -- Orders placed before stock was reserved at checkout: take it now.
  IF o.stock_released THEN
    UPDATE product_variants v SET stock = GREATEST(0, v.stock - oi.quantity)
      FROM order_items oi WHERE oi.order_id = o.id AND oi.product_variant_id = v.id;
    UPDATE orders SET stock_released = false WHERE id = o.id;
  END IF;

  UPDATE orders
     SET payment_status = 'paid', transaction_id = v_txn,
         status = CASE WHEN status = 'pending' THEN 'confirmed'::order_status ELSE status END
   WHERE id = o.id;
  RETURN 'paid';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(UUID, TEXT, BIGINT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(UUID, TEXT, BIGINT, TEXT, BOOLEAN) TO service_role;

-- ── 6. Profiles: staff can't delete or edit other team members ─
-- Orders outlive the account that placed them.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orders_user_id_fkey' AND conrelid = 'public.orders'::regclass AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_user_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey' AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS admin_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_read_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_update_profiles ON public.profiles;
DROP POLICY IF EXISTS owner_delete_profiles ON public.profiles;
CREATE POLICY admin_read_profiles ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY admin_update_profiles ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY owner_delete_profiles ON public.profiles FOR DELETE USING (public.is_super_admin());

-- Only the owner (or the server) changes roles or account links; staff may
-- edit customers and their own row, never another team member's.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') IN ('anon', 'authenticated') AND NOT public.is_super_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
    ELSE
      IF NEW.role IS DISTINCT FROM OLD.role OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        RAISE EXCEPTION 'Not allowed to change role or account link' USING ERRCODE = '42501';
      END IF;
      IF OLD.role::text <> 'customer' AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not allowed to change another team member' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 7. Team: confirmed accounts only ──────────────────────────
DROP FUNCTION IF EXISTS public.admin_profile_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.admin_profile_by_email(p_email TEXT)
RETURNS TABLE(profile_id UUID, full_name TEXT, role TEXT, email_confirmed_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(p_email) > 254 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.role::text, u.email_confirmed_at, u.last_sign_in_at
  FROM auth.users u
  JOIN profiles p ON p.auth_user_id = u.id
  WHERE lower(u.email) = lower(btrim(p_email))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_profile_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_profile_by_email(TEXT) TO authenticated, service_role;

-- ── 8. Rate limits: a negative cost gives hits back ───────────
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key            TEXT,
  p_limit          INT,
  p_window_seconds INT,
  p_cost           INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits INT;
  v_cost INT := COALESCE(p_cost, 1);
BEGIN
  IF p_key IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit' USING ERRCODE = '22023';
  END IF;

  -- Refund (e.g. a promo code or sign-in that turned out fine): never below zero.
  IF v_cost < 0 THEN
    UPDATE rate_limits SET hits = GREATEST(hits + v_cost, 0)
     WHERE key = left(p_key, 200)
       AND window_start > now() - make_interval(secs => p_window_seconds);
    RETURN true;
  END IF;

  INSERT INTO rate_limits AS r (key, window_start, hits)
  VALUES (left(p_key, 200), now(), v_cost)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.window_start <= now() - make_interval(secs => p_window_seconds)
                THEN v_cost ELSE r.hits + v_cost END,
    window_start = CASE WHEN r.window_start <= now() - make_interval(secs => p_window_seconds)
                        THEN now() ELSE r.window_start END
  RETURNING hits INTO v_hits;

  -- Housekeeping: now and then, forget windows older than a day.
  IF random() < 0.02 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits - v_cost < p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT, INT) TO service_role;

-- ── 9. Contact form: only through the server (throttle + honeypot) ─
DROP POLICY IF EXISTS public_insert_contact ON public.contact_messages;

-- ── 10. Reviews: the public key reads public columns only ─────
REVOKE SELECT ON TABLE public.reviews FROM anon;
GRANT SELECT (id, product_id, rating, title, comment, author_name, is_verified, status, created_at)
  ON TABLE public.reviews TO anon;

NOTIFY pgrst, 'reload schema';
