/* ══════════════════════════════════════════════════════════════
   Admin — Products: /admin/products
   Search, filters (category, status, stock), sort, pagination,
   bulk actions and CSV export. The URL holds the list state.
   `?edit=<id>` (old dashboard links) opens that product's editor.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ButtonLink } from "@/components/ds";
import { CsvButton, ListToolbar } from "@/components/admin-catalog/controls";
import { ProductsTable } from "@/components/admin-catalog/ProductsTable";
import { EmptyPanel, PageHeader, Pagination, listHref } from "@/components/admin-catalog/ui";
import { exportProductsCsv } from "@/lib/actions/admin-catalog";
import { parseProductListParams, PRODUCT_SORTS } from "@/lib/admin/catalog-schema";
import { buildTree, flattenTree } from "@/lib/admin/catalog-utils";
import { fmt, formatCount, getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCatalogCategories, listCatalogProducts } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.products.title };
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (typeof sp.edit === "string" && z.guid().safeParse(sp.edit).success) redirect(`/admin/products/${sp.edit}`);

  const locale = await getLocale();
  const t = getCatalogText(locale);
  const params = parseProductListParams(sp);
  const [settings, categories] = await Promise.all([getStoreSettings(), getCatalogCategories()]);
  const threshold = settings.inventory.lowStockThreshold;
  const list = await listCatalogProducts(params, threshold, categories);

  const current = {
    search: params.search || null,
    category: params.category,
    status: params.status,
    stock: params.stock,
    sort: params.sort === "updated" ? null : params.sort,
  };
  const exportParams = Object.fromEntries(Object.entries(current).filter((e): e is [string, string] => !!e[1]));
  const filtered = !!(params.search || params.category || params.status || params.stock);
  const ar = locale === "ar";
  const tree = flattenTree(buildTree(categories));

  return (
    <div className="pb-16">
      <PageHeader
        title={t.products.title}
        description={t.products.description}
        meta={<span className="tabular-nums">{fmt(t.products.count, { count: formatCount(list.count, locale) })}</span>}
        actions={
          <ButtonLink href="/admin/products/new" size="sm">
            {t.products.add}
          </ButtonLink>
        }
      />

      <ListToolbar
        search={params.search}
        searchLabel={t.common.search}
        searchPlaceholder={t.products.searchPlaceholder}
        clearLabel={t.common.clearFilters}
        selects={[
          {
            name: "category",
            label: t.products.columns.category,
            value: params.category ?? "",
            options: [
              { value: "", label: t.products.allCategories },
              ...tree.map((c) => ({ value: c.id, label: `${" ".repeat(c.depth)}${ar ? c.name_ar : c.name_en}` })),
            ],
          },
          {
            name: "status",
            label: t.products.columns.status,
            value: params.status ?? "",
            options: [
              { value: "", label: t.products.allStatuses },
              { value: "active", label: t.status.active },
              { value: "draft", label: t.status.draft },
            ],
          },
          {
            name: "stock",
            label: t.products.columns.stock,
            value: params.stock ?? "",
            options: [
              { value: "", label: t.products.allStock },
              { value: "in", label: t.stock.in },
              { value: "low", label: t.stock.low },
              { value: "out", label: t.stock.out },
            ],
          },
          {
            name: "sort",
            label: t.products.sortLabel,
            value: params.sort === "updated" ? "" : params.sort,
            options: PRODUCT_SORTS.map((s) => ({ value: s === "updated" ? "" : s, label: t.products.sort[s] })),
          },
        ]}
        extra={
          <CsvButton
            action={exportProductsCsv}
            params={exportParams}
            filename="products"
            labels={{ idle: t.common.exportCsv, busy: t.common.exporting, empty: t.common.exportEmpty, failed: t.common.exportFailed }}
          />
        }
      />

      {list.rows.length === 0 ? (
        filtered ? (
          <EmptyPanel title={t.products.noMatchTitle} body={t.products.noMatchBody} />
        ) : (
          <EmptyPanel
            title={t.products.emptyTitle}
            body={t.products.emptyBody}
            action={
              <ButtonLink href="/admin/products/new" size="sm">
                {t.products.add}
              </ButtonLink>
            }
          />
        )
      ) : (
        <ProductsTable rows={list.rows} locale={locale} threshold={threshold} />
      )}

      <Pagination
        page={list.page}
        totalPages={list.totalPages}
        hrefFor={(page) => listHref("/admin/products", current, { page })}
        labels={{
          page: fmt(t.common.page, { page: list.page, total: Math.max(1, list.totalPages) }),
          prev: t.common.prev,
          next: t.common.next,
          nav: t.common.pagination,
        }}
      />
    </div>
  );
}
