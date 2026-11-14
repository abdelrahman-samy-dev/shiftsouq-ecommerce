-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — Customer checkout: saved delivery address (2026-11-14)
-- ──────────────────────────────────────────────────────────────
-- "Save this address for future orders" at checkout stores the
-- buyer's delivery address on their own profile, so the next
-- checkout is prefilled. Written by the buyer's own session
-- (existing "user_update_profile" RLS policy); nothing else can
-- read it except the owner and admins (existing select policies).
--
-- Shape: {"governorate": "cairo", "city": "...", "address": "...",
--         "apartment": "...", "postalCode": "..."}
--
-- Idempotent: safe to run more than once.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_address JSONB;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_default_address_check
    CHECK (
      default_address IS NULL
      OR (jsonb_typeof(default_address) = 'object' AND pg_column_size(default_address) <= 2048)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN profiles.default_address IS
  'Delivery address saved at checkout: governorate, city, address, apartment, postalCode.';
