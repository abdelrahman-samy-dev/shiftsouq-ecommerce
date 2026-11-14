/* Admin — new collection: /admin/collections/new */

import type { Metadata } from "next";
import { CollectionEditor } from "@/components/admin-catalog/CollectionEditor";
import { getCatalogText } from "@/lib/admin/i18n-catalog";
import { listCollections } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.collections.newTitle };
}

export default async function NewCollectionPage() {
  const [locale, rows] = await Promise.all([getLocale(), listCollections()]);
  const nextSort = rows.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
  return <CollectionEditor data={null} locale={locale} nextSort={nextSort} />;
}
