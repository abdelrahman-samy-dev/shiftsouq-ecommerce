/* ══════════════════════════════════════════════════════════════
   Proxy – Auth Session Refresh & Route Protection
   ──────────────────────────────────────────────────────────────
   Next.js 16 Proxy (formerly middleware) that:
   1. Refreshes the Supabase auth session on every request
      (prevents expired tokens from being used).
   2. Detects locale from cookies / accept-language header.
   3. Protects account routes — redirects visitors to /login with
      a same-site return path (?redirect=/orders/…). Checkout is
      open to guests; /wishlist works without an account too.
   4. Protects admin routes — redirects non-admins to /.
   5. Sends signed-in users away from /login, /register and
      /forgot-password (to their ?redirect= target or /account).

   Design notes:
   - Uses @supabase/ssr createServerClient for cookie-based
     session management inside the proxy.
   - Performs ONLY optimistic (cookie-based) checks — no DB
     queries — to keep proxy fast on every request.
   ══════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { i18n, isValidLocale } from "@/lib/i18n/config";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";

/* ── Route Configuration ─────────────────────────────────────── */

/** Routes that require the user to be logged in (checkout is open to guests) */
const PROTECTED_ROUTES = ["/account", "/orders", "/profile"];

/** Routes that require admin role */
const ADMIN_ROUTES = ["/admin"];

/** Routes that should redirect logged-in users away (to ?redirect= or /account) */
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

/* ── Helper: Check if path starts with any prefix ─────────────── */

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

/* ── Helper: Extract locale from request ──────────────────────── */

function getLocaleFromRequest(request: NextRequest): string {
  // 1. Check cookie first (user's explicit choice)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  // 2. Fall back to accept-language header
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (preferred && isValidLocale(preferred)) return preferred;

  return i18n.defaultLocale;
}

/* ── Main Proxy Handler ───────────────────────────────────────── */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ── 1. Create Supabase client with cookie handling ────────── */
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Session cookies travel over HTTPS only in production (local dev runs on http).
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookie changes to the request (for downstream)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate the response to include cookie changes
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /* ── 2. Refresh the auth session ───────────────────────────── */
  // IMPORTANT: Do NOT use supabase.auth.getSession() — it doesn't
  // refresh the token. Always use getUser() in the proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ── 3. Set locale header ──────────────────────────────────── */
  const locale = getLocaleFromRequest(request);
  supabaseResponse.headers.set("x-locale", locale);

  /* ── 4. Route Protection: Protected routes ─────────────────── */
  if (!user && matchesAny(pathname, PROTECTED_ROUTES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", safeRedirectPath(pathname + request.nextUrl.search, "/account"));
    return NextResponse.redirect(loginUrl);
  }

  /* ── 5. Route Protection: Admin routes ─────────────────────── */
  if (matchesAny(pathname, ADMIN_ROUTES)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Security Note: The actual admin role check is handled by 
    // app/admin/layout.tsx via a strict Database lookup against the 
    // profiles table. The proxy just enforces authentication.
  }

  /* ── 6. Redirect logged-in users from auth pages ───────────── */
  if (user && matchesAny(pathname, AUTH_ROUTES)) {
    const target = safeRedirectPath(request.nextUrl.searchParams.get("redirect"), "/account");
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

/* ── Proxy Config ─────────────────────────────────────────────── */

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets (Screens, icons, images, SVGs)
     * - API routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|Screens|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};