/* ══════════════════════════════════════════════════════════════
   Sign in — /login
   Split layout: the form, and an editorial panel on desktop.
   ?redirect= brings the buyer back (e.g. to checkout with their
   bag intact); only same-site paths are honoured (server-side).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { AuthSplit } from "../_components/AuthSplit";
import { authCopy } from "../_components/copy";
import LoginForm from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  const t = authCopy(locale);
  return { title: t.signInTitle, description: t.signInIntro, robots: { index: false, follow: true } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[]; link?: string }> }) {
  const [{ locale, dict }, params] = await Promise.all([getLocaleAndDictionary(), searchParams]);
  const raw = typeof params.redirect === "string" ? params.redirect : undefined;
  const redirectTo = raw ? safeRedirectPath(raw, "") || undefined : undefined;

  return (
    <AuthSplit locale={locale}>
      <LoginForm locale={locale} messages={dict.validation} redirectTo={redirectTo} linkExpired={params.link === "expired"} />
    </AuthSplit>
  );
}
