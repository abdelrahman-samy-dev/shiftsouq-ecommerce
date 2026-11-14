import "server-only";

/* ══════════════════════════════════════════════════════════════
   Supabase service-role client — server only
   ──────────────────────────────────────────────────────────────
   Bypasses RLS. Use it only after the caller has been
   authenticated / authorised in server code, and only for the
   operations that need it (creating orders, payment updates).

   There is deliberately no fallback to the anon key: if the
   service key is missing, the operation fails loudly instead of
   silently running with the wrong privileges.
   ══════════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export class ServiceConfigError extends Error {}

export function getServiceClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ServiceConfigError("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not configured.");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
