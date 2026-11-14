-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — search and discovery (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent. Adds:
--   1. normalize_ar(text): one normal form for English and Arabic
--      search text (lowercase, no tashkeel/tatweel, أ إ آ ٱ → ا,
--      ة → ه, ى → ي, ؤ → و, ئ → ي, Persian ی/ک, Arabic digits,
--      punctuation → spaces). lib/search/normalize.ts mirrors it.
--   2. products.search_document, kept up to date by triggers on
--      products, product_variants (colours) and categories (names,
--      parents), with a pg_trgm GIN index.
--   3. size_group(): which size system a size belongs to (clothing,
--      kids, waist, shoes EU, one size), so filters never mix them.
--   4. search_products(): filtered, sorted page of product ids +
--      total, priced on the price buyers pay (lowest variant price
--      after sale price and overrides, as lib/seo/pricing does).
--   5. product_facets(): option counts for the current result set;
--      each facet ignores its own selection.
-- Read-only search functions run as the caller (RLS applies) and
-- are the only new functions anon/authenticated may execute.
-- ══════════════════════════════════════════════════════════════

SET client_encoding = 'UTF8';
SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- ── 1. Text normalisation ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_ar(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
    translate(
      -- tashkeel (harakat, superscript alef, Quranic marks) and tatweel
      regexp_replace(lower(p_text), U&'[\064B-\065F\0670\06D6-\06ED\0640]', '', 'g'),
      -- أ إ آ ٱ ة ى ؤ ئ ی ک, Arabic-Indic and Persian digits
      U&'\0623\0625\0622\0671\0629\0649\0624\0626\06CC\06A9\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9',
      U&'\0627\0627\0627\0627\0647\064A\0648\064A\064A\0643' || '01234567890123456789'
    ),
    -- whitespace, ASCII/Latin-1 punctuation, general punctuation, Arabic punctuation
    U&'[\0001-\002F\003A-\0040\005B-\0060\007B-\00BF\00D7\00F7\2000-\206F\060C\061B\061F\066A-\066D\06D4\FD3E\FD3F]+',
    ' ', 'g'));
$$;

-- Optimal string alignment distance (Levenshtein + adjacent swaps),
-- so "shrit" is one typo away from "shirt".
CREATE OR REPLACE FUNCTION public.search_edit_distance(a text, b text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
DECLARE
  la int := char_length(a);
  lb int := char_length(b);
  w  int := lb + 1;
  d  int[];
  i  int;
  j  int;
  v  int;
  ca text;
  cb text;
BEGIN
  IF la = 0 THEN RETURN lb; END IF;
  IF lb = 0 THEN RETURN la; END IF;
  IF la > 40 OR lb > 40 THEN RETURN greatest(la, lb); END IF;
  d := array_fill(0, ARRAY[(la + 1) * w]);
  FOR i IN 0..la LOOP d[i * w + 1] := i; END LOOP;
  FOR j IN 0..lb LOOP d[j + 1] := j; END LOOP;
  FOR i IN 1..la LOOP
    ca := substr(a, i, 1);
    FOR j IN 1..lb LOOP
      cb := substr(b, j, 1);
      v := least(
        d[(i - 1) * w + j + 1] + 1,                                      -- deletion
        d[i * w + j] + 1,                                                -- insertion
        d[(i - 1) * w + j] + CASE WHEN ca = cb THEN 0 ELSE 1 END         -- substitution
      );
      IF i > 1 AND j > 1 AND ca = substr(b, j - 1, 1) AND substr(a, i - 1, 1) = cb THEN
        v := least(v, d[(i - 2) * w + j - 1] + 1);                       -- transposition
      END IF;
      d[i * w + j + 1] := v;
    END LOOP;
  END LOOP;
  RETURN d[la * w + lb + 1];
END;
$$;

-- ── 2. Size systems ───────────────────────────────────────────
-- The product's size_system is trusted when the value fits it;
-- otherwise the value decides (an "OS" scarf filed as apparel is
-- still one size, a "42" sneaker filed as apparel is a shoe size).
CREATE OR REPLACE FUNCTION public.size_group(p_system text, p_size text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN v = '' THEN NULL
    WHEN v ~ '^(OS|O/S|ONE ?-?SIZE|FREE ?SIZE|FREE|TU|UNI|UNISIZE)$' THEN 'one_size'
    WHEN v ~ '^[0-9]+(\.[0-9]+)? ?(Y|YR|YRS|YEAR|YEARS|M|MO|MOS|MONTH|MONTHS)$'
      OR v ~ '^[0-9]+ ?- ?[0-9]+ ?(Y|YR|YRS|YEARS|M|MONTHS)$' THEN 'kids'
    WHEN v ~ '^([0-9]?X{0,3}S|M|[0-9]?X{0,3}L)(/([0-9]?X{0,3}S|M|[0-9]?X{0,3}L))?$'
      THEN CASE WHEN sys = 'kids' THEN 'kids' ELSE 'apparel' END
    WHEN v ~ '^W?[0-9]{2} ?(/|X|L) ?[0-9]{2}$' THEN 'waist'
    WHEN v ~ '^(EU ?)?[0-9]+(\.[0-9]+)?( ?EU)?$' THEN CASE
      WHEN sys IN ('shoes', 'waist', 'kids') THEN sys
      WHEN v ~ '^EU|EU$' THEN 'shoes'
      WHEN regexp_replace(v, '[^0-9.]', '', 'g')::numeric >= 35 THEN 'shoes'
      ELSE 'waist'
    END
    WHEN sys IN ('apparel', 'kids', 'waist', 'shoes', 'one_size') THEN sys
    ELSE 'apparel'
  END
  FROM (SELECT upper(btrim(COALESCE(p_size, ''))) AS v, COALESCE(p_system, 'apparel') AS sys) s;
$$;

-- p_tokens holds "group.value" (e.g. "shoes.42", "apparel.M") or a bare value.
CREATE OR REPLACE FUNCTION public.size_matches(p_system text, p_size text, p_tokens text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_size IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(p_tokens) AS tok
    WHERE CASE
      WHEN split_part(tok, '.', 1) IN ('apparel', 'kids', 'waist', 'shoes', 'one_size') AND position('.' IN tok) > 0
        THEN public.size_group(p_system, p_size) = split_part(tok, '.', 1)
         AND upper(btrim(p_size)) = upper(btrim(substr(tok, position('.' IN tok) + 1)))
      ELSE upper(btrim(p_size)) = upper(btrim(tok))
    END
  );
$$;

-- ── 3. Search document ────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_document TEXT NOT NULL DEFAULT '';

-- Names (en/ar), brand, tags, category + parent category names and
-- colour names, normalised, each word once.
CREATE OR REPLACE FUNCTION public.build_product_search_document(
  p_product_id uuid,
  p_name_en text,
  p_name_ar text,
  p_brand text,
  p_tags text[],
  p_category_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE cats AS (
    SELECT c.id, c.parent_id, c.name_en, c.name_ar, 1 AS depth
    FROM categories c WHERE c.id = p_category_id
    UNION ALL
    SELECT c.id, c.parent_id, c.name_en, c.name_ar, cats.depth + 1
    FROM categories c JOIN cats ON c.id = cats.parent_id
    WHERE cats.depth < 6
  ),
  doc AS (
    SELECT public.normalize_ar(concat_ws(' ',
      p_name_en, p_name_ar, p_brand, array_to_string(p_tags, ' '),
      (SELECT string_agg(concat_ws(' ', name_en, name_ar), ' ' ORDER BY depth) FROM cats),
      (SELECT string_agg(DISTINCT concat_ws(' ', v.color_en, v.color_ar), ' ')
         FROM product_variants v WHERE v.product_id = p_product_id)
    )) AS text
  )
  SELECT COALESCE((
    SELECT string_agg(w, ' ' ORDER BY first_pos)
    FROM (
      SELECT w, min(pos) AS first_pos
      FROM doc, unnest(string_to_array(doc.text, ' ')) WITH ORDINALITY AS u(w, pos)
      WHERE w <> ''
      GROUP BY w
    ) words
  ), '');
$$;

CREATE OR REPLACE FUNCTION public.products_search_document_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.search_document := public.build_product_search_document(
    NEW.id, NEW.name_en, NEW.name_ar, NEW.brand, NEW.tags, NEW.category_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_document ON products;
CREATE TRIGGER trg_products_search_document
  BEFORE INSERT OR UPDATE OF name_en, name_ar, brand, tags, category_id, search_document ON products
  FOR EACH ROW EXECUTE FUNCTION public.products_search_document_trg();

-- Refreshes the documents of the given products (only rows that change).
CREATE OR REPLACE FUNCTION public.refresh_product_search_documents(p_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE products p
  SET search_document = d.doc
  FROM (
    SELECT p2.id, public.build_product_search_document(p2.id, p2.name_en, p2.name_ar, p2.brand, p2.tags, p2.category_id) AS doc
    FROM products p2 WHERE p2.id = ANY (p_ids)
  ) d
  WHERE p.id = d.id AND p.search_document IS DISTINCT FROM d.doc;
$$;

-- Colours live on variants.
CREATE OR REPLACE FUNCTION public.variants_search_document_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_product_search_documents(ARRAY[NEW.product_id]);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_product_search_documents(ARRAY[OLD.product_id]);
  ELSE
    PERFORM public.refresh_product_search_documents(ARRAY[NEW.product_id, OLD.product_id]);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_variants_search_document ON product_variants;
CREATE TRIGGER trg_variants_search_document
  AFTER INSERT OR DELETE OR UPDATE OF color_en, color_ar, product_id ON product_variants
  FOR EACH ROW EXECUTE FUNCTION public.variants_search_document_trg();

-- Category renames and moves change the documents of every product below.
CREATE OR REPLACE FUNCTION public.categories_search_document_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.refresh_product_search_documents(ARRAY(
    WITH RECURSIVE tree AS (
      SELECT NEW.id AS id
      UNION
      SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
    )
    SELECT p.id FROM products p WHERE p.category_id IN (SELECT id FROM tree)
  ));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_search_document ON categories;
CREATE TRIGGER trg_categories_search_document
  AFTER UPDATE OF name_en, name_ar, parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_search_document_trg();

-- Backfill without touching updated_at (the sitemap reads it).
DO $$
DECLARE
  has_touch boolean := EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.products'::regclass AND tgname = 'trg_products_updated');
BEGIN
  IF has_touch THEN EXECUTE 'ALTER TABLE public.products DISABLE TRIGGER trg_products_updated'; END IF;
  PERFORM public.refresh_product_search_documents(ARRAY(SELECT id FROM public.products));
  IF has_touch THEN EXECUTE 'ALTER TABLE public.products ENABLE TRIGGER trg_products_updated'; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_search_document_trgm
  ON products USING gin (search_document gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_active_created ON products (is_active, created_at DESC);

-- ── 4. Shared search core ─────────────────────────────────────
-- Products in scope (active, optional category tree / collection /
-- new / featured) that match every query token, with relevance and
-- the effective price. Not a public API: search_products() and
-- product_facets() add the buyer's filters on top.
--
-- Token match levels: 3 = word or word prefix (also "shirts" →
-- "shirt", Arabic "ال" ignored), 2 = typo (edit distance 1, or 2 for
-- 7+ letters), 1 = inside a word. Relevance: exact name 5, name
-- prefix 4, else the weakest token level; plus closeness to the name.
CREATE OR REPLACE FUNCTION public.search_product_base(
  p_query text,
  p_scope_category_ids uuid[],
  p_collection_id uuid,
  p_is_new boolean,
  p_featured boolean
)
RETURNS TABLE (
  product_id uuid,
  category_id uuid,
  size_system text,
  rank numeric,
  eff_price numeric,
  base_price numeric,
  on_sale boolean,
  in_stock boolean,
  created_at timestamptz,
  total_orders integer,
  rating numeric,
  is_featured boolean,
  coll_position integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  WITH RECURSIVE
  q AS (
    SELECT left(public.normalize_ar(COALESCE(p_query, '')), 100) AS nq
  ),
  toks AS (
    SELECT t,
           CASE WHEN char_length(t) > 4 THEN regexp_replace(t, '^(وال|بال|كال|فال|ال|لل)', '') ELSE t END AS ts
    FROM (
      SELECT DISTINCT t FROM q, unnest(string_to_array(q.nq, ' ')) AS t WHERE t <> '' LIMIT 8
    ) x
  ),
  ntok AS (SELECT count(*)::int AS n FROM toks),
  scope AS (
    SELECT c.id FROM categories c WHERE c.id = ANY (p_scope_category_ids)
    UNION
    SELECT c.id FROM categories c JOIN scope s ON c.parent_id = s.id
  ),
  prods AS (
    SELECT p.id, p.category_id, p.size_system, p.created_at, p.total_orders, p.rating, p.is_featured,
           p.base_price, p.search_document, p.name_en, p.name_ar, cp.position AS coll_position,
           CASE WHEN p.sale_price > 0 AND p.sale_price < p.base_price THEN p.sale_price ELSE p.base_price END AS pp
    FROM products p
    LEFT JOIN collection_products cp ON cp.collection_id = p_collection_id AND cp.product_id = p.id
    WHERE p.is_active
      AND (p_collection_id IS NULL OR cp.product_id IS NOT NULL)
      AND (p_scope_category_ids IS NULL OR p.category_id IN (SELECT id FROM scope))
      AND (NOT COALESCE(p_is_new, false) OR p.is_new)
      AND (NOT COALESCE(p_featured, false) OR p.is_featured)
  ),
  lex AS (
    SELECT DISTINCT w,
           CASE WHEN char_length(w) > 4 THEN regexp_replace(w, '^(وال|بال|كال|فال|ال|لل)', '') ELSE w END AS ws
    FROM prods, unnest(string_to_array(prods.search_document, ' ')) AS w
    WHERE w <> '' AND (SELECT n FROM ntok) > 0
  ),
  tw AS (
    SELECT t.t, l.w,
      CASE
        WHEN left(l.w, char_length(t.t)) = t.t OR left(l.ws, char_length(t.ts)) = t.ts THEN 3
        WHEN char_length(t.t) > 3 AND (t.t = l.w || 's' OR t.t = l.w || 'es') THEN 3
        WHEN char_length(t.ts) >= 4
             AND abs(char_length(l.ws) - char_length(t.ts)) <= (CASE WHEN char_length(t.ts) >= 7 THEN 2 ELSE 1 END)
             AND levenshtein_less_equal(t.ts, l.ws, 4) <= (CASE WHEN char_length(t.ts) >= 7 THEN 4 ELSE 2 END)
             AND public.search_edit_distance(t.ts, l.ws) <= (CASE WHEN char_length(t.ts) >= 7 THEN 2 ELSE 1 END) THEN 2
        WHEN char_length(t.t) >= 3 AND strpos(l.w, t.t) > 0 THEN 1
      END AS lvl
    FROM toks t CROSS JOIN lex l
  ),
  ptl AS (
    SELECT pr.id, tw.t, max(tw.lvl) AS lvl
    FROM prods pr
    JOIN tw ON tw.lvl IS NOT NULL AND tw.w = ANY (string_to_array(pr.search_document, ' '))
    GROUP BY pr.id, tw.t
  ),
  pl AS (
    SELECT id, min(lvl) AS lvl, count(*)::int AS hits FROM ptl GROUP BY id
  ),
  priced AS (
    SELECT pr.id,
           COALESCE(min(COALESCE(v.price_override, pr.pp)) FILTER (WHERE v.stock > 0),
                    min(COALESCE(v.price_override, pr.pp)),
                    pr.pp) AS eff_price,
           COALESCE(bool_or(v.stock > 0), false) AS in_stock
    FROM prods pr
    LEFT JOIN product_variants v ON v.product_id = pr.id
    GROUP BY pr.id, pr.pp
  ),
  res AS (
    SELECT
      pr.*,
      pc.eff_price,
      pc.in_stock,
      n.n AS ntokens,
      CASE
        WHEN n.n = 0 THEN 0
        WHEN public.normalize_ar(pr.name_en) = q.nq OR public.normalize_ar(pr.name_ar) = q.nq THEN 5
        WHEN left(public.normalize_ar(pr.name_en), char_length(q.nq)) = q.nq
          OR left(public.normalize_ar(pr.name_ar), char_length(q.nq)) = q.nq THEN 4
        ELSE pl.lvl
      END AS tier,
      CASE WHEN n.n = 0 THEN 0
        ELSE word_similarity(q.nq, public.normalize_ar(pr.name_en || ' ' || pr.name_ar))
      END AS closeness
    FROM prods pr
    CROSS JOIN q
    CROSS JOIN ntok n
    JOIN priced pc ON pc.id = pr.id
    LEFT JOIN pl ON pl.id = pr.id
    WHERE n.n = 0 OR pl.hits = n.n
  )
  SELECT
    r.id,
    r.category_id,
    r.size_system,
    (r.tier + 0.9 * r.closeness)::numeric,
    r.eff_price,
    r.base_price,
    r.base_price > 0 AND r.eff_price < r.base_price,
    r.in_stock,
    r.created_at,
    COALESCE(r.total_orders, 0),
    COALESCE(r.rating, 0),
    COALESCE(r.is_featured, false),
    r.coll_position
  FROM res r
  -- Typo matches only when nothing matches as typed ("shirts" finds
  -- shirts, not shorts; "shrit" still finds shirts).
  WHERE r.ntokens = 0 OR r.tier <> 2 OR (SELECT max(tier) FROM res) < 3;
$$;

-- ── 5. Search: a page of product ids + total ──────────────────
-- Sorts: relevance (query relevance, then collection order,
-- featured, newest), newest, price_asc, price_desc (effective
-- price), bestselling, rating.
CREATE OR REPLACE FUNCTION public.search_products(
  p_query text DEFAULT NULL,
  p_scope_category_ids uuid[] DEFAULT NULL,
  p_collection_id uuid DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_sizes text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_in_stock boolean DEFAULT false,
  p_on_sale boolean DEFAULT false,
  p_is_new boolean DEFAULT false,
  p_featured boolean DEFAULT false,
  p_sort text DEFAULT 'relevance',
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  WITH RECURSIVE
  b AS (
    SELECT * FROM public.search_product_base(p_query, p_scope_category_ids, p_collection_id, p_is_new, p_featured)
  ),
  fcat AS (
    SELECT c.id FROM categories c WHERE c.id = ANY (p_category_ids)
    UNION
    SELECT c.id FROM categories c JOIN fcat f ON c.parent_id = f.id
  ),
  f AS (
    SELECT b.*,
      row_number() OVER (ORDER BY
        CASE WHEN p_sort = 'price_asc' THEN b.eff_price END ASC NULLS LAST,
        CASE WHEN p_sort = 'price_desc' THEN b.eff_price END DESC NULLS LAST,
        CASE WHEN p_sort = 'bestselling' THEN b.total_orders END DESC NULLS LAST,
        CASE WHEN p_sort = 'rating' THEN b.rating END DESC NULLS LAST,
        CASE WHEN p_sort = 'newest' THEN b.created_at END DESC NULLS LAST,
        b.rank DESC, b.coll_position ASC NULLS LAST, b.is_featured DESC, b.created_at DESC, b.product_id
      ) AS ord
    FROM b
    WHERE (COALESCE(cardinality(p_category_ids), 0) = 0 OR b.category_id IN (SELECT id FROM fcat))
      AND (p_price_min IS NULL OR b.eff_price >= p_price_min)
      AND (p_price_max IS NULL OR b.eff_price <= p_price_max)
      AND (NOT COALESCE(p_on_sale, false) OR b.on_sale)
      AND (NOT COALESCE(p_in_stock, false) OR b.in_stock)
      AND (
        (COALESCE(cardinality(p_sizes), 0) = 0 AND COALESCE(cardinality(p_colors), 0) = 0)
        OR EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = b.product_id
            AND (COALESCE(cardinality(p_sizes), 0) = 0 OR public.size_matches(b.size_system, v.size, p_sizes))
            AND (COALESCE(cardinality(p_colors), 0) = 0
                 OR lower(btrim(v.color_en)) IN (SELECT lower(btrim(x)) FROM unnest(p_colors) AS x))
            AND (NOT COALESCE(p_in_stock, false) OR v.stock > 0)
        )
      )
  ),
  lim AS (
    SELECT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 100) AS l, GREATEST(COALESCE(p_offset, 0), 0) AS o
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'ids', COALESCE((
      SELECT jsonb_agg(f.product_id ORDER BY f.ord)
      FROM f, lim
      WHERE f.ord > lim.o AND f.ord <= lim.o + lim.l
    ), '[]'::jsonb)
  );
$$;

-- ── 6. Facets for the current result set ──────────────────────
-- Every option in scope is listed (so empty ones can be shown
-- disabled); counts apply all filters except the facet's own.
CREATE OR REPLACE FUNCTION public.product_facets(
  p_query text DEFAULT NULL,
  p_scope_category_ids uuid[] DEFAULT NULL,
  p_collection_id uuid DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_sizes text[] DEFAULT NULL,
  p_colors text[] DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_in_stock boolean DEFAULT false,
  p_on_sale boolean DEFAULT false,
  p_is_new boolean DEFAULT false,
  p_featured boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  WITH RECURSIVE
  b AS (
    SELECT * FROM public.search_product_base(p_query, p_scope_category_ids, p_collection_id, p_is_new, p_featured)
  ),
  fcat AS (
    SELECT c.id FROM categories c WHERE c.id = ANY (p_category_ids)
    UNION
    SELECT c.id FROM categories c JOIN fcat f ON c.parent_id = f.id
  ),
  opts AS (
    SELECT COALESCE(cardinality(p_sizes), 0) > 0 AS by_size,
           COALESCE(cardinality(p_colors), 0) > 0 AS by_color,
           COALESCE(p_in_stock, false) AS by_stock,
           ARRAY(SELECT lower(btrim(x)) FROM unnest(COALESCE(p_colors, '{}'::text[])) AS x) AS colors
  ),
  vars AS (
    SELECT v.product_id, v.size, v.color_en, v.color_ar, v.color_hex, v.stock,
           public.size_group(b.size_system, v.size) AS sgroup,
           (NOT o.by_size OR public.size_matches(b.size_system, v.size, p_sizes)) AS size_ok,
           (NOT o.by_color OR lower(btrim(v.color_en)) = ANY (o.colors)) AS color_ok,
           (NOT o.by_stock OR v.stock > 0) AS stock_ok
    FROM b
    CROSS JOIN opts o
    JOIN product_variants v ON v.product_id = b.product_id
  ),
  flags AS (
    SELECT b.*,
      (COALESCE(cardinality(p_category_ids), 0) = 0 OR b.category_id IN (SELECT id FROM fcat)) AS ok_cat,
      ((p_price_min IS NULL OR b.eff_price >= p_price_min) AND (p_price_max IS NULL OR b.eff_price <= p_price_max)) AS ok_price,
      (NOT COALESCE(p_on_sale, false) OR b.on_sale) AS ok_sale,
      (NOT o.by_stock OR b.in_stock) AS ok_stock,
      (NOT (o.by_size OR o.by_color) OR EXISTS (
        SELECT 1 FROM vars x WHERE x.product_id = b.product_id AND x.size_ok AND x.color_ok AND x.stock_ok
      )) AS ok_var,
      EXISTS (
        SELECT 1 FROM vars x WHERE x.product_id = b.product_id AND x.size_ok AND x.color_ok AND x.stock > 0
      ) AS var_in_stock
    FROM b CROSS JOIN opts o
  ),
  fv AS (
    SELECT x.*, f.ok_cat AND f.ok_price AND f.ok_sale AND f.ok_stock AS ok_rest
    FROM vars x JOIN flags f ON f.product_id = x.product_id
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM flags WHERE ok_cat AND ok_price AND ok_sale AND ok_stock AND ok_var),
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', category_id, 'count', n))
      FROM (
        SELECT category_id, count(*) FILTER (WHERE ok_price AND ok_sale AND ok_stock AND ok_var) AS n
        FROM flags GROUP BY category_id
      ) c
    ), '[]'::jsonb),
    'sizes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('group', sgroup, 'value', label, 'count', n))
      FROM (
        SELECT sgroup,
               mode() WITHIN GROUP (ORDER BY btrim(size)) AS label,
               count(DISTINCT product_id) FILTER (WHERE ok_rest AND color_ok AND stock_ok) AS n
        FROM fv
        WHERE size IS NOT NULL AND btrim(size) <> ''
        GROUP BY sgroup, upper(btrim(size))
      ) s
    ), '[]'::jsonb),
    'colors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name_en', name_en, 'name_ar', name_ar, 'hex', hex, 'count', n) ORDER BY name_en)
      FROM (
        SELECT mode() WITHIN GROUP (ORDER BY btrim(color_en)) AS name_en,
               mode() WITHIN GROUP (ORDER BY btrim(color_ar)) AS name_ar,
               mode() WITHIN GROUP (ORDER BY color_hex) AS hex,
               count(DISTINCT product_id) FILTER (WHERE ok_rest AND size_ok AND stock_ok) AS n
        FROM fv
        WHERE color_en IS NOT NULL AND btrim(color_en) <> ''
        GROUP BY lower(btrim(color_en))
      ) c
    ), '[]'::jsonb),
    'price', (
      SELECT jsonb_build_object(
        'min', min(eff_price),
        'max', max(eff_price),
        'values', COALESCE(jsonb_agg(eff_price ORDER BY eff_price), '[]'::jsonb))
      FROM flags WHERE ok_cat AND ok_sale AND ok_stock AND ok_var
    ),
    'in_stock', (SELECT count(*) FROM flags WHERE ok_cat AND ok_price AND ok_sale AND var_in_stock),
    'on_sale', (SELECT count(*) FROM flags WHERE ok_cat AND ok_price AND ok_stock AND ok_var AND on_sale)
  );
$$;

-- ── 7. Privileges ─────────────────────────────────────────────
-- Internal: only the database (triggers) may call these.
REVOKE ALL ON FUNCTION public.build_product_search_document(uuid, text, text, text, text[], uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_product_search_documents(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.products_search_document_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.variants_search_document_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.categories_search_document_trg() FROM PUBLIC, anon, authenticated;

-- Read-only search functions (run as the caller, RLS applies).
REVOKE ALL ON FUNCTION public.normalize_ar(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_edit_distance(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.size_group(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.size_matches(text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_product_base(text, uuid[], uuid, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_products(text, uuid[], uuid, uuid[], text[], text[], numeric, numeric, boolean, boolean, boolean, boolean, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.product_facets(text, uuid[], uuid, uuid[], text[], text[], numeric, numeric, boolean, boolean, boolean, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_ar(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_edit_distance(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.size_group(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.size_matches(text, text, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_product_base(text, uuid[], uuid, boolean, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_products(text, uuid[], uuid, uuid[], text[], text[], numeric, numeric, boolean, boolean, boolean, boolean, text, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.product_facets(text, uuid[], uuid, uuid[], text[], text[], numeric, numeric, boolean, boolean, boolean, boolean) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
