-- ══════════════════════════════════════════════════════════════
-- ShiftSouq — Security Lockdown SQL Patches
-- ══════════════════════════════════════════════════════════════
-- Run these in the Supabase SQL Editor (Dashboard → SQL Editor)
-- 
-- Contents:
-- 1. C8: Missing INSERT policy for orders (customers can create orders)
-- 2. R10: Fix profiles SELECT policy for authenticated server client
-- 3. R10: Enable the handle_new_user trigger for reliable profile creation
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════
-- C8: Add INSERT policy for orders table
-- ══════════════════════════════════════════════════════════════
-- Without this policy, authenticated users cannot create orders
-- via the Supabase server client (which respects RLS). Currently
-- checkout relies on the service_role client to bypass RLS.
-- This policy lets authenticated users INSERT their own orders.

CREATE POLICY "user_create_order"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- R10: Ensure profiles SELECT policy works for authenticated users
-- ══════════════════════════════════════════════════════════════
-- Check if a SELECT policy exists for authenticated users.
-- If not, create one. This allows the server client (which uses
-- the user's session) to read their own profile without needing
-- the service_role key.

-- First, check existing policies:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If there's no SELECT policy for authenticated users, run:
-- (Skip if "user_read_own_profile" or similar already exists)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'user_read_own_profile'
  ) THEN
    EXECUTE 'CREATE POLICY "user_read_own_profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth_user_id = auth.uid())';
    RAISE NOTICE 'Created user_read_own_profile policy';
  ELSE
    RAISE NOTICE 'user_read_own_profile policy already exists — skipping';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- R10: Enable handle_new_user trigger
-- ══════════════════════════════════════════════════════════════
-- This trigger automatically creates a profile row when a new
-- user signs up via Supabase Auth, eliminating the need for
-- the lazy getProfile() upsert pattern with service_role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'Created on_auth_user_created trigger';
  ELSE
    RAISE NOTICE 'on_auth_user_created trigger already exists — skipping';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after applying patches)
-- ══════════════════════════════════════════════════════════════

-- Check all policies on orders table:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'orders';

-- Check all policies on profiles table:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';

-- Check triggers on auth.users:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
