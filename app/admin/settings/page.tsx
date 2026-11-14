/* ══════════════════════════════════════════════════════════════
   Admin settings — /admin/settings
   One page, one save, sections mapping to the store_settings JSON.
   Only the store owner can save (server check + row-level
   security); admins get the same page read-only with a notice.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";
import { formatDateTime, fill, getAdminText } from "@/lib/admin/i18n";
import { settingsToValues } from "@/lib/admin/settings-schema";
import { getLocale } from "@/lib/i18n/server";
import { paymobConfigured, paymobMockEnabled } from "@/lib/payments/paymob";
import { getSettingsExtras } from "@/lib/dal/home";
import { getStoreSettings } from "@/lib/settings";
import { Notice, PageHeader } from "../components/ui";
import { SettingsForm, type PaymobStatus } from "./SettingsForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.shell.nav.settings };
}

export default async function AdminSettingsPage() {
  const [ctx, locale, settings, extras] = await Promise.all([getAdminContext(), getLocale(), getStoreSettings(), getSettingsExtras()]);
  if (!ctx) redirect("/admin");
  const t = getAdminText(locale);
  const S = t.settings;
  const owner = ctx.role === "super_admin";

  const status = (method: "card" | "wallet"): PaymobStatus =>
    paymobConfigured(method) ? "configured" : paymobMockEnabled() ? "test" : "missing";

  return (
    <>
      <PageHeader
        title={S.title}
        description={
          settings.updatedAt ? `${S.description} ${fill(S.lastSaved, { date: formatDateTime(settings.updatedAt, locale) })}` : S.description
        }
      />
      {!owner ? (
        <Notice icon={<Lock />} title={S.readOnlyTitle} className="mb-6">
          {S.readOnlyBody}
        </Notice>
      ) : null}
      <SettingsForm
        locale={locale}
        initial={settingsToValues(settings, { tone: extras.hero.tone, align: extras.hero.align })}
        updatedAt={settings.updatedAt}
        readOnly={!owner}
        paymob={{ card: status("card"), wallet: status("wallet") }}
      />
    </>
  );
}
