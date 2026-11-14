-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — Security & checkout hardening (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Safe to run on an existing database: every step is idempotent.
--
-- 1. Brings the schema in line with what the app already uses
--    (payment columns on orders that were only added by hand).
-- 2. Customers can no longer promote themselves to admin
--    (profile role / identity columns are locked).
-- 3. Customers can no longer insert orders directly (prices would
--    come from the browser). Orders are created only through
--    place_order(), which prices everything from the database,
--    reserves stock and applies promo codes atomically.
-- 4. Promo codes are no longer readable by the public; they are
--    validated server-side (preview_promo / place_order).
-- 5. Stock is released when an unpaid online order expires, fails
--    or is cancelled; paid orders are confirmed by the webhook via
--    mark_order_paid(), which checks the amount.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Orders: payment columns & guest orders ─────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymob_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_governorate TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT false;
-- Secret handed to the buyer's browser so a guest can pay for / view their own order.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid();
-- Guests no longer get (or hijack) a profile: their orders simply have no user.
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
EXCEPTION WHEN duplicate_object OR invalid_text_representation OR datatype_mismatch THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('cod', 'card', 'wallet'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_amounts_check
    CHECK (subtotal >= 0 AND total >= 0 AND COALESCE(discount_amount, 0) >= 0 AND COALESCE(shipping_cost, 0) >= 0);
EXCEPTION WHEN duplicate_object OR check_violation THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status, created_at);

DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_stock_check CHECK (stock >= 0);
EXCEPTION WHEN duplicate_object OR check_violation THEN NULL; END $$;

-- ── 2. Profiles: nobody but an admin (or the server) may change role / identity ─
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- auth.role() is 'anon' / 'authenticated' for API callers, 'service_role' for the
  -- server, and NULL for direct database sessions (migrations, SQL editor).
  IF COALESCE(auth.role(), 'service_role') IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
    ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Not allowed to change role or account link' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard ON profiles;
CREATE TRIGGER trg_profiles_guard
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- Profile row for every new account, with the names the sign-up form collects.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, phone, country, city, role)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name')
    )), ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'city',
    'customer'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Orders: no direct inserts from the browser ─────────────
DROP POLICY IF EXISTS "user_create_order" ON orders;

-- ── 4. Promo codes: not publicly listable ─────────────────────
DROP POLICY IF EXISTS "auth_read_promos" ON promocodes;

-- Variants and images only for products that are on sale.
DROP POLICY IF EXISTS "pub_read_variants" ON product_variants;
CREATE POLICY "pub_read_variants" ON product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active));
DROP POLICY IF EXISTS "pub_read_images" ON product_images;
CREATE POLICY "pub_read_images" ON product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active));

-- ── 5. Stock release for abandoned / failed / cancelled orders ─
-- Puts an order's quantities back on the shelf (does not touch the order row).
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE product_variants v
     SET stock = v.stock + oi.quantity
    FROM order_items oi
   WHERE oi.order_id = p_order_id
     AND oi.product_variant_id = v.id;
$$;

CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock the order so two releases can't both restore stock.
  PERFORM 1 FROM orders WHERE id = p_order_id AND NOT stock_released FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM public.restore_order_stock(p_order_id);
  UPDATE orders SET stock_released = true WHERE id = p_order_id;
END;
$$;

-- Unpaid card / wallet orders hold stock for one hour, then give it back.
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM orders
     WHERE payment_method IN ('card', 'wallet')
       AND payment_status IN ('unpaid', 'failed')
       AND status = 'pending'
       AND NOT stock_released
       AND created_at < now() - interval '60 minutes'
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_order_stock(r.id);
    UPDATE orders SET status = 'cancelled' WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Cancelling or refunding an order gives its stock back (admin dashboard).
CREATE OR REPLACE FUNCTION public.restock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- (Must not UPDATE this same order row from a BEFORE trigger, so restore inline.)
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status IS DISTINCT FROM NEW.status AND NOT NEW.stock_released THEN
    PERFORM public.restore_order_stock(NEW.id);
    NEW.stock_released := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_restock ON orders;
CREATE TRIGGER trg_orders_restock
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION public.restock_on_cancel();

-- ── 6. Promo preview (validation only, no side effects) ───────
CREATE OR REPLACE FUNCTION public.preview_promo(p_code TEXT, p_subtotal NUMERIC)
RETURNS TABLE (ok BOOLEAN, reason TEXT, discount NUMERIC, code TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pc promocodes%ROWTYPE;
BEGIN
  SELECT * INTO pc FROM promocodes WHERE lower(promocodes.code) = lower(trim(p_code)) LIMIT 1;
  IF NOT FOUND OR NOT pc.is_active THEN
    RETURN QUERY SELECT false, 'invalid', 0::numeric, NULL::text; RETURN;
  END IF;
  IF pc.expires_at IS NOT NULL AND pc.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'expired', 0::numeric, NULL::text; RETURN;
  END IF;
  IF pc.max_uses IS NOT NULL AND COALESCE(pc.current_uses, 0) >= pc.max_uses THEN
    RETURN QUERY SELECT false, 'used_up', 0::numeric, NULL::text; RETURN;
  END IF;
  IF p_subtotal < COALESCE(pc.min_order_amount, 0) THEN
    RETURN QUERY SELECT false, 'min_order', pc.min_order_amount, NULL::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, NULL::text,
    LEAST(p_subtotal, ROUND(CASE WHEN pc.discount_type = 'percentage'
                                  THEN p_subtotal * pc.discount_value / 100
                                  ELSE pc.discount_value END, 2)),
    pc.code;
END;
$$;

-- ── 7. place_order: the only way an order is created ─────────
-- Called by the server (service role) after it has authenticated the buyer.
-- Prices, stock, discount and totals all come from the database.
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id        UUID,     -- profiles.id of the signed-in buyer, or NULL for a guest
  p_items          JSONB,    -- [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
  p_shipping_cost  NUMERIC,  -- computed by the server from its shipping table
  p_payment_method TEXT,     -- 'cod' | 'card' | 'wallet'
  p_contact        JSONB,    -- name, phone, email, governorate, city, address, notes
  p_promo_code     TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, order_number TEXT, total NUMERIC, access_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  it         JSONB;
  v          RECORD;
  v_variant  UUID;
  v_count    INT;
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
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;
  IF p_shipping_cost IS NULL OR p_shipping_cost < 0 THEN
    RAISE EXCEPTION 'invalid_shipping' USING ERRCODE = '22023';
  END IF;

  -- Give back stock held by abandoned online orders before checking availability.
  PERFORM public.expire_unpaid_orders();

  -- Price and reserve every line. Rows are locked in a stable order to avoid deadlocks.
  FOR it IN SELECT value FROM jsonb_array_elements(p_items)
             ORDER BY value ->> 'product_id', value ->> 'variant_id'
  LOOP
    qty := (it ->> 'quantity')::int;
    IF qty IS NULL OR qty < 1 OR qty > 99 THEN
      RAISE EXCEPTION 'invalid_quantity' USING ERRCODE = '22023';
    END IF;

    -- Products without options are added to the cart without a variant: use their only variant.
    v_variant := NULLIF(it ->> 'variant_id', '')::uuid;
    IF v_variant IS NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_count, v_variant
        FROM product_variants WHERE product_id = NULLIF(it ->> 'product_id', '')::uuid;
      IF v_count <> 1 THEN
        RAISE EXCEPTION 'choose_variant:%', it ->> 'product_id' USING ERRCODE = 'P0001';
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

    IF NOT FOUND OR NOT v.is_active THEN
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

-- ── 8. mark_order_paid: called by the Paymob webhook after HMAC check ─
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id       UUID,
  p_amount_cents   BIGINT,
  p_transaction_id TEXT,
  p_success        BOOLEAN
)
RETURNS TEXT  -- 'paid' | 'already_paid' | 'failed' | 'amount_mismatch' | 'not_found'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  o orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF o.payment_status = 'paid' THEN RETURN 'already_paid'; END IF;

  IF NOT p_success THEN
    UPDATE orders SET payment_status = 'failed', transaction_id = p_transaction_id WHERE id = o.id;
    RETURN 'failed';
  END IF;

  IF p_amount_cents <> ROUND(o.total * 100) THEN
    UPDATE orders
       SET payment_status = 'failed', transaction_id = p_transaction_id,
           notes = CONCAT_WS(E'\n', o.notes, format('Amount mismatch: paid %s cents, expected %s', p_amount_cents, ROUND(o.total * 100)))
     WHERE id = o.id;
    RETURN 'amount_mismatch';
  END IF;

  -- If the reservation had already expired, take the stock again (may go negative-safe check).
  IF o.stock_released THEN
    UPDATE product_variants v SET stock = GREATEST(0, v.stock - oi.quantity)
      FROM order_items oi WHERE oi.order_id = o.id AND oi.product_variant_id = v.id;
    UPDATE orders SET stock_released = false WHERE id = o.id;
  END IF;

  UPDATE orders
     SET payment_status = 'paid', transaction_id = p_transaction_id,
         status = CASE WHEN status IN ('pending', 'cancelled') THEN 'confirmed'::order_status ELSE status END
   WHERE id = o.id;
  RETURN 'paid';
END;
$$;

-- Only the server (service role) may call the order functions.
REVOKE ALL ON FUNCTION public.place_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_order_paid(UUID, BIGINT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_stock(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_order_stock(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_promo(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(UUID, BIGINT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.preview_promo(TEXT, NUMERIC) TO service_role;

-- ── 9. Contact form: cap message sizes ─────────────────────────
DO $$ BEGIN
  ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_size_check
    CHECK (char_length(name) <= 120 AND char_length(email) <= 254 AND char_length(subject) <= 200 AND char_length(message) <= 5000);
EXCEPTION WHEN duplicate_object OR check_violation OR undefined_table THEN NULL; END $$;
