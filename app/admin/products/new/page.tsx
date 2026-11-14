/* Admin — new product: /admin/products/new */

import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin-catalog/product-editor/ProductEditor";
import { getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCatalogCategories } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.editor.newTitle };
}

export default async function NewProductPage() {
  const [locale, categories, settings] = await Promise.all([getLocale(), getCatalogCategories(), getStoreSettings()]);
  return <ProductEditor data={null} categories={categories} locale={locale} threshold={settings.inventory.lowStockThreshold} />;
}
