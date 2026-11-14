/* ══════════════════════════════════════════════════════════════
   Create an account — /register
   Split layout like sign in. Coming from a guest receipt
   (?from=order), the email of the order this browser just placed
   is filled in — read from the httpOnly receipt cookie on the
   server, so it never travels in the URL.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { getReceipt } from "@/lib/dal/receipt";
import { AuthSplit } from "../_components/AuthSplit";
import { authCopy } from "../_components/copy";
import RegisterForm from "./RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  const t = authCopy(locale);
  return { title: t.registerTitle, description: t.registerIntro, robots: { index: false, follow: true } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[]; from?: string }> }) {
  const [{ locale, dict }, params] = await Promise.all([getLocaleAndDictionary(), searchParams]);
  const raw = typeof params.redirect === "string" ? params.redirect : undefined;
  const redirectTo = raw ? safeRedirectPath(raw, "") || undefined : undefined;
  const receipt = params.from === "order" ? await getReceipt() : null;

  return (
    <AuthSplit locale={locale}>
      <RegisterForm locale={locale} messages={dict.validation} redirectTo={redirectTo} initialEmail={receipt?.delivery.email ?? ""} />
    </AuthSplit>
  );
}
