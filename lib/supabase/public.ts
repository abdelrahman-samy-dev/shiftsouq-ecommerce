/* ══════════════════════════════════════════════════════════════
   Supabase Public Client – Cookie-free, server-safe
   
   A standard @supabase/supabase-js client using ONLY the
   public env vars. No cookies, no SSR auth, no dynamic context.
   Safe to call from any server component or cached function.
   ══════════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for public, read-only queries.
 * Does NOT touch cookies or headers — fully static-safe.
 */
export function getPublicClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
      }
    );
  }
  return _client;
}
