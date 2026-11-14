-- ══════════════════════════════════════════════════════════════
-- Checkout: rate limits for guest-facing lookups (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- Idempotent. Guests can now check out, try promo codes and track
-- an order by number + email. Those endpoints are limited per
-- client (hashed IP) and per target so codes and orders can't be
-- guessed. Fixed windows, counted in one row per key.
--
-- Only the server (service role) may call rate_limit_hit(); the
-- table has RLS on and no policies, so the browser can't read it.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT PRIMARY KEY CHECK (char_length(key) <= 200),
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits         INT NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;

-- Adds p_cost hits to p_key's current window and says whether the
-- call is allowed: true while the window had room before this call.
-- p_cost = 0 only checks (nothing is counted).
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
  v_cost INT := GREATEST(COALESCE(p_cost, 1), 0);
BEGIN
  IF p_key IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit' USING ERRCODE = '22023';
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
