-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — store platform (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent. Adds what a professional, white-label store needs:
--   1. Roles: super admin (owner) vs admin (staff); only the
--      super admin can change roles.
--   2. Catalogue: richer product content, colour-specific images,
--      size systems, SEO fields, category flags, collections.
--   3. Store settings (one row) edited by the super admin:
--      announcement, contact, social, shipping, payments, home.
--   4. Reviews with moderation and verified-purchase flag;
--      product rating kept in sync.
--   5. Customer address book, newsletter, admin audit log.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Roles ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid() AND role::text IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid() AND role::text = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;

-- Only the super admin (or the server / SQL editor) may change roles or account links.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') IN ('anon', 'authenticated') AND NOT public.is_super_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
    ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Not allowed to change role or account link' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- The first admin who can sign in becomes the store owner (only if there is no owner yet).
UPDATE profiles SET role = 'super_admin'
WHERE id = (
    SELECT id FROM profiles
    WHERE role::text = 'admin' AND auth_user_id IS NOT NULL
    ORDER BY created_at LIMIT 1
  )
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE role::text = 'super_admin' AND auth_user_id IS NOT NULL);

-- ── 2. Catalogue ──────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS details_en TEXT;          -- bullet points, one per line
ALTER TABLE products ADD COLUMN IF NOT EXISTS details_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_system TEXT NOT NULL DEFAULT 'apparel';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description_ar TEXT;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_size_system_check
    CHECK (size_system IN ('apparel', 'shoes', 'kids', 'waist', 'one_size'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_prices_check
    CHECK (base_price >= 0 AND (sale_price IS NULL OR sale_price >= 0));
EXCEPTION WHEN duplicate_object OR check_violation THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin (tags);

-- Images can belong to one colour (NULL = shown for every colour).
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color_en TEXT;

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "pub_read_categories" ON categories;
CREATE POLICY "pub_read_categories" ON categories FOR SELECT USING (is_active OR public.is_admin());

-- Collections: curated product sets for the home page and campaigns.
CREATE TABLE IF NOT EXISTS collections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  title_en       TEXT NOT NULL,
  title_ar       TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  image_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pub_read_collections" ON collections;
CREATE POLICY "pub_read_collections" ON collections FOR SELECT USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "admin_collections" ON collections;
CREATE POLICY "admin_collections" ON collections FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pub_read_collection_products" ON collection_products;
CREATE POLICY "pub_read_collection_products" ON collection_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_collection_products" ON collection_products;
CREATE POLICY "admin_collection_products" ON collection_products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 3. Store settings (single row) ────────────────────────────
CREATE TABLE IF NOT EXISTS store_settings (
  id           SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- [{ "en": "...", "ar": "..." }]
  announcement JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- { "email", "phone", "whatsapp", "address_en", "address_ar", "hours_en", "hours_ar" }
  contact      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "instagram", "facebook", "tiktok", "x" }
  social       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "default_fee": 100, "free_threshold": 1500, "zones": { "cairo": 50, ... }, "eta_days": { "min": 2, "max": 5 } }
  shipping     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "cod": true, "card": true, "wallet": true }
  payments     JSONB NOT NULL DEFAULT '{"cod": true, "card": true, "wallet": true}'::jsonb,
  -- { "return_days": 14 }
  policies     JSONB NOT NULL DEFAULT '{"return_days": 14}'::jsonb,
  -- { "hero": { "image", "title_en", "title_ar", "subtitle_en", "subtitle_ar", "cta_href" } }
  home         JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "low_stock_threshold": 5 }
  inventory    JSONB NOT NULL DEFAULT '{"low_stock_threshold": 5}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pub_read_settings" ON store_settings;
CREATE POLICY "pub_read_settings" ON store_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "owner_update_settings" ON store_settings;
CREATE POLICY "owner_update_settings" ON store_settings FOR UPDATE
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ── 4. Reviews: moderation + verified purchase ────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_size_check
    CHECK (char_length(COALESCE(title, '')) <= 120 AND char_length(COALESCE(comment, '')) <= 2000);
EXCEPTION WHEN duplicate_object OR check_violation THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_product ON reviews(user_id, product_id);

-- Visitors see approved reviews; authors see their own; admins see all.
DROP POLICY IF EXISTS "pub_read_reviews" ON reviews;
CREATE POLICY "pub_read_reviews" ON reviews FOR SELECT USING (
  status = 'approved'
  OR user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  OR public.is_admin()
);

-- Customers may only create pending, unverified reviews (the server sets is_verified).
CREATE OR REPLACE FUNCTION public.guard_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    NEW.status := 'pending';
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := false;
    ELSE
      NEW.is_verified := OLD.is_verified;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_guard ON reviews;
CREATE TRIGGER trg_reviews_guard BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_fields();

-- products.rating / review_count follow approved reviews.
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products p SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 2) FROM reviews r WHERE r.product_id = pid AND r.status = 'approved'), 0),
    review_count = (SELECT count(*) FROM reviews r WHERE r.product_id = pid AND r.status = 'approved')
  WHERE p.id = pid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_rating ON reviews;
CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

-- ── 5a. Customer address book ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label        TEXT,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  governorate  TEXT NOT NULL,
  city         TEXT NOT NULL,
  address      TEXT NOT NULL,
  apartment    TEXT,
  postal_code  TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(full_name) <= 120 AND char_length(address) <= 240 AND char_length(phone) <= 20)
);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_addresses_default ON user_addresses(user_id) WHERE is_default;

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_addresses" ON user_addresses;
CREATE POLICY "own_addresses" ON user_addresses FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "admin_read_addresses" ON user_addresses;
CREATE POLICY "admin_read_addresses" ON user_addresses FOR SELECT USING (public.is_admin());

-- ── 5b. Newsletter ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  locale     TEXT NOT NULL DEFAULT 'en',
  source     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  CHECK (char_length(email) <= 254)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_email ON newsletter_subscribers(lower(email));

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- Sign-ups go through a server action with the service key; only admins read the list.
DROP POLICY IF EXISTS "admin_newsletter" ON newsletter_subscribers;
CREATE POLICY "admin_newsletter" ON newsletter_subscribers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5c. Admin audit log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,          -- e.g. "order.status", "product.update", "settings.update"
  entity     TEXT NOT NULL,          -- table / kind
  entity_id  TEXT,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_audit" ON audit_log;
CREATE POLICY "admin_read_audit" ON audit_log FOR SELECT USING (public.is_admin());
-- Rows are written by the server (service key) after it has verified the admin.
