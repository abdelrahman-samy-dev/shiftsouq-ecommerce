"use server";

/* ══════════════════════════════════════════════════════════════
   Server Function — switch the interface language
   ──────────────────────────────────────────────────────────────
   Called by the language switcher. Writing the cookie here (and
   not with document.cookie) keeps one definition of the cookie
   options; the client then refreshes the router so every Server
   Component re-renders in the new language without a reload.
   ══════════════════════════════════════════════════════════════ */

import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { isValidLocale, LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS } from "./config";

export async function setLocaleAction(locale: string): Promise<{ locale: Locale } | { error: string }> {
  if (!isValidLocale(locale)) {
    return { error: "Unsupported locale" };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  return { locale };
}
