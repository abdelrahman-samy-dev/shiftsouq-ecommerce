-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — admin catalogue management (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent (ON CONFLICT / OR REPLACE / DROP … IF EXISTS).
-- Run after 20261114010100_store_platform.sql.
--
-- 1. Storage: public bucket "product-images" (8 MB, jpeg/png/webp/
--    avif). Anyone may read; only admins may upload, replace or
--    delete. Uploads use a signed upload URL created on the server
--    after the admin check, so no key ever reaches the browser.
-- 2. Read models for the admin screens (admins only):
--    admin_catalog_products  — one row per product with stock totals
--    admin_catalog_variants  — one row per variant with its product
-- 3. admin_save_product(jsonb): saves a product, its variants and its
--    images in ONE transaction. A failure halfway leaves nothing
--    half-saved. Variants are updated in place (order history stays
--    linked); a variant with open orders is never deleted; a stored
--    Arabic colour name is never wiped; stock the admin did not touch
--    is never overwritten (so sales made meanwhile are kept).
-- 4. admin_set_category_order / admin_set_collection_products:
--    reordering in one statement.
-- All functions run with the caller's rights (SECURITY INVOKER), so
-- row-level security applies, and refuse non-admins outright.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Storage bucket + policies ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 8388608,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

-- ── 2. Read models (admins only) ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants (stock);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products (product_id);

CREATE OR REPLACE VIEW public.admin_catalog_products
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.slug,
  p.name_en,
  p.name_ar,
  p.category_id,
  c.name_en AS category_name_en,
  c.name_ar AS category_name_ar,
  p.base_price,
  p.sale_price,
  p.is_active,
  p.is_featured,
  p.is_new,
  p.created_at,
  p.updated_at,
  (SELECT i.url FROM product_images i
    WHERE i.product_id = p.id
    ORDER BY i.is_primary DESC NULLS LAST, i.sort_order, i.created_at
    LIMIT 1) AS thumbnail_url,
  COALESCE(s.total_stock, 0)::int AS total_stock,
  COALESCE(s.variant_count, 0)::int AS variant_count,
  COALESCE(s.min_stock, 0)::int AS min_stock,
  COALESCE(s.skus, '') AS skus
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT sum(v.stock) AS total_stock, count(*) AS variant_count, min(v.stock) AS min_stock,
         string_agg(v.sku, ' ') AS skus
  FROM product_variants v WHERE v.product_id = p.id
) s ON true
WHERE public.is_admin();

CREATE OR REPLACE VIEW public.admin_catalog_variants
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.product_id,
  v.sku,
  v.size,
  v.color_en,
  v.color_ar,
  v.color_hex,
  COALESCE(v.stock, 0) AS stock,
  v.price_override,
  v.position,
  v.created_at,
  p.name_en AS product_name_en,
  p.name_ar AS product_name_ar,
  p.slug AS product_slug,
  p.is_active AS product_active,
  p.category_id,
  p.base_price,
  p.sale_price,
  COALESCE(
    (SELECT i.url FROM product_images i
      WHERE i.product_id = p.id AND v.color_en IS NOT NULL AND lower(i.color_en) = lower(v.color_en)
      ORDER BY i.sort_order, i.created_at LIMIT 1),
    (SELECT i.url FROM product_images i
      WHERE i.product_id = p.id
      ORDER BY i.is_primary DESC NULLS LAST, i.sort_order, i.created_at LIMIT 1)
  ) AS thumbnail_url
FROM product_variants v
JOIN products p ON p.id = v.product_id
WHERE public.is_admin();

REVOKE ALL ON public.admin_catalog_products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_catalog_variants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_catalog_products TO authenticated;
GRANT SELECT ON public.admin_catalog_variants TO authenticated;

-- ── 3. Save a product with its variants and images ────────────
-- Payload (validated on the server first):
-- {
--   "id": uuid | null,                       -- null = new product
--   "expected_updated_at": timestamptz|null, -- refuse if someone saved meanwhile
--   "product":  { name_en, name_ar, slug, category_id, brand, tags[], description_en, description_ar,
--                 details_en, details_ar, care_en, care_ar, base_price, sale_price, size_system,
--                 seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
--                 is_active, is_featured, is_new },
--   "variants": [ { id|null, sku, size, color_en, color_ar, color_hex, stock, stock_loaded|null,
--                   price_override, position } ],
--   "images":   [ { id|null, url, color_en, alt_text_en, alt_text_ar, sort_order, is_primary } ]
-- }
-- Returns { "id", "slug", "removed_image_urls": [...] }.
-- Errors are raised with a short key as the message (P0001):
--   not_found, changed, variant_has_open_orders, stock_changed, duplicate_slug, duplicate_sku, category
CREATE OR REPLACE FUNCTION public.admin_save_product(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id        uuid := NULLIF(p_payload->>'id', '')::uuid;
  v_p         jsonb := COALESCE(p_payload->'product', '{}'::jsonb);
  v_expected  timestamptz := NULLIF(p_payload->>'expected_updated_at', '')::timestamptz;
  v_slug      text;
  v_current   timestamptz;
  v_keep_var  uuid[];
  v_drop_var  uuid[];
  v_keep_img  uuid[];
  v_removed   text[];
  v_row       jsonb;
  v_vid       uuid;
  v_old       product_variants%ROWTYPE;
  v_stock     int;
  v_loaded    int;
  v_constraint text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  BEGIN
    -- Product row
    IF v_id IS NULL THEN
      INSERT INTO products (
        name_en, name_ar, slug, category_id, brand, tags,
        description_en, description_ar, details_en, details_ar, care_en, care_ar,
        base_price, sale_price, size_system,
        seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
        is_active, is_featured, is_new
      ) VALUES (
        v_p->>'name_en', v_p->>'name_ar', v_p->>'slug', (v_p->>'category_id')::uuid, NULLIF(v_p->>'brand', ''),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_p->'tags', '[]'::jsonb))), '{}'),
        NULLIF(v_p->>'description_en', ''), NULLIF(v_p->>'description_ar', ''),
        NULLIF(v_p->>'details_en', ''), NULLIF(v_p->>'details_ar', ''),
        NULLIF(v_p->>'care_en', ''), NULLIF(v_p->>'care_ar', ''),
        (v_p->>'base_price')::numeric, NULLIF(v_p->>'sale_price', '')::numeric,
        COALESCE(NULLIF(v_p->>'size_system', ''), 'apparel'),
        NULLIF(v_p->>'seo_title_en', ''), NULLIF(v_p->>'seo_title_ar', ''),
        NULLIF(v_p->>'seo_description_en', ''), NULLIF(v_p->>'seo_description_ar', ''),
        COALESCE((v_p->>'is_active')::boolean, false),
        COALESCE((v_p->>'is_featured')::boolean, false),
        COALESCE((v_p->>'is_new')::boolean, false)
      )
      RETURNING id, slug INTO v_id, v_slug;
    ELSE
      SELECT updated_at INTO v_current FROM products WHERE id = v_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
      END IF;
      IF v_expected IS NOT NULL AND v_current IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'changed' USING ERRCODE = 'P0001';
      END IF;

      UPDATE products SET
        name_en = v_p->>'name_en',
        name_ar = v_p->>'name_ar',
        slug = v_p->>'slug',
        category_id = (v_p->>'category_id')::uuid,
        brand = NULLIF(v_p->>'brand', ''),
        tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_p->'tags', '[]'::jsonb))), '{}'),
        description_en = NULLIF(v_p->>'description_en', ''),
        description_ar = NULLIF(v_p->>'description_ar', ''),
        details_en = NULLIF(v_p->>'details_en', ''),
        details_ar = NULLIF(v_p->>'details_ar', ''),
        care_en = NULLIF(v_p->>'care_en', ''),
        care_ar = NULLIF(v_p->>'care_ar', ''),
        base_price = (v_p->>'base_price')::numeric,
        sale_price = NULLIF(v_p->>'sale_price', '')::numeric,
        size_system = COALESCE(NULLIF(v_p->>'size_system', ''), 'apparel'),
        seo_title_en = NULLIF(v_p->>'seo_title_en', ''),
        seo_title_ar = NULLIF(v_p->>'seo_title_ar', ''),
        seo_description_en = NULLIF(v_p->>'seo_description_en', ''),
        seo_description_ar = NULLIF(v_p->>'seo_description_ar', ''),
        is_active = COALESCE((v_p->>'is_active')::boolean, is_active),
        is_featured = COALESCE((v_p->>'is_featured')::boolean, is_featured),
        is_new = COALESCE((v_p->>'is_new')::boolean, is_new)
      WHERE id = v_id
      RETURNING slug INTO v_slug;
    END IF;

    -- Variants: which existing ones stay, which go
    SELECT COALESCE(array_agg(pv.id), '{}') INTO v_keep_var
    FROM product_variants pv
    WHERE pv.product_id = v_id
      AND pv.id IN (
        SELECT NULLIF(e->>'id', '')::uuid FROM jsonb_array_elements(COALESCE(p_payload->'variants', '[]'::jsonb)) e
      );

    SELECT COALESCE(array_agg(pv.id), '{}') INTO v_drop_var
    FROM product_variants pv
    WHERE pv.product_id = v_id AND NOT (pv.id = ANY (v_keep_var));

    IF cardinality(v_drop_var) > 0 THEN
      IF EXISTS (
        SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_variant_id = ANY (v_drop_var)
          AND o.status::text IN ('pending', 'confirmed', 'processing', 'shipped')
      ) THEN
        RAISE EXCEPTION 'variant_has_open_orders' USING ERRCODE = 'P0001';
      END IF;
      DELETE FROM product_variants WHERE id = ANY (v_drop_var);
    END IF;

    -- Park the SKUs of kept variants so two variants can swap SKUs.
    UPDATE product_variants SET sku = '~' || id::text WHERE id = ANY (v_keep_var);

    FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'variants', '[]'::jsonb))
    LOOP
      v_vid := NULLIF(v_row->>'id', '')::uuid;
      v_stock := GREATEST(COALESCE((v_row->>'stock')::int, 0), 0);
      IF v_vid IS NOT NULL AND v_vid = ANY (v_keep_var) THEN
        SELECT * INTO v_old FROM product_variants WHERE id = v_vid FOR UPDATE;
        v_loaded := NULLIF(v_row->>'stock_loaded', '')::int;
        -- Stock: only written when the admin changed it; refused if it moved meanwhile.
        IF v_loaded IS NOT NULL AND v_stock <> v_loaded AND COALESCE(v_old.stock, 0) <> v_loaded THEN
          RAISE EXCEPTION 'stock_changed' USING ERRCODE = 'P0001';
        END IF;
        UPDATE product_variants SET
          sku = v_row->>'sku',
          size = NULLIF(v_row->>'size', ''),
          color_en = NULLIF(v_row->>'color_en', ''),
          -- Never wipe a stored Arabic colour name with a blank.
          color_ar = COALESCE(NULLIF(v_row->>'color_ar', ''), CASE WHEN NULLIF(v_row->>'color_en', '') IS NULL THEN NULL ELSE v_old.color_ar END),
          color_hex = COALESCE(NULLIF(v_row->>'color_hex', ''), CASE WHEN NULLIF(v_row->>'color_en', '') IS NULL THEN NULL ELSE v_old.color_hex END),
          stock = CASE WHEN v_loaded IS NOT NULL AND v_stock = v_loaded THEN stock ELSE v_stock END,
          price_override = NULLIF(v_row->>'price_override', '')::numeric,
          position = COALESCE((v_row->>'position')::int, 0)
        WHERE id = v_vid;
      ELSE
        INSERT INTO product_variants (product_id, sku, size, color_en, color_ar, color_hex, stock, price_override, position)
        VALUES (
          v_id, v_row->>'sku', NULLIF(v_row->>'size', ''), NULLIF(v_row->>'color_en', ''),
          NULLIF(v_row->>'color_ar', ''), NULLIF(v_row->>'color_hex', ''), v_stock,
          NULLIF(v_row->>'price_override', '')::numeric, COALESCE((v_row->>'position')::int, 0)
        );
      END IF;
    END LOOP;

    -- Images
    SELECT COALESCE(array_agg(pi.id), '{}') INTO v_keep_img
    FROM product_images pi
    WHERE pi.product_id = v_id
      AND pi.id IN (
        SELECT NULLIF(e->>'id', '')::uuid FROM jsonb_array_elements(COALESCE(p_payload->'images', '[]'::jsonb)) e
      );

    WITH gone AS (
      DELETE FROM product_images WHERE product_id = v_id AND NOT (id = ANY (v_keep_img)) RETURNING url
    )
    SELECT COALESCE(array_agg(url), '{}') INTO v_removed FROM gone;

    FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'images', '[]'::jsonb))
    LOOP
      v_vid := NULLIF(v_row->>'id', '')::uuid;
      IF v_vid IS NOT NULL AND v_vid = ANY (v_keep_img) THEN
        UPDATE product_images SET
          url = v_row->>'url',
          color_en = NULLIF(v_row->>'color_en', ''),
          alt_text_en = NULLIF(v_row->>'alt_text_en', ''),
          alt_text_ar = NULLIF(v_row->>'alt_text_ar', ''),
          sort_order = COALESCE((v_row->>'sort_order')::int, 0),
          is_primary = COALESCE((v_row->>'is_primary')::boolean, false)
        WHERE id = v_vid;
      ELSE
        INSERT INTO product_images (product_id, url, color_en, alt_text_en, alt_text_ar, sort_order, is_primary)
        VALUES (
          v_id, v_row->>'url', NULLIF(v_row->>'color_en', ''), NULLIF(v_row->>'alt_text_en', ''),
          NULLIF(v_row->>'alt_text_ar', ''), COALESCE((v_row->>'sort_order')::int, 0),
          COALESCE((v_row->>'is_primary')::boolean, false)
        );
      END IF;
    END LOOP;

    -- Exactly one primary image (the first one when none was chosen).
    IF EXISTS (SELECT 1 FROM product_images WHERE product_id = v_id)
       AND (SELECT count(*) FROM product_images WHERE product_id = v_id AND is_primary) <> 1 THEN
      UPDATE product_images SET is_primary = (id = (
        SELECT id FROM product_images WHERE product_id = v_id
        ORDER BY is_primary DESC NULLS LAST, sort_order, created_at LIMIT 1
      ))
      WHERE product_id = v_id;
    END IF;

  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      RAISE EXCEPTION '%', CASE
        WHEN v_constraint = 'products_slug_key' THEN 'duplicate_slug'
        WHEN v_constraint = 'product_variants_sku_key' THEN 'duplicate_sku'
        ELSE 'duplicate' END
      USING ERRCODE = 'P0001';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'category' USING ERRCODE = 'P0001';
  END;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug, 'removed_image_urls', to_jsonb(v_removed));
END;
$$;

-- ── 4. Reordering helpers ─────────────────────────────────────
-- Sets sort_order = position in the list (1-based) for the given categories.
CREATE OR REPLACE FUNCTION public.admin_set_category_order(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  UPDATE categories c SET sort_order = o.pos
  FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
  WHERE c.id = o.id;
END;
$$;

-- Replaces a collection's products with the given list, in that order.
CREATE OR REPLACE FUNCTION public.admin_set_collection_products(p_collection uuid, p_products uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM collections WHERE id = p_collection) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM collection_products WHERE collection_id = p_collection AND NOT (product_id = ANY (p_products));
  INSERT INTO collection_products (collection_id, product_id, position)
  SELECT p_collection, o.id, o.pos::int
  FROM unnest(p_products) WITH ORDINALITY AS o(id, pos)
  JOIN products p ON p.id = o.id
  ON CONFLICT (collection_id, product_id) DO UPDATE SET position = EXCLUDED.position;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_product(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_category_order(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_collection_products(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_category_order(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_collection_products(uuid, uuid[]) TO authenticated, service_role;
