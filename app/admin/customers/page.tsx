/* ══════════════════════════════════════════════════════════════
   Admin customers — /admin/customers
   Customer accounts with order count, money spent (same revenue
   rule as the overview), last order and sign-up date. Search,
   sortable columns, CSV export of the current search.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { clampPage, getCustomers, isCustomerSort, type CustomerSort } from "@/lib/dal/admin";
import { exportCustomers } from "@/lib/actions/admin-ops";
import { fill, formatAmount, formatDate, formatInt, getAdminText } from "@/lib/admin/i18n";
import { getLocale } from "@/lib/i18n/server";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { DataTable, type SortDir } from "../components/DataTable";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { AdminEmptyState, Avatar, FilterBar, PageHeader, Panel } from "../components/ui";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getAdminText(locale);
  const C = t.customers;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const sort: CustomerSort = isCustomerSort(sp.sort) ? sp.sort : "joined";
  const dir: SortDir = sp.dir === "asc" ? "asc" : "desc";
  const page = clampPage(sp.page);

  const { customers, count, totalPages } = await getCustomers({ search, sort, dir, page, pageSize: PAGE_SIZE });
  const exportRows = exportCustomers.bind(null, search);

  const href = (key: string, d: SortDir) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (key !== "joined" || d !== "desc") {
      params.set("sort", key);
      params.set("dir", d);
    }
    const s = params.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={C.title}
        description={fill(C.description, { count: formatInt(count, locale) })}
        actions={<ExportCsvButton fetchData={exportRows} filename="customers" locale={locale} label={t.common.exportCsv} />}
      />

      <FilterBar end={<span>{C.guestNote}</span>}>
        <AdminSearchInput placeholder={C.search} className="sm:w-96" />
      </FilterBar>

      <Panel padded={false}>
        {customers.length === 0 ? (
          search ? (
            <AdminEmptyState icon={<Users />} title={C.noMatchTitle} body={C.noMatchBody} />
          ) : (
            <AdminEmptyState icon={<Users />} title={C.emptyTitle} body={C.emptyBody} />
          )
        ) : (
          <>
            <DataTable
              caption={C.title}
              rows={customers}
              rowKey={(c) => c.id}
              sort={{ key: sort, dir, href, sortLabel: t.common.sortBy }}
              columns={[
                {
                  key: "name",
                  header: C.col.name,
                  sortKey: "name",
                  firstDir: "asc",
                  cell: (c) => (
                    <Link href={`/admin/customers/${c.id}`} className="group flex min-w-0 items-center gap-3">
                      <Avatar name={c.name} email={c.email} size={32} />
                      <span className="min-w-0">
                        <span className="block max-w-56 truncate text-text-primary group-hover:underline">{c.name || C.noName}</span>
                        <span className="block max-w-56 truncate text-[0.75rem] text-text-muted md:hidden" dir="ltr">
                          {c.email || c.phone}
                        </span>
                      </span>
                    </Link>
                  ),
                },
                {
                  key: "email",
                  header: C.col.email,
                  sortKey: "email",
                  firstDir: "asc",
                  hideBelow: "md",
                  cell: (c) => (
                    <span className="block max-w-64 truncate text-text-secondary" dir="ltr">
                      {c.email || t.common.none}
                    </span>
                  ),
                },
                {
                  key: "phone",
                  header: C.col.phone,
                  hideBelow: "xl",
                  cell: (c) => (
                    <span className="whitespace-nowrap tabular-nums text-text-secondary" dir="ltr">
                      {c.phone || t.common.none}
                    </span>
                  ),
                },
                {
                  key: "orders",
                  header: C.col.orders,
                  sortKey: "orders",
                  align: "end",
                  cell: (c) => <span className="tabular-nums">{formatInt(c.ordersCount, locale)}</span>,
                },
                {
                  key: "spent",
                  header: C.col.spent,
                  sortKey: "spent",
                  align: "end",
                  cell: (c) => <span className="whitespace-nowrap font-medium tabular-nums">{formatAmount(c.totalSpent, locale)}</span>,
                },
                {
                  key: "last",
                  header: C.col.lastOrder,
                  sortKey: "last_order",
                  hideBelow: "lg",
                  cell: (c) => <span className="whitespace-nowrap text-text-secondary">{c.lastOrderAt ? formatDate(c.lastOrderAt, locale) : t.common.none}</span>,
                },
                {
                  key: "joined",
                  header: C.col.joined,
                  sortKey: "joined",
                  hideBelow: "lg",
                  cell: (c) => <span className="whitespace-nowrap text-text-secondary">{formatDate(c.joinedAt, locale)}</span>,
                },
              ]}
            />
            {totalPages > 1 ? (
              <div className="border-t border-border">
                <AdminPagination currentPage={page} totalPages={totalPages} locale={locale} />
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  );
}
