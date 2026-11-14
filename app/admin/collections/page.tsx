/* Admin — Collections: /admin/collections */

import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ds";
import { CoverThumb, EmptyPanel, PageHeader, StatusLabel, tdClass, thClass } from "@/components/admin-catalog/ui";
import { fmt, formatCount, formatShortDate, getCatalogText } from "@/lib/admin/i18n-catalog";
import { listCollections } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.collections.title };
}

export default async function AdminCollectionsPage() {
  const [locale, rows] = await Promise.all([getLocale(), listCollections()]);
  const t = getCatalogText(locale);
  const tc = t.collections;
  const ar = locale === "ar";
  const add = (
    <ButtonLink href="/admin/collections/new" size="sm">
      {tc.add}
    </ButtonLink>
  );

  return (
    <div className="pb-16">
      <PageHeader title={tc.title} description={tc.description} actions={rows.length ? add : null} />
      {rows.length === 0 ? (
        <EmptyPanel title={tc.emptyTitle} body={tc.emptyBody} action={add} />
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-border">
              <th scope="col" className={thClass}>{tc.columns.collection}</th>
              <th scope="col" className={cn(thClass, "w-28")}>{tc.columns.products}</th>
              <th scope="col" className={cn(thClass, "w-32")}>{tc.columns.status}</th>
              <th scope="col" className={cn(thClass, "w-24")}>{tc.columns.order}</th>
              <th scope="col" className={cn(thClass, "w-36 text-end")}>{tc.columns.updated}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="flex flex-wrap items-center gap-x-4 border-b border-border py-2 transition-colors hover:bg-surface/60 md:table-row md:py-0">
                <td className={cn(tdClass, "w-full md:w-auto")}>
                  <Link href={`/admin/collections/${c.id}`} className="group flex items-center gap-3">
                    <CoverThumb src={c.image_url} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-primary group-hover:underline group-hover:underline-offset-4">
                        {ar ? c.title_ar : c.title_en}
                      </span>
                      <span className="block truncate text-[0.75rem] text-text-muted">
                        <bdi>{ar ? c.title_en : c.title_ar}</bdi>
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={cn(tdClass, "text-text-secondary tabular-nums")}>
                  <span className="md:hidden">{fmt(tc.products, { count: formatCount(c.product_count, locale) })}</span>
                  <span className="hidden md:inline">{formatCount(c.product_count, locale)}</span>
                </td>
                <td className={tdClass}>
                  <StatusLabel active={c.is_active} label={c.is_active ? t.status.active : t.status.hidden} />
                </td>
                <td className={cn(tdClass, "hidden text-text-secondary tabular-nums md:table-cell")}>{c.sort_order}</td>
                <td className={cn(tdClass, "hidden text-end text-[0.8125rem] text-text-muted tabular-nums md:table-cell")}>{formatShortDate(c.updated_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
