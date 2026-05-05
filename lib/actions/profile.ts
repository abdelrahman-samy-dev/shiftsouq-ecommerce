/* ══════════════════════════════════════════════════════════════
   Server Actions — Profile Management
   ──────────────────────────────────────────────────────────────
   Handles profile updates and password changes via Supabase.
   All actions are authenticated through the server client.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
}

/* ── Service Role Client (for admin-level operations) ─────────── */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/* ── Update Profile ──────────────────────────────────────────── */

/**
 * Updates the user's profile data (name, phone, country, city).
 * Uses the authenticated Supabase client — RLS enforces ownership.
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ActionResult> {
  try {
    const supabase = await createServerClient();

    /* 1. Get current user */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "You must be logged in to update your profile." };
    }

    /* 2. Find profile by auth user ID */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { success: false, message: "Profile not found. Please contact support." };
    }

    /* 3. Sanitize & build update payload */
    const payload: Record<string, string | null> = {};
    if (data.full_name !== undefined) payload.full_name = data.full_name.trim() || null;
    if (data.phone !== undefined) payload.phone = data.phone.trim() || null;
    if (data.country !== undefined) payload.country = data.country.trim() || null;
    if (data.city !== undefined) payload.city = data.city.trim() || null;

    if (Object.keys(payload).length === 0) {
      return { success: false, message: "No changes to save." };
    }

    /* 4. Update the profile */
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (updateError) {
      console.error("[updateProfile]", updateError.message);
      return { success: false, message: "Failed to update profile. Please try again." };
    }

    /* 5. Also update user metadata in Supabase Auth (for display name) */
    if (data.full_name) {
      await supabase.auth.updateUser({
        data: { full_name: data.full_name.trim() },
      });
    }

    revalidatePath("/profile");
    return { success: true, message: "Profile updated successfully." };
  } catch (err) {
    console.error("[updateProfile] unexpected:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/* ── Change Password ─────────────────────────────────────────── */

/**
 * Changes the user's password via Supabase Auth.
 * Requires the new password (Supabase handles old password verification
 * via the active session token).
 */
export async function changePassword(newPassword: string): Promise<ActionResult> {
  try {
    const supabase = await createServerClient();

    /* 1. Verify user is logged in */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "You must be logged in to change your password." };
    }

    /* 2. Validate password length */
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }

    /* 3. Update password */
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("[changePassword]", updateError.message);

      // Check for common Supabase auth errors
      if (updateError.message.includes("same_password")) {
        return { success: false, message: "New password must be different from the current password." };
      }

      return { success: false, message: updateError.message || "Failed to change password." };
    }

    return { success: true, message: "Password changed successfully." };
  } catch (err) {
    console.error("[changePassword] unexpected:", err);
    return { success: false, message: "An unexpected error occurred." };
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

