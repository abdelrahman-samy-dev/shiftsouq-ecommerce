import "server-only";

/* ══════════════════════════════════════════════════════════════
   Store settings (server) — one row edited by the super admin,
   merged over the brand defaults. Read once per request.
   Writes: app/admin settings (super admin only, RLS-enforced).
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import { DEFAULT_SETTINGS, normalizeSettings, type StoreSettings } from "./types";

export * from "./types";

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const { data, error } = await getPublicClient().from("store_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return normalizeSettings(data as Record<string, unknown> | null);
  } catch (err) {
    console.error("[settings] falling back to defaults:", err instanceof Error ? err.message : err);
    return DEFAULT_SETTINGS;
  }
});
