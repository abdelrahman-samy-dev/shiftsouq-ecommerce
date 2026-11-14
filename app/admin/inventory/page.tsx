/* ══════════════════════════════════════════════════════════════
   Admin — Inventory: /admin/inventory
   Every variant in one table with inline stock editing, low-stock
   and sold-out filters (threshold from store settings), bulk
   "set stock" and CSV export. The URL holds the list state.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { CsvButton, ListToolbar } from "@/components/admin-catalog/controls";
import { InventoryTable } from "@/components/admin-catalog/InventoryTable";
import { EmptyPanel, PageHeader, Pagination, listHref } from "@/components/admin-catalog/ui";
import { exportInventoryCsv } from "@/lib/actions/admin-catalog";
import { INVENTORY_SORTS, parseInventoryParams } from "@/lib/admin/catalog-schema";
import { buildTree, flattenTree } from "@/lib/admin/catalog-utils";
import { fmt, formatCount, getCatalogText } from "@/lib/admin/i18n-catalog";
import { getCatalogCategories, listInventory } from "@/lib/dal/admin-catalog";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = getCatalogText(await getLocale());
  return { title: t.inventory.title };
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, locale, settings, categories] = await Promise.all([searchParams, getLocale(), getStoreSettings(), getCatalogCategories()]);
  const t = getCatalogText(locale);
  const ti = t.inventory;
  const params = parseInventoryParams(sp);
  const threshold = settings.inventory.lowStockThreshold;
  const list = await listInventory(params, threshold, categories);
  const ar = locale === "ar";
  const tree = flattenTree(buildTree(categories));

  const current = {
    search: params.search || null,
    category: params.category,
    stock: params.stock,
    sort: params.sort === "product" ? null : params.sort,
  };
  const exportParams = Object.fromEntries(Object.entries(current).filter((e): e is [string, string] => !!e[1]));
  const filtered = !!(params.search || params.category || params.stock);

  return (
    <div className="pb-16">
      <PageHeader
        title={ti.title}
        description={fmt(ti.description, { count: threshold })}
        meta={<span className="tabular-nums">{fmt(t.common.results, { count: formatCount(list.count, locale) })}</span>}
      />
      <ListToolbar
        search={params.search}
        searchLabel={t.common.search}
        searchPlaceholder={ti.searchPlaceholder}
        clearLabel={t.common.clearFilters}
        selects={[
          {
            name: "stock",
            label: ti.columns.stock,
            value: params.stock ?? "",
            options: [
              { value: "", label: ti.allStock },
              { value: "low", label: ti.low },
              { value: "out", label: ti.out },
            ],
          },
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
            name: "sort",
            label: t.products.sortLabel,
            value: params.sort === "product" ? "" : params.sort,
            options: INVENTORY_SORTS.map((s) => ({ value: s === "product" ? "" : s, label: ti.sort[s] })),
          },
        ]}
        extra={
          <CsvButton
            action={exportInventoryCsv}
            params={exportParams}
            filename="inventory"
            labels={{ idle: t.common.exportCsv, busy: t.common.exporting, empty: t.common.exportEmpty, failed: t.common.exportFailed }}
          />
        }
      />
      {list.rows.length === 0 ? (
        filtered ? <EmptyPanel title={ti.noMatchTitle} body={ti.noMatchBody} /> : <EmptyPanel title={ti.emptyTitle} body={ti.emptyBody} />
      ) : (
        <InventoryTable rows={list.rows} locale={locale} threshold={threshold} />
      )}
      <Pagination
        page={list.page}
        totalPages={list.totalPages}
        hrefFor={(page) => listHref("/admin/inventory", current, { page })}
        labels={{ page: fmt(t.common.page, { page: list.page, total: Math.max(1, list.totalPages) }), prev: t.common.prev, next: t.common.next, nav: t.common.pagination }}
      />
    </div>
  );
}
