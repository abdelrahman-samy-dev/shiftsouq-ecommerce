/* ══════════════════════════════════════════════════════════════
   Request locale (server only)
   ──────────────────────────────────────────────────────────────
   Reads the NEXT_LOCALE cookie and only ever returns a supported
   locale, so an unexpected cookie value can't break a page.
   ══════════════════════════════════════════════════════════════ */

import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
}
