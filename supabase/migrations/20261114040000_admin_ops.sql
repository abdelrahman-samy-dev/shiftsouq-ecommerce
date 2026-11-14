-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — Admin operations (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent (CREATE OR REPLACE / IF NOT EXISTS / DROP … IF EXISTS).
-- Run after 20261114010100_store_platform.sql.
--
-- 1. Order rules in SQL, shared by every report below:
--      order_counts_as_revenue()  money received and the order stands
--      order_is_placed()          not an unpaid card / wallet attempt
-- 2. Dashboard (admins only, row-level security applies):
--      admin_period_stats()   orders, revenue, new customers for a period
--      admin_daily_revenue()  revenue per day (store time zone)
--      admin_top_products()   best sellers by units
--      admin_queue_counts()   work queues + sidebar counters
-- 3. Customers and team (admins only; read e-mail from auth.users):
--      admin_customers()        list / one customer with order totals
--      admin_profile_emails()   e-mail + last sign-in for profile ids
--      admin_profile_by_email() owner only: find an account to add
-- 4. Ownership:
--      transfer_store_ownership()  owner hands the store to an admin
--      guard_last_owner trigger    the store always keeps one owner
-- 5. Indexes for the admin lists.
-- Nothing here is granted to anon.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Order rules ────────────────────────────────────────────
-- Same rule as admin_order_stats() and lib/admin/orders.ts countsAsRevenue():
-- paid online, or cash on delivery that was delivered; not cancelled / refunded.
CREATE OR REPLACE FUNCTION public.order_counts_as_revenue(p_status TEXT, p_payment_status TEXT, p_payment_method TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_status, 'pending') NOT IN ('cancelled', 'refunded')
     AND COALESCE(p_payment_status, 'unpaid') <> 'refunded'
     AND (COALESCE(p_payment_status, 'unpaid') = 'paid'
          OR (p_payment_method = 'cod' AND p_status = 'delivered'));
$$;

-- An order the customer actually placed: cash on delivery, or an online
-- order whose payment went through (even if refunded later). Card / wallet
-- orders still waiting for (or abandoned at) the gateway are not counted.
CREATE OR REPLACE FUNCTION public.order_is_placed(p_payment_status TEXT, p_payment_method TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NOT (COALESCE(p_payment_method, 'cod') IN ('card', 'wallet')
              AND COALESCE(p_payment_status, 'unpaid') IN ('unpaid', 'failed'));
$$;

-- ── 2a. Period totals (dashboard KPIs) ────────────────────────
CREATE OR REPLACE FUNCTION public.admin_period_stats(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  orders          BIGINT,   -- orders placed in the period (order_is_placed)
  revenue         NUMERIC,  -- money received for orders placed in the period
  revenue_orders  BIGINT,   -- orders behind that revenue (for the average order value)
  new_customers   BIGINT    -- customer accounts created in the period
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
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from OR p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'invalid period' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE public.order_is_placed(o.payment_status, o.payment_method))::bigint,
    COALESCE(sum(o.total) FILTER (WHERE public.order_counts_as_revenue(o.status::text, o.payment_status, o.payment_method)), 0)::numeric,
    count(*) FILTER (WHERE public.order_counts_as_revenue(o.status::text, o.payment_status, o.payment_method))::bigint,
    (SELECT count(*) FROM profiles p
      WHERE p.role::text = 'customer' AND p.created_at >= p_from AND p.created_at < p_to)::bigint
  FROM orders o
  WHERE o.created_at >= p_from AND o.created_at < p_to;
END;
$$;

-- ── 2b. Revenue per day (last N days, store time zone) ────────
CREATE OR REPLACE FUNCTION public.admin_daily_revenue(p_days INT DEFAULT 30, p_tz TEXT DEFAULT 'Africa/Cairo')
RETURNS TABLE (day DATE, revenue NUMERIC, orders BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  today DATE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 366 THEN
    RAISE EXCEPTION 'invalid number of days' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_tz) THEN
    RAISE EXCEPTION 'unknown time zone' USING ERRCODE = '22023';
  END IF;
  today := (now() AT TIME ZONE p_tz)::date;

  RETURN QUERY
  WITH days AS (
    SELECT (today - g)::date AS d FROM generate_series(0, p_days - 1) AS g
  )
  SELECT
    days.d,
    COALESCE(sum(o.total) FILTER (WHERE public.order_counts_as_revenue(o.status::text, o.payment_status, o.payment_method)), 0)::numeric,
    count(o.id) FILTER (WHERE public.order_is_placed(o.payment_status, o.payment_method))::bigint
  FROM days
  LEFT JOIN orders o
    ON o.created_at >= (days.d::timestamp AT TIME ZONE p_tz)
   AND o.created_at <  ((days.d + 1)::timestamp AT TIME ZONE p_tz)
  GROUP BY days.d
  ORDER BY days.d;
END;
$$;

-- ── 2c. Best sellers by units ─────────────────────────────────
-- Items whose product was deleted are grouped by the name kept on the order.
CREATE OR REPLACE FUNCTION public.admin_top_products(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_limit INT DEFAULT 5)
RETURNS TABLE (
  product_id UUID,
  name_en    TEXT,
  name_ar    TEXT,
  slug       TEXT,
  image_url  TEXT,
  units      BIGINT,
  revenue    NUMERIC
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
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from OR p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'invalid period' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(max(p.name_en), max(oi.product_name)),
    COALESCE(max(p.name_ar), max(oi.product_name)),
    max(p.slug),
    COALESCE(
      (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC NULLS LAST, pi.sort_order NULLS LAST LIMIT 1),
      max(oi.image_url)
    ),
    sum(oi.quantity)::bigint,
    sum(oi.quantity * oi.unit_price)::numeric
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN product_variants v ON v.id = oi.product_variant_id
  LEFT JOIN products p ON p.id = v.product_id
  WHERE o.created_at >= p_from AND o.created_at < p_to
    AND o.status::text NOT IN ('cancelled', 'refunded')
    AND public.order_is_placed(o.payment_status, o.payment_method)
  GROUP BY p.id, CASE WHEN p.id IS NULL THEN oi.product_name END
  ORDER BY 6 DESC, 7 DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 50);
END;
$$;

-- ── 2d. Work queues (dashboard + sidebar counters) ────────────
CREATE OR REPLACE FUNCTION public.admin_queue_counts()
RETURNS TABLE (
  to_fulfil            BIGINT,   -- pending / confirmed / processing orders that can be worked on
  awaiting_payment     BIGINT,   -- card / wallet orders still waiting for the gateway
  cash_to_collect      BIGINT,   -- COD orders on their way, cash not yet collected
  low_stock            BIGINT,   -- variants of live products at or below the threshold
  pending_reviews      BIGINT,
  unread_messages      BIGINT,
  low_stock_threshold  INT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  threshold INT := 5;
  raw JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT s.inventory -> 'low_stock_threshold' INTO raw FROM store_settings s WHERE s.id = 1;
  IF raw IS NOT NULL AND jsonb_typeof(raw) = 'number' THEN
    threshold := GREATEST(0, LEAST(1000, floor((raw #>> '{}')::numeric)::int));
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM orders o
      WHERE o.status::text IN ('pending', 'confirmed', 'processing')
        AND (o.payment_status = 'paid' OR o.payment_method IS NULL OR o.payment_method = 'cod'))::bigint,
    (SELECT count(*) FROM orders o
      WHERE o.payment_method IN ('card', 'wallet')
        AND o.payment_status IN ('unpaid', 'failed')
        AND o.status::text = 'pending')::bigint,
    (SELECT count(*) FROM orders o
      WHERE o.payment_method = 'cod' AND o.payment_status = 'unpaid'
        AND o.status::text IN ('shipped', 'delivered'))::bigint,
    (SELECT count(*) FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE p.is_active IS NOT FALSE AND COALESCE(v.stock, 0) <= threshold)::bigint,
    (SELECT count(*) FROM reviews r WHERE r.status = 'pending')::bigint,
    (SELECT count(*) FROM contact_messages m
      WHERE m.archived_at IS NULL AND COALESCE(m.is_read, false) = false)::bigint,
    threshold;
END;
$$;

-- ── 3a. Customers with order totals ───────────────────────────
-- SECURITY DEFINER only to read e-mail addresses from auth.users;
-- the caller must be an admin (checked first).
CREATE OR REPLACE FUNCTION public.admin_customers(
  p_search TEXT DEFAULT NULL,
  p_digits TEXT DEFAULT NULL,
  p_sort   TEXT DEFAULT 'joined',
  p_desc   BOOLEAN DEFAULT true,
  p_limit  INT DEFAULT 25,
  p_offset INT DEFAULT 0,
  p_id     UUID DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  joined_at       TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  orders_count    BIGINT,
  total_spent     NUMERIC,
  last_order_at   TIMESTAMPTZ,
  total_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pattern TEXT;
  digits  TEXT := NULLIF(regexp_replace(COALESCE(p_digits, ''), '\D', '', 'g'), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
    pattern := '%' || replace(replace(replace(left(btrim(p_search), 80), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id AS b_id,
      p.full_name AS b_name,
      u.email::text AS b_email,
      p.phone AS b_phone,
      p.created_at AS b_joined,
      u.last_sign_in_at AS b_last_sign_in,
      COALESCE(s.orders_count, 0)::bigint AS b_orders,
      COALESCE(s.total_spent, 0)::numeric AS b_spent,
      s.last_order_at AS b_last_order
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.auth_user_id
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE public.order_is_placed(o.payment_status, o.payment_method)) AS orders_count,
        sum(o.total) FILTER (WHERE public.order_counts_as_revenue(o.status::text, o.payment_status, o.payment_method)) AS total_spent,
        max(o.created_at) FILTER (WHERE public.order_is_placed(o.payment_status, o.payment_method)) AS last_order_at
      FROM orders o
      WHERE o.user_id = p.id
    ) s ON true
    WHERE p.role::text = 'customer'
      AND (p_id IS NULL OR p.id = p_id)
      AND (
        pattern IS NULL
        OR p.full_name ILIKE pattern
        OR u.email ILIKE pattern
        OR p.phone ILIKE pattern
        OR (digits IS NOT NULL AND length(digits) >= 4 AND regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') LIKE '%' || digits || '%')
      )
  )
  SELECT b.b_id, b.b_name, b.b_email, b.b_phone, b.b_joined, b.b_last_sign_in,
         b.b_orders, b.b_spent, b.b_last_order, count(*) OVER ()::bigint
  FROM base b
  ORDER BY
    CASE WHEN p_sort = 'name'       AND NOT p_desc THEN lower(b.b_name)  END ASC  NULLS LAST,
    CASE WHEN p_sort = 'name'       AND p_desc     THEN lower(b.b_name)  END DESC NULLS LAST,
    CASE WHEN p_sort = 'email'      AND NOT p_desc THEN lower(b.b_email) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'email'      AND p_desc     THEN lower(b.b_email) END DESC NULLS LAST,
    CASE WHEN p_sort = 'orders'     AND NOT p_desc THEN b.b_orders       END ASC  NULLS LAST,
    CASE WHEN p_sort = 'orders'     AND p_desc     THEN b.b_orders       END DESC NULLS LAST,
    CASE WHEN p_sort = 'spent'      AND NOT p_desc THEN b.b_spent        END ASC  NULLS LAST,
    CASE WHEN p_sort = 'spent'      AND p_desc     THEN b.b_spent        END DESC NULLS LAST,
    CASE WHEN p_sort = 'last_order' AND NOT p_desc THEN b.b_last_order   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'last_order' AND p_desc     THEN b.b_last_order   END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('name', 'email', 'orders', 'spent', 'last_order') AND NOT p_desc THEN b.b_joined END ASC NULLS LAST,
    CASE WHEN p_sort NOT IN ('name', 'email', 'orders', 'spent', 'last_order') AND p_desc     THEN b.b_joined END DESC NULLS LAST,
    b.b_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

-- ── 3b. E-mail + last sign-in for a set of profiles ───────────
CREATE OR REPLACE FUNCTION public.admin_profile_emails(p_ids UUID[])
RETURNS TABLE (profile_id UUID, email TEXT, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN;
  END IF;
  IF cardinality(p_ids) > 500 THEN
    RAISE EXCEPTION 'too many ids' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT p.id, u.email::text, u.last_sign_in_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.id = ANY (p_ids);
END;
$$;

-- ── 3c. Owner only: find an account by e-mail (Team → add) ────
CREATE OR REPLACE FUNCTION public.admin_profile_by_email(p_email TEXT)
RETURNS TABLE (profile_id UUID, full_name TEXT, role TEXT)
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
  SELECT p.id, p.full_name, p.role::text
  FROM auth.users u
  JOIN profiles p ON p.auth_user_id = u.id
  WHERE lower(u.email) = lower(btrim(p_email))
  LIMIT 1;
END;
$$;

-- ── 4a. The store always keeps one owner ──────────────────────
CREATE OR REPLACE FUNCTION public.guard_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role::text = 'super_admin'
     AND (TG_OP = 'DELETE'
          OR NEW.role::text IS DISTINCT FROM 'super_admin'
          OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id) THEN
    -- Serialise owner changes so two owners can't demote each other at once.
    PERFORM pg_advisory_xact_lock(hashtext('shiftsouq.store_owner'));
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE role::text = 'super_admin' AND auth_user_id IS NOT NULL AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'The store must keep at least one owner' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_last_owner ON profiles;
CREATE TRIGGER trg_profiles_last_owner
  BEFORE UPDATE OF role, auth_user_id OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_owner();

-- ── 4b. Transfer ownership (owner → an admin) ─────────────────
-- SECURITY INVOKER: runs as the owner, so row-level security and the
-- role guard (only is_super_admin() may change roles) still apply.
-- Both rows change in one transaction; the old owner becomes an admin.
CREATE OR REPLACE FUNCTION public.transfer_store_ownership(p_target UUID)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me UUID;
  target_role TEXT;
  target_auth UUID;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO me FROM profiles WHERE auth_user_id = auth.uid();
  IF me IS NULL OR p_target IS NULL OR p_target = me THEN
    RAISE EXCEPTION 'choose another team member' USING ERRCODE = '22023';
  END IF;

  SELECT role::text, auth_user_id INTO target_role, target_auth FROM profiles WHERE id = p_target FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'team member not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_role <> 'admin' OR target_auth IS NULL THEN
    RAISE EXCEPTION 'ownership can only go to an admin who can sign in' USING ERRCODE = '22023';
  END IF;

  UPDATE profiles SET role = 'super_admin' WHERE id = p_target;
  UPDATE profiles SET role = 'admin' WHERE id = me;
END;
$$;

-- ── Grants: signed-in callers only (each function checks the role) ─
REVOKE ALL ON FUNCTION public.admin_period_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_daily_revenue(INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_queue_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_customers(TEXT, TEXT, TEXT, BOOLEAN, INT, INT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_profile_emails(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_profile_by_email(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_store_ownership(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_period_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_daily_revenue(INT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_queue_counts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_customers(TEXT, TEXT, TEXT, BOOLEAN, INT, INT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_profile_emails(UUID[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_profile_by_email(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_store_ownership(UUID) TO authenticated, service_role;

-- ── 5. Indexes for the admin lists ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_created       ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created  ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status       ON reviews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_created   ON newsletter_subscribers (created_at DESC);
