/* ══════════════════════════════════════════════════════════════
   Profile Page — /profile
   ──────────────────────────────────────────────────────────────
   Server component that loads the user's profile data and
   passes it to the client-side ProfileForm component.

   Protected by proxy — only authenticated users can access.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { getProfile } from "@/lib/actions/profile";
import ProfileForm from "./ProfileForm";

/* ── SEO ──────────────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  return { title: dict.meta.profile.title, description: dict.meta.profile.description };
}

/* ── Page Component ───────────────────────────────────────────── */

export default async function ProfilePage() {
  const { locale, dict } = await getLocaleAndDictionary();

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
            {dict.profile.pleaseLogin}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {dict.profile.pleaseLoginDesc}
          </p>
        </div>
      </div>
    );
  }

  return <ProfileForm dict={dict} profile={profile} locale={locale} />;
}
