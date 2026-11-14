/* ══════════════════════════════════════════════════════════════
   Server Actions — Profile and password
   ──────────────────────────────────────────────────────────────
   All actions run as the signed-in user (RLS enforces ownership).
   Input is validated with the shared zod schemas and every
   message is returned in the visitor's language (NEXT_LOCALE).

   Changing the password asks for the current one first: it is
   checked with a separate, cookie-less sign-in so a stolen open
   session alone can't lock the owner out of their account.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { createPasswordChangeSchema, createProfileSchema, type PasswordChangeInput } from "@/lib/validations/profile";
import { normalizeEgyptianMobile } from "@/components/checkout/checkout-rules";

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

const EXTRA = {
  en: {
    phone: "Enter an Egyptian mobile number: 11 digits starting with 010, 011, 012 or 015",
    wrongCurrent: "Your current password is not correct.",
    tooMany: "Too many attempts. Please wait a moment and try again.",
  },
  ar: {
    phone: "أدخل رقم هاتف محمول مصريًا من 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015",
    wrongCurrent: "كلمة المرور الحالية غير صحيحة.",
    tooMany: "محاولات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.",
  },
} as const;

/* ── Update Profile ──────────────────────────────────────────── */

/** Updates the user's name and phone (and country / city when sent). */
export async function updateProfile(data: ProfileUpdateData): Promise<ActionResult> {
  const { locale, dict } = await getLocaleAndDictionary();
  const t = dict.profile.errors;
  const x = EXTRA[locale === "ar" ? "ar" : "en"];

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, message: t.notLoggedIn };

    /* Validate only the fields that were sent */
    const parsed = createProfileSchema(dict.validation, x.phone).partial().safeParse(data ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, message: issue.message, field: String(issue.path[0] ?? "") };
    }
    const input = parsed.data;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError || !profile) return { success: false, message: t.notFound };

    /* Empty string clears the field; phones are stored as 01XXXXXXXXX */
    const payload: Record<string, string | null> = {};
    if (input.full_name !== undefined) payload.full_name = input.full_name || null;
    if (input.phone !== undefined) payload.phone = input.phone ? normalizeEgyptianMobile(input.phone) : null;
    if (input.country !== undefined) payload.country = input.country || null;
    if (input.city !== undefined) payload.city = input.city || null;
    if (Object.keys(payload).length === 0) return { success: false, message: t.noChanges };

    const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    if (updateError) {
      console.error("[updateProfile]", updateError.message);
      return { success: false, message: t.updateFailed };
    }

    if (input.full_name) await supabase.auth.updateUser({ data: { full_name: input.full_name } });

    revalidatePath("/profile");
    revalidatePath("/account");
    return { success: true, message: dict.profile.profileUpdated };
  } catch (err) {
    console.error("[updateProfile] unexpected:", err);
    return { success: false, message: t.unexpected };
  }
}

/* ── Change Password ─────────────────────────────────────────── */

/** Checks the current password without touching this browser's session cookies. */
async function currentPasswordIsValid(email: string, password: string): Promise<"ok" | "wrong" | "limited"> {
  const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return error.status === 429 ? "limited" : "wrong";
  // Close the extra session at once; the browser's own session is untouched.
  if (data.session) await probe.auth.signOut({ scope: "local" }).catch(() => undefined);
  return "ok";
}

export async function changePassword(input: PasswordChangeInput): Promise<ActionResult> {
  const { locale, dict } = await getLocaleAndDictionary();
  const t = dict.profile.errors;
  const x = EXTRA[locale === "ar" ? "ar" : "en"];

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || !user.email) return { success: false, message: t.passwordLoginRequired };

    const parsed = createPasswordChangeSchema(dict.validation).safeParse(input ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, message: issue.message, field: String(issue.path[0] ?? "") };
    }

    const check = await currentPasswordIsValid(user.email, parsed.data.currentPassword);
    if (check === "limited") return { success: false, message: x.tooMany };
    if (check === "wrong") return { success: false, message: x.wrongCurrent, field: "currentPassword" };

    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (updateError) {
      console.error("[changePassword]", updateError.message);
      const text = updateError.message.toLowerCase();
      if (updateError.code === "same_password" || text.includes("same_password") || text.includes("different from the old")) {
        return { success: false, message: t.samePassword, field: "newPassword" };
      }
      if (updateError.code === "weak_password") return { success: false, message: t.weakPassword, field: "newPassword" };
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
 * The authenticated user's profile (created on first access if the sign-up
 * trigger didn't). The row is read with the service client after getUser()
 * has verified who is asking. Returns null only for visitors.
 */
export async function getProfile() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const db = getServiceClient();
    const { data: profile } = await db.from("profiles").select("*").eq("auth_user_id", user.id).maybeSingle();
    if (profile) return { ...profile, email: user.email ?? "" };

    const meta = user.user_metadata || {};
    const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() || meta.full_name || null;

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
        { onConflict: "auth_user_id" },
      )
      .select("*")
      .single();

    if (upsertError) {
      console.error("[getProfile] upsert failed:", upsertError.message);
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
