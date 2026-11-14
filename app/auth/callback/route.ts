/* ══════════════════════════════════════════════════════════════
   GET /auth/callback — links from auth emails land here
   ──────────────────────────────────────────────────────────────
   Password reset (and email confirmation) links come back with
   either a PKCE `code` (default Supabase emails: exchanged with
   the verifier cookie this browser got when it asked for the
   link) or a `token_hash` + `type` (custom email templates; works
   in any browser). Either way the buyer leaves with a session
   cookie and is sent to `next` — a same-site path only.

   A reset link also leaves a short-lived httpOnly marker
   (RECOVERY_COOKIE = the user's id): /reset-password only lets a
   password be set without the current one when it is present, so
   an open session alone can't change the password.
   ══════════════════════════════════════════════════════════════ */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { RECOVERY_COOKIE } from "@/lib/validations/auth";

const OTP_TYPES: readonly EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email_change", "email"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"), "/account");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const isReset = next.startsWith("/reset-password") || type === "recovery";

  const supabase = await createServerClient();
  let ok = false;
  let userId: string | null = null;
  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
      userId = data.user?.id ?? null;
    } else if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      ok = !error;
      userId = data.user?.id ?? null;
    }
  } catch (err) {
    console.error("[auth/callback]", err);
    ok = false;
  }

  const target = ok ? next : isReset ? "/forgot-password?link=expired" : "/login?link=expired";
  const res = NextResponse.redirect(new URL(target, url.origin), 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  if (ok && isReset && userId) {
    res.cookies.set(RECOVERY_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60,
      path: "/",
    });
  }
  return res;
}
