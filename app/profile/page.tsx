/* ══════════════════════════════════════════════════════════════
   Profile Page — /profile
   ──────────────────────────────────────────────────────────────
   Server component that loads the user's profile data and
   passes it to the client-side ProfileForm component.

   Protected by proxy — only authenticated users can access.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getProfile } from "@/lib/actions/profile";
import ProfileForm from "./ProfileForm";

/* ── SEO ──────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "Manage your ShiftSouq account — update your personal information and change your password.",
};

/* ── Page Component ───────────────────────────────────────────── */

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  const profile = await getProfile();

  /* If getProfile returns null it means the user is not authenticated.
     The proxy should have already redirected them, but as a safety net
     we show a message instead of redirecting (which could cause a loop). */
  if (!profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1
            className="text-xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {locale === "ar"
              ? "يرجى تسجيل الدخول"
              : "Please log in"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {locale === "ar"
              ? "يجب تسجيل الدخول للوصول إلى ملفك الشخصي."
              : "You need to be logged in to access your profile."}
          </p>
        </div>
      </div>
    );
  }

  return <ProfileForm dict={dict} profile={profile} locale={locale} />;
}
