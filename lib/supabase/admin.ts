/* ══════════════════════════════════════════════════════════════
   Supabase Admin Client – Server-only, cookie-free
   Used for cached/read-only queries that don't need user auth.
   ══════════════════════════════════════════════════════════════ */

import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Returns a singleton Supabase client that does NOT depend on cookies.
 * Safe to use inside `unstable_cache` and other cached contexts.
 * Uses the anon key (public read-only access via RLS).
 */
export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
      {
        auth: { persistSession: false },
      }
    );
  }
  return adminClient;
}
