-- ══════════════════════════════════════════════════════════════
-- Orders: Arabic item names, and promo uses returned on cancel.
-- Idempotent.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Arabic product name / variant label on order lines ─────
-- place_order() stores the English name; this trigger adds the
-- Arabic one from the catalogue at the moment of purchase, so
-- receipts stay correct even if the product is renamed later.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name_ar TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label_ar TEXT;

CREATE OR REPLACE FUNCTION public.fill_order_item_arabic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_ar TEXT;
  v_size    TEXT;
  v_color   TEXT;
BEGIN
  IF NEW.product_variant_id IS NOT NULL AND (NEW.product_name_ar IS NULL OR NEW.variant_label_ar IS NULL) THEN
    SELECT p.name_ar, v.size, COALESCE(v.color_ar, v.color_en)
      INTO v_name_ar, v_size, v_color
      FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.id = NEW.product_variant_id;
    NEW.product_name_ar  := COALESCE(NEW.product_name_ar, v_name_ar);
    NEW.variant_label_ar := COALESCE(NEW.variant_label_ar, NULLIF(concat_ws(' / ', v_size, v_color), ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_arabic ON order_items;
CREATE TRIGGER trg_order_items_arabic BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION public.fill_order_item_arabic();

-- Backfill existing lines (only where the variant still exists).
UPDATE order_items oi
   SET product_name_ar  = COALESCE(oi.product_name_ar, p.name_ar),
       variant_label_ar = COALESCE(oi.variant_label_ar, NULLIF(concat_ws(' / ', v.size, COALESCE(v.color_ar, v.color_en)), ''))
  FROM product_variants v JOIN products p ON p.id = v.product_id
 WHERE v.id = oi.product_variant_id
   AND (oi.product_name_ar IS NULL OR oi.variant_label_ar IS NULL);

-- ── 2. Give the promo use back when an order is cancelled ─────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_released BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.release_promo_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.promocode_id IS NOT NULL AND NOT NEW.promo_released THEN
    UPDATE promocodes SET current_uses = GREATEST(COALESCE(current_uses, 0) - 1, 0) WHERE id = NEW.promocode_id;
    NEW.promo_released := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_promo ON orders;
CREATE TRIGGER trg_orders_release_promo BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION public.release_promo_on_cancel();

REVOKE ALL ON FUNCTION public.fill_order_item_arabic() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_promo_on_cancel() FROM PUBLIC, anon, authenticated;
