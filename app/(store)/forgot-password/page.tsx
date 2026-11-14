/* ══════════════════════════════════════════════════════════════
   Forgotten password — /forgot-password
   Sends a Supabase reset link that returns to
   /auth/callback?next=/reset-password on this site.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { AuthSplit } from "@/app/(store)/(auth)/_components/AuthSplit";
import { authCopy } from "@/app/(store)/(auth)/_components/copy";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  const t = authCopy(locale);
  return { title: t.forgotTitle, robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const [{ locale, dict }, { link }] = await Promise.all([getLocaleAndDictionary(), searchParams]);
  return (
    <AuthSplit locale={locale}>
      <ForgotPasswordForm locale={locale} messages={dict.validation} linkExpired={link === "expired"} />
    </AuthSplit>
  );
}
