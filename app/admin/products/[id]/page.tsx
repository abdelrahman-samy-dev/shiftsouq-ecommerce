/* Admin — edit product: /admin/products/[id] */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProductEditor } from "@/components/admin-catalog/product-editor/ProductEditor";
import { getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCatalogCategories, getProductForEditor } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [locale, product] = await Promise.all([getLocale(), z.guid().safeParse(id).success ? getProductForEditor(id) : null]);
  const t = getCatalogText(locale);
  return { title: product ? (locale === "ar" ? product.name_ar : product.name_en) : t.products.title };
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const [locale, product, categories, settings] = await Promise.all([
    getLocale(),
    getProductForEditor(id),
    getCatalogCategories(),
    getStoreSettings(),
  ]);
  if (!product) notFound();
  // A fresh editor after every save (the key changes with updated_at).
  return (
    <ProductEditor
      key={product.updated_at ?? product.id}
      data={product}
      categories={categories}
      locale={locale}
      threshold={settings.inventory.lowStockThreshold}
    />
  );
}
