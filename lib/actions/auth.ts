"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions – Authentication
   ──────────────────────────────────────────────────────────────
   Handles login, registration, and logout via Supabase Auth.
   Each action validates input with Zod before hitting the API.

   Design notes:
   - All actions return `{ error: string }` on failure so the
     client can display error messages without try/catch.
   - On success, `redirect()` throws internally (expected by Next.js),
     so the function never returns a success payload.
   ══════════════════════════════════════════════════════════════ */

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";

/**
 * Authenticates a user with email and password.
 *
 * Validates the input against `loginSchema` before attempting
 * sign-in. On success, revalidates the root path to refresh
 * auth-dependent UI (e.g. header profile) and redirects home.
 *
 * @param data - Login credentials (email, password, rememberMe).
 * @returns `{ error: string }` if validation or auth fails;
 *          never returns on success (redirects).
 */
export async function loginAction(data: LoginInput, redirectTo?: string) {
  const result = loginSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid form data" };
  }

  const supabase = await createServerClient();
  const { email, password } = result.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");

  // Redirect to the originally requested page, or fallback to home.
  // Only allow relative paths to prevent open-redirect vulnerabilities.
  const destination =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
  redirect(destination);
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
  const result = registerSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid form data" };
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
    return { error: error.message };
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
