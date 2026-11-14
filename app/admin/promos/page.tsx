/* Admin — Promo codes: /admin/promos (list, create, edit, activate / deactivate). */

import type { Metadata } from "next";
import { PromosManager } from "@/components/admin-catalog/PromosManager";
import { fmt, formatCount, getCatalogText } from "@/lib/admin/i18n-catalog";
import { getPromoCodes } from "@/lib/dal/admin";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.promos.title };
}

export default async function AdminPromosPage() {
  const [locale, promos] = await Promise.all([getLocale(), getPromoCodes()]);
  const t = getCatalogText(locale);
  return (
    <div className="pb-16">
      <PromosManager
        promos={promos}
        locale={locale}
        meta={<span className="tabular-nums">{fmt(t.promos.count, { count: formatCount(promos.length, locale) })}</span>}
      />
    </div>
  );
}
