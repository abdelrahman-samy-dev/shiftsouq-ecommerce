/* ══════════════════════════════════════════════════════════════
   Server Actions — Profile Management
   ──────────────────────────────────────────────────────────────
   Handles profile updates and password changes via Supabase.
   All actions are authenticated through the server client.
   Input is validated with the shared zod schemas and every
   message is returned in the visitor's language (NEXT_LOCALE).
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { createPasswordChangeSchema, createProfileSchema } from "@/lib/validations/profile";

/* ── Types ───────────────────────────────────────────────────── */

export interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
  country?: string;
  city?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  /** Field the message refers to, when it is a validation error. */
  field?: string;
}

/* ── Update Profile ──────────────────────────────────────────── */

/**
 * Updates the user's profile data (name, phone, country, city).
 * Uses the authenticated Supabase client — RLS enforces ownership.
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ActionResult> {
  const { dict } = await getLocaleAndDictionary();
  const t = dict.profile.errors;

  try {
    const supabase = await createServerClient();

    /* 1. Get current user */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: t.notLoggedIn };
    }

    /* 2. Validate (only the fields that were sent) */
    const schema = createProfileSchema(dict.validation).partial();
    const parsed = schema.safeParse(data ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, message: issue.message, field: String(issue.path[0] ?? "") };
    }
    const input = parsed.data;

    /* 3. Find profile by auth user ID */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { success: false, message: t.notFound };
    }

    /* 4. Build update payload (empty string clears the field) */
    const payload: Record<string, string | null> = {};
    if (input.full_name !== undefined) payload.full_name = input.full_name || null;
    if (input.phone !== undefined) payload.phone = input.phone || null;
    if (input.country !== undefined) payload.country = input.country || null;
    if (input.city !== undefined) payload.city = input.city || null;

    if (Object.keys(payload).length === 0) {
      return { success: false, message: t.noChanges };
    }

    /* 5. Update the profile */
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (updateError) {
      console.error("[updateProfile]", updateError.message);
      return { success: false, message: t.updateFailed };
    }

    /* 6. Also update user metadata in Supabase Auth (for display name) */
    if (input.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: input.full_name },
      });
    }

    revalidatePath("/profile");
    return { success: true, message: dict.profile.profileUpdated };
  } catch (err) {
    console.error("[updateProfile] unexpected:", err);
    return { success: false, message: t.unexpected };
  }
}

/* ── Change Password ─────────────────────────────────────────── */

/**
 * Changes the user's password via Supabase Auth.
 * Requires the new password (Supabase handles old password verification
 * via the active session token). `confirmPassword` defaults to the new
 * password for callers that already checked it.
 */
export async function changePassword(newPassword: string, confirmPassword: string = newPassword): Promise<ActionResult> {
  const { dict } = await getLocaleAndDictionary();
  const t = dict.profile.errors;

  try {
    const supabase = await createServerClient();

    /* 1. Verify user is logged in */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: t.passwordLoginRequired };
    }

    /* 2. Validate (same rules as sign-up) */
    const parsed = createPasswordChangeSchema(dict.validation).safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, message: issue.message, field: String(issue.path[0] ?? "") };
    }

    /* 3. Update password */
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      console.error("[changePassword]", updateError.message);

      // Common Supabase auth errors
      if (updateError.code === "same_password" || updateError.message.includes("same_password") || updateError.message.toLowerCase().includes("different from the old")) {
        return { success: false, message: t.samePassword };
      }
      if (updateError.code === "weak_password") {
        return { success: false, message: t.weakPassword };
      }

      return { success: false, message: t.passwordFailed };
    }

    return { success: true, message: dict.profile.passwordChanged };
  } catch (err) {
    console.error("[changePassword] unexpected:", err);
    return { success: false, message: t.unexpected };
  }
}

/* ── Get Profile ─────────────────────────────────────────────── */

/**
 * Fetches the authenticated user's profile.
 *
 * Uses the service role client for DB queries because the RLS
 * SELECT policy (auth.uid() = auth_user_id) can fail when the
 * server-side Supabase client's auth context isn't properly
 * propagated to PostgREST. We still verify auth via getUser()
 * first, then use service role to reliably fetch/create the row.
 *
 * If no profile row exists, one is auto-created (lazy creation).
 * Returns null only if the user is not logged in.
 */
export async function getProfile() {
  try {
    const supabase = await createServerClient();

    /* Verify the user is authenticated */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    /* Use service role for reliable DB access (bypasses RLS) */
    const db = getServiceClient();

    /* 1. Try to find existing profile */
    const { data: profile } = await db
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile) {
      return { ...profile, email: user.email ?? "" };
    }

    /* 2. No profile found — auto-create via upsert
          (upsert handles race conditions gracefully) */
    const meta = user.user_metadata || {};
    const fullName = [meta.first_name, meta.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || meta.full_name || null;

    const { data: newProfile, error: upsertError } = await db
      .from("profiles")
      .upsert(
        {
          auth_user_id: user.id,
          full_name: fullName,
          phone: meta.phone || null,
          country: meta.country || null,
          city: meta.city || null,
          role: "customer",
        },
        { onConflict: "auth_user_id" }
      )
      .select("*")
      .single();

    if (upsertError) {
      console.error("[getProfile] upsert failed:", upsertError.message);
      // Return a minimal profile object so the page still renders
      return {
        id: "",
        auth_user_id: user.id,
        full_name: fullName,
        avatar_url: null,
        role: "customer" as const,
        phone: meta.phone || null,
        country: meta.country || null,
        city: meta.city || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: user.email ?? "",
      };
    }

    return { ...newProfile, email: user.email ?? "" };
  } catch (err) {
    console.error("[getProfile] unexpected:", err);
    return null;
  }
}

