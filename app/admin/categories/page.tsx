/* Admin — Categories: /admin/categories (tree, ordering, create / edit drawer, guarded delete). */

import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin-catalog/CategoriesManager";
import { fmt, formatCount, getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCatalogCategories } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.categories.title };
}

export default async function AdminCategoriesPage() {
  const [locale, categories] = await Promise.all([getLocale(), getCatalogCategories()]);
  const t = getCatalogText(locale);
  const products = categories.reduce((n, c) => n + c.product_count, 0);
  return (
    <div className="pb-16">
      <CategoriesManager
        categories={categories}
        locale={locale}
        meta={
          <>
            <span className="tabular-nums">{fmt(t.categories.count, { count: formatCount(categories.length, locale) })}</span>
            <span className="tabular-nums">{fmt(t.categories.products, { count: formatCount(products, locale) })}</span>
          </>
        }
      />
    </div>
  );
}
