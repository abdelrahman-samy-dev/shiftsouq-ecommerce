/* Security — /account/security: change the password (current password required). */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { AccountShell } from "../_components/AccountShell";
import { accountCopy } from "../_components/copy";
import { requireAccountUser } from "../_components/require-user";
import { ChangePasswordForm } from "./ChangePasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  return { title: accountCopy(locale).securityTitle, robots: { index: false, follow: false } };
}

export default async function SecurityPage() {
  const { locale, dict } = await getLocaleAndDictionary();
  const t = accountCopy(locale);
  const user = await requireAccountUser("/account/security");
  return (
    <AccountShell locale={locale} user={user} active="security" title={t.securityTitle} intro={t.securityIntro}>
      <ChangePasswordForm locale={locale} messages={dict.validation} />
    </AccountShell>
  );
}
