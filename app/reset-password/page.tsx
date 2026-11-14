/* ══════════════════════════════════════════════════════════════
   New password — /reset-password
   Reached through /auth/callback, which turned the emailed reset
   link into a session. Without that session the link has expired
   (or was opened in another browser): offer a new one.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RECOVERY_COOKIE } from "@/lib/validations/auth";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { getAccountUser } from "@/lib/dal/account";
import { ButtonLink } from "@/components/ds";
import { AuthSplit } from "@/app/(auth)/_components/AuthSplit";
import { authCopy } from "@/app/(auth)/_components/copy";
import { ResetPasswordForm } from "./ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  return { title: authCopy(locale).resetTitle, robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage() {
  const [{ locale, dict }, user, cookieStore] = await Promise.all([getLocaleAndDictionary(), getAccountUser(), cookies()]);
  const t = authCopy(locale);
  // The reset link marked this browser for this account (see /auth/callback).
  const recovering = !!user && cookieStore.get(RECOVERY_COOKIE)?.value === user.authUserId;

  return (
    <AuthSplit locale={locale}>
      {user && recovering ? (
        <ResetPasswordForm locale={locale} messages={dict.validation} email={user.email} />
      ) : (
        <div className="flex flex-col gap-6">
          <h1 className="t-h1">{t.resetExpiredTitle}</h1>
          <p className="text-text-secondary">{t.resetExpiredBody}</p>
          <ButtonLink href="/forgot-password" size="lg" className="self-start">
            {t.requestNew}
          </ButtonLink>
        </div>
      )}
    </AuthSplit>
  );
}
