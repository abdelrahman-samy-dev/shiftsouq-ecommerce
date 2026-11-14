"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions – Authentication
   ──────────────────────────────────────────────────────────────
   Sign in, create an account, sign out, forgotten password and
   setting a new password from a reset link (Supabase Auth).
   Each action validates input with zod before calling the API.

   • Failures return `{ error }` in the visitor's language
     (NEXT_LOCALE cookie); success redirects (redirect() throws,
     so it is called outside try/catch).
   • Redirect targets are same-site paths only (safeRedirectPath).
   • Rate limits per client (hashed IP) and per email, checked here
     because Supabase only sees this server's address: wrong
     passwords, new accounts and reset links (lib/checkout/rate-limit).
     A correct password gives its hit back.
   • "Forgot password" always answers the same way, whether or not
     an account exists, so it can't be used to find accounts.
   • The reset link points at /auth/callback on this site; the
     origin is the configured site URL (in development: the local
     origin the request came from).
   ══════════════════════════════════════════════════════════════ */

import type { AuthError } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { SITE_URL } from "@/lib/seo/site";
import { isRecoveryFor } from "@/lib/auth/recovery-cookie";
import {
  clientKey,
  LOGIN_CLIENT_LIMIT,
  LOGIN_EMAIL_LIMIT,
  rateLimit,
  refundRateLimit,
  REGISTER_CLIENT_LIMIT,
  REGISTER_EMAIL_LIMIT,
  RESET_CLIENT_LIMIT,
  RESET_EMAIL_LIMIT,
  targetKey,
  type Limit,
} from "@/lib/checkout/rate-limit";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import {
  createForgotPasswordSchema,
  createLoginSchema,
  createRegisterSchema,
  RECOVERY_COOKIE,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";
import { createNewPasswordSchema, type NewPasswordInput } from "@/lib/validations/profile";

const EXTRA = {
  en: {
    resetExpired: "This reset link has expired or was already used. Please ask for a new one.",
    samePassword: "Choose a password different from your current one.",
  },
  ar: {
    resetExpired: "انتهت صلاحية رابط إعادة التعيين أو استُخدم من قبل. يرجى طلب رابط جديد.",
    samePassword: "اختر كلمة مرور مختلفة عن كلمة المرور الحالية.",
  },
} as const;

/** Maps Supabase Auth errors to a message in the visitor's language. */
function authErrorMessage(error: AuthError, dict: Dictionary): string {
  const e = dict.auth.errors;
  const code = error.code ?? "";
  const text = error.message.toLowerCase();

  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return e.invalidCredentials;
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return e.emailNotConfirmed;
  if (code === "user_already_exists" || code === "email_exists" || text.includes("already registered")) return e.emailTaken;
  if (code === "weak_password" || text.includes("password should")) return e.weakPassword;
  if (error.status === 429 || code.startsWith("over_") || text.includes("rate limit")) return e.tooManyRequests;
  return e.generic;
}

/** First validation message, so the banner says what is wrong. */
function firstIssue(issues: { message: string }[], fallback: string): string {
  return issues[0]?.message || fallback;
}

/**
 * Counts one attempt for this client and for this email (both must have room).
 * Returns a refund function that gives both hits back.
 */
async function limitAttempt(
  bucket: string,
  email: string,
  rules: { client: Limit; email: Limit },
): Promise<{ allowed: boolean; refund: () => Promise<void> }> {
  const client = await clientKey(null);
  const target = targetKey(email);
  const [byClient, byEmail] = await Promise.all([
    rateLimit(bucket, client, rules.client),
    rateLimit(`${bucket}-email`, target, rules.email),
  ]);
  return {
    allowed: byClient && byEmail,
    refund: async () => {
      await Promise.all([refundRateLimit(bucket, client, rules.client), refundRateLimit(`${bucket}-email`, target, rules.email)]);
    },
  };
}

/* ── Sign in ─────────────────────────────────────────────────── */

/**
 * Signs in with email + password, then goes to `redirectTo` (same-site
 * paths only, e.g. back to checkout) or the account page.
 */
export async function loginAction(data: LoginInput, redirectTo?: string) {
  const { dict } = await getLocaleAndDictionary();
  const result = createLoginSchema(dict.validation).safeParse(data);
  if (!result.success) return { error: firstIssue(result.error.issues, dict.auth.errors.invalidForm) };

  const limit = await limitAttempt("login", result.data.email, { client: LOGIN_CLIENT_LIMIT, email: LOGIN_EMAIL_LIMIT });
  if (!limit.allowed) return { error: dict.auth.errors.tooManyRequests };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
  if (error) return { error: authErrorMessage(error, dict) };

  // Only wrong passwords count towards the limit.
  await limit.refund();
  revalidatePath("/", "layout");
  // Only same-site relative paths: "//evil.com" or "/\evil.com" fall back.
  redirect(safeRedirectPath(redirectTo, "/account"));
}

/* ── Create an account ───────────────────────────────────────── */

/**
 * Creates an account. The profile row is created by the database trigger
 * from the names in user_metadata. With email confirmation on, there is no
 * session yet: the form then asks the buyer to check their inbox.
 */
export async function registerAction(data: RegisterInput, redirectTo?: string): Promise<{ error?: string; confirmEmail?: boolean }> {
  const { dict } = await getLocaleAndDictionary();
  const result = createRegisterSchema(dict.validation).safeParse(data);
  if (!result.success) return { error: firstIssue(result.error.issues, dict.auth.errors.invalidForm) };

  const { email, password, firstName, lastName } = result.data;
  const limit = await limitAttempt("register", email, { client: REGISTER_CLIENT_LIMIT, email: REGISTER_EMAIL_LIMIT });
  if (!limit.allowed) return { error: dict.auth.errors.tooManyRequests };

  const supabase = await createServerClient();
  const { data: signUp, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${await authOrigin()}/auth/callback?next=${encodeURIComponent(safeRedirectPath(redirectTo, "/account"))}`,
    },
  });
  if (error) return { error: authErrorMessage(error, dict) };
  if (!signUp.session) return { confirmEmail: true };

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(redirectTo, "/account"));
}

/* ── Sign out ────────────────────────────────────────────────── */

export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ── Forgotten password ──────────────────────────────────────── */

/**
 * Where links in auth emails should point. Production: the configured site
 * URL, never a header an attacker could set. Development: the local origin
 * of this request (several dev servers run on different ports).
 */
async function authOrigin(): Promise<string> {
  const site = SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return site;
  const h = await headers();
  const origin = h.get("origin") ?? "";
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : site;
}

/**
 * Sends a reset link if an account exists. Always answers `{ sent: true }` for
 * a valid email (no hint whether the account exists), except when the email
 * service itself refuses (rate limit), which the buyer needs to know.
 */
export async function forgotPasswordAction(data: ForgotPasswordInput): Promise<{ sent?: true; error?: string }> {
  const { dict } = await getLocaleAndDictionary();
  const parsed = createForgotPasswordSchema(dict.validation).safeParse(data);
  if (!parsed.success) return { error: firstIssue(parsed.error.issues, dict.auth.errors.invalidForm) };

  const limit = await limitAttempt("reset", parsed.data.email, { client: RESET_CLIENT_LIMIT, email: RESET_EMAIL_LIMIT });
  if (!limit.allowed) return { error: dict.auth.errors.tooManyRequests };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await authOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    if (error.status === 429 || (error.code ?? "").startsWith("over_")) return { error: dict.auth.errors.tooManyRequests };
    console.error("[forgotPassword]", error.status, error.code, error.message);
  }
  return { sent: true };
}

/* ── New password from a reset link ──────────────────────────── */

/**
 * Sets a new password for the account the reset link signed in
 * (/auth/callback exchanged the link for a session), then opens the account.
 */
export async function resetPasswordAction(data: NewPasswordInput): Promise<{ error?: string; field?: string }> {
  const { locale, dict } = await getLocaleAndDictionary();
  const x = EXTRA[locale === "ar" ? "ar" : "en"];
  const parsed = createNewPasswordSchema(dict.validation).safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? dict.auth.errors.invalidForm, field: String(issue?.path[0] ?? "") };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only right after a reset link: /auth/callback marked this browser for this account (signed, 15 minutes).
  const cookieStore = await cookies();
  if (!user || !isRecoveryFor(cookieStore.get(RECOVERY_COOKIE)?.value, user.id)) return { error: x.resetExpired };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    const text = error.message.toLowerCase();
    if (error.code === "same_password" || text.includes("different from the old")) return { error: x.samePassword, field: "newPassword" };
    return { error: authErrorMessage(error, dict) };
  }

  cookieStore.delete(RECOVERY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/account?password=updated");
}
