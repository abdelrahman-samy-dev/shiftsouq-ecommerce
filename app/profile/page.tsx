/* ══════════════════════════════════════════════════════════════
   Profile — /profile (account area)
   Name and mobile number (editable), sign-in email (shown).
   Signed-in buyers only (proxy.ts + requireAccountUser).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { normalizeEgyptianMobile } from "@/components/checkout/checkout-rules";
import { AccountShell } from "@/app/account/_components/AccountShell";
import { accountCopy } from "@/app/account/_components/copy";
import { requireAccountUser } from "@/app/account/_components/require-user";
import ProfileForm from "./ProfileForm";

const PHONE_MESSAGE = {
  en: "Enter an Egyptian mobile number: 11 digits starting with 010, 011, 012 or 015",
  ar: "أدخل رقم هاتف محمول مصريًا من 11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015",
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getLocaleAndDictionary();
  return { title: accountCopy(locale).profileTitle, robots: { index: false, follow: false } };
}

export default async function ProfilePage() {
  const { locale, dict } = await getLocaleAndDictionary();
  const t = accountCopy(locale);
  const user = await requireAccountUser("/profile");

  return (
    <AccountShell locale={locale} user={user} active="profile" title={t.profileTitle} intro={t.profileIntro}>
      <ProfileForm
        locale={locale}
        messages={dict.validation}
        phoneMessage={PHONE_MESSAGE[locale === "ar" ? "ar" : "en"]}
        initial={{ fullName: user.fullName, phone: normalizeEgyptianMobile(user.phone) ?? user.phone ?? "", email: user.email }}
      />
    </AccountShell>
  );
}
