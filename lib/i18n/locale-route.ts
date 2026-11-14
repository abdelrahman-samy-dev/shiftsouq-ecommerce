/* ══════════════════════════════════════════════════════════════
   GET /ar and GET /en — shareable language-switch links
   ──────────────────────────────────────────────────────────────
   Sets the NEXT_LOCALE cookie (1 year, SameSite=Lax) and
   redirects to `?next=` when it is a safe relative path on this
   site, otherwise to the home page.
   ══════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from "next/server";
import type { Locale } from "@/lib/types";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, i18n } from "./config";
import { safeRedirectPath } from "./safe-redirect";

/** Paths that would bounce straight back here (/ar → /ar → …). */
const LOCALE_PATHS = new Set(i18n.locales.map((l) => `/${l}`));

export function createLocaleSwitchHandler(locale: Locale) {
  return function GET(request: NextRequest) {
    let next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
    const nextPath = next.split(/[?#]/)[0].replace(/\/+$/, "");
    if (LOCALE_PATHS.has(nextPath)) next = "/";

    const response = NextResponse.redirect(new URL(next, request.nextUrl.origin), 307);
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
    // The answer depends on the query string and sets a cookie: never cache it.
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}
