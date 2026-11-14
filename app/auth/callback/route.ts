/* ══════════════════════════════════════════════════════════════
   GET /auth/callback — links from auth emails land here
   ──────────────────────────────────────────────────────────────
   Password reset (and email confirmation) links come back with a
   PKCE `code`, exchanged with the verifier cookie this browser got
   when it asked for the link. Only PKCE is accepted: a bare
   `token_hash` link would sign in whoever opens it as the account
   that link was made for (login CSRF), so it is not handled here.
   The buyer leaves with a session cookie and is sent to `next` —
   a same-site path only.

   A password-reset session (sign-in method "recovery", read from
   the session itself — not from `next`, which anyone can set)
   also gets a short-lived, signed httpOnly marker (RECOVERY_COOKIE,
   see lib/auth/recovery-cookie.ts): /reset-password only lets a
   password be set without the current one while it is valid, so
   an open session alone can't change the password.
   ══════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { RECOVERY_COOKIE } from "@/lib/validations/auth";
import { isRecoverySession, recoveryCookieValue, RECOVERY_TTL_SECONDS } from "@/lib/auth/recovery-cookie";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"), "/account");
  const code = url.searchParams.get("code");
  const askedForReset = next.startsWith("/reset-password");

  const supabase = await createServerClient();
  let ok = false;
  let recovery = false;
  let userId: string | null = null;
  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error && !!data.session;
      userId = data.user?.id ?? null;
      recovery = ok && isRecoverySession(data.session?.access_token);
    }
  } catch (err) {
    console.error("[auth/callback]", err);
    ok = false;
  }

  // A reset link always opens the new-password page; other links never get the marker.
  const target = ok ? (recovery ? "/reset-password" : next) : askedForReset ? "/forgot-password?link=expired" : "/login?link=expired";
  const res = NextResponse.redirect(new URL(target, url.origin), 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  if (ok && recovery && userId) {
    try {
      res.cookies.set(RECOVERY_COOKIE, recoveryCookieValue(userId), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: RECOVERY_TTL_SECONDS,
        path: "/",
      });
    } catch (err) {
      console.error("[auth/callback] recovery marker:", err instanceof Error ? err.message : err);
    }
  } else if (ok) {
    // Any other sign-in link ends an earlier reset window in this browser.
    res.cookies.delete(RECOVERY_COOKIE);
  }
  return res;
}
