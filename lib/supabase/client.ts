/* ══════════════════════════════════════════════════════════════
   Supabase Client – Browser (Client Components)
   Uses the anon key and runs in the browser context.
   ══════════════════════════════════════════════════════════════ */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
