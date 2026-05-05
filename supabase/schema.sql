-- ============================================================
-- ShiftSouq – Production Database Schema (DDL)
-- Run this FIRST in Supabase SQL Editor, then run seed.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Enums
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('customer', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE discount_type AS ENUM ('percentage', 'fixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          user_role DEFAULT 'customer',
  phone         TEXT,
  country       TEXT,
  city          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── STORES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description_en  TEXT,
  description_ar  TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  rating          NUMERIC(3,2) DEFAULT 0.00,
  total_orders    INT DEFAULT 0,
  address         TEXT,
  phone           TEXT,
  operating_hours JSONB DEFAULT '{"mon_fri":"10:00-20:00","sat_sun":"11:00-18:00"}'::jsonb,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── CATEGORIES (self-ref, bilingual) ──────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description_en  TEXT,
  description_ar  TEXT,
  image_url       TEXT,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PRODUCTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  store_id        UUID REFERENCES stores(id) ON DELETE SET NULL,
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description_en  TEXT,
  description_ar  TEXT,
  base_price      NUMERIC(10,2) NOT NULL,
  sale_price      NUMERIC(10,2),
  brand           TEXT,
  rating          NUMERIC(3,2) DEFAULT 0.00,
  review_count    INT DEFAULT 0,
  total_orders    INT DEFAULT 0,
  is_featured     BOOLEAN DEFAULT false,
  is_new          BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PRODUCT VARIANTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size            TEXT,
  color_en        TEXT,
  color_ar        TEXT,
  color_hex       TEXT,
  sku             TEXT NOT NULL UNIQUE,
  stock           INT DEFAULT 0,
  price_override  NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PRODUCT IMAGES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  alt_text_en   TEXT,
  alt_text_ar   TEXT,
  is_primary    BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── CART ITEMS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity            INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_variant_id)
);

-- ── WISHLIST ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ── PROMOCODES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promocodes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT NOT NULL UNIQUE,
  discount_type    discount_type NOT NULL DEFAULT 'percentage',
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses         INT,
  current_uses     INT DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── ORDERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_number      TEXT NOT NULL UNIQUE,
  status            order_status DEFAULT 'pending',
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(10,2) DEFAULT 0,
  shipping_cost     NUMERIC(10,2) DEFAULT 0,
  tax_amount        NUMERIC(10,2) DEFAULT 0,
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,
  promocode_id      UUID REFERENCES promocodes(id) ON DELETE SET NULL,
  shipping_name     TEXT,
  shipping_phone    TEXT,
  shipping_email    TEXT,
  shipping_country  TEXT,
  shipping_city     TEXT,
  shipping_address  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name        TEXT NOT NULL,
  variant_label       TEXT,
  unit_price          NUMERIC(10,2) NOT NULL,
  quantity            INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  image_url           TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── REVIEWS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_auth     ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_owner      ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug       ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store    ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products(base_price);
CREATE INDEX IF NOT EXISTS idx_variants_product  ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku      ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_images_product    ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_primary    ON product_images(product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_cart_user         ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user     ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number     ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user      ON reviews(user_id);

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "pub_read_categories"  ON categories      FOR SELECT USING (true);
CREATE POLICY "pub_read_products"    ON products         FOR SELECT USING (is_active = true);
CREATE POLICY "pub_read_variants"    ON product_variants FOR SELECT USING (true);
CREATE POLICY "pub_read_images"      ON product_images   FOR SELECT USING (true);
CREATE POLICY "pub_read_stores"      ON stores           FOR SELECT USING (is_active = true);
CREATE POLICY "pub_read_reviews"     ON reviews          FOR SELECT USING (true);

-- Profile policies
CREATE POLICY "user_read_profile"    ON profiles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "user_update_profile"  ON profiles FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- Cart policies
CREATE POLICY "user_cart" ON cart_items FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Wishlist policies
CREATE POLICY "user_wishlist" ON wishlist FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Order policies
CREATE POLICY "user_read_orders" ON orders FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "user_read_order_items" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())));

-- Review policies
CREATE POLICY "user_create_review" ON reviews FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "user_delete_review" ON reviews FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Promocode policies
CREATE POLICY "auth_read_promos" ON promocodes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Admin helper function (SECURITY DEFINER bypasses RLS — prevents recursion)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Admin override policies
CREATE POLICY "admin_profiles"    ON profiles         FOR ALL USING (is_admin());
CREATE POLICY "admin_categories"  ON categories       FOR ALL USING (is_admin());
CREATE POLICY "admin_products"    ON products         FOR ALL USING (is_admin());
CREATE POLICY "admin_variants"    ON product_variants FOR ALL USING (is_admin());
CREATE POLICY "admin_images"      ON product_images   FOR ALL USING (is_admin());
CREATE POLICY "admin_stores"      ON stores           FOR ALL USING (is_admin());
CREATE POLICY "admin_orders"      ON orders           FOR ALL USING (is_admin());
CREATE POLICY "admin_order_items" ON order_items      FOR ALL USING (is_admin());
CREATE POLICY "admin_promos"      ON promocodes       FOR ALL USING (is_admin());
CREATE POLICY "admin_reviews"     ON reviews          FOR ALL USING (is_admin());

-- ── TRIGGERS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_stores_updated   BEFORE UPDATE ON stores   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'avatar_url',''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment after verifying in Supabase:
-- CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
