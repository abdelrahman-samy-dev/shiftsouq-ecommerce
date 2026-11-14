"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions – Authentication
   ──────────────────────────────────────────────────────────────
   Handles login, registration, and logout via Supabase Auth.
   Each action validates input with Zod before hitting the API.

   Design notes:
   - All actions return `{ error: string }` on failure so the
     client can display error messages without try/catch. The
     message is in the visitor's language (NEXT_LOCALE cookie).
   - On success, `redirect()` throws internally (expected by Next.js),
     so the function never returns a success payload.
   ══════════════════════════════════════════════════════════════ */

import type { AuthError } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

import {
  createLoginSchema,
  createRegisterSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";

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
 * Authenticates a user with email and password.
 *
 * Validates the input against the login schema before attempting
 * sign-in. On success, revalidates the root path to refresh
 * auth-dependent UI (e.g. header profile) and redirects to the
 * requested page (same-site paths only) or home.
 *
 * @param data - Login credentials (email, password, rememberMe).
 * @returns `{ error: string }` if validation or auth fails;
 *          never returns on success (redirects).
 */
export async function loginAction(data: LoginInput, redirectTo?: string) {
  const { dict } = await getLocaleAndDictionary();
  const result = createLoginSchema(dict.validation).safeParse(data);

  if (!result.success) {
    return { error: firstIssue(result.error.issues, dict.auth.errors.invalidForm) };
  }

  const supabase = await createServerClient();
  const { email, password } = result.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: authErrorMessage(error, dict) };
  }

  revalidatePath("/");

  // Only same-site relative paths: "//evil.com" or "/\evil.com" fall back to "/".
  redirect(safeRedirectPath(redirectTo));
}

/**
 * Registers a new user account via Supabase Auth.
 *
 * Additional profile data (name, country, city) is passed as
 * `user_metadata` and can be accessed later via the user object
 * or a database trigger that populates the `profiles` table.
 *
 * @param data - Registration fields (name, email, password, country, city, etc.).
 * @returns `{ error: string }` if validation or registration fails;
 *          never returns on success (redirects).
 */
export async function registerAction(data: RegisterInput) {
  const { dict } = await getLocaleAndDictionary();
  const result = createRegisterSchema(dict.validation).safeParse(data);

  if (!result.success) {
    return { error: firstIssue(result.error.issues, dict.auth.errors.invalidForm) };
  }

  const supabase = await createServerClient();
  const { email, password, firstName, lastName, country, city } = result.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        country,
        city,
      },
    },
  });

  if (error) {
    return { error: authErrorMessage(error, dict) };
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * Signs out the current user and redirects to the homepage.
 *
 * Revalidates the root path to clear auth-dependent cached UI.
 */
export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
