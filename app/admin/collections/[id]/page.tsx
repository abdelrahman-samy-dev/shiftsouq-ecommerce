/* Admin — edit collection: /admin/collections/[id] */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CollectionEditor } from "@/components/admin-catalog/CollectionEditor";
import { getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCollectionForEditor } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const c = z.guid().safeParse(id).success ? await getCollectionForEditor(id) : null;
  return { title: c ? (locale === "ar" ? c.title_ar : c.title_en) : getCatalogText(locale).collections.title };
}

export default async function EditCollectionPage({ params }: Props) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const [locale, data] = await Promise.all([getLocale(), getCollectionForEditor(id)]);
  if (!data) notFound();
  return <CollectionEditor key={data.updated_at ?? data.id} data={data} locale={locale} nextSort={data.sort_order} />;
}
