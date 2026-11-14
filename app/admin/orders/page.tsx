/* ══════════════════════════════════════════════════════════════
   Admin orders — /admin/orders
   ──────────────────────────────────────────────────────────────
   Work-queue tabs (to fulfil, awaiting payment, cash to collect),
   search by order number / name / email / phone, filters for
   status, payment and method, sortable date and total, CSV export
   of the filtered list, and per-order actions (rules in
   lib/admin/orders.ts, re-checked by the server action).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getAllOrders, clampPage, isOrderQueue } from "@/lib/dal/admin";
import { getAllOrdersForExport } from "@/lib/actions/admin";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderState } from "@/lib/admin/orders";
import { fill, formatAmount, formatDateTime, formatInt, getAdminText } from "@/lib/admin/i18n";
import type { AdminOrderListItem, OrderFilters } from "@/lib/admin/types";
import { getLocale } from "@/lib/i18n/server";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { AdminFilterDropdown } from "../components/AdminFilterDropdown";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { DataTable, type SortDir } from "../components/DataTable";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { OrderActionsDropdown } from "../components/OrderActionsDropdown";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "../components/StatusBadges";
import { AdminEmptyState, FilterBar, PageHeader, Panel, TabsNav } from "../components/ui";
import { adminButton } from "../components/buttons";

export const metadata: Metadata = { title: "Orders" };

type SP = { page?: string; search?: string; status?: string; payment?: string; method?: string; queue?: string; sort?: string };
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const pickState = (o: OrderState): OrderState => ({ status: o.status, payment_status: o.payment_status, payment_method: o.payment_method });
const PAGE_SIZE = 20;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getAdminText(locale);
  const L = t.orderList;
  const currentPage = clampPage(sp.page);
  const queue = isOrderQueue(sp.queue) ? sp.queue : undefined;
  const sort = ["newest", "oldest", "total_desc", "total_asc"].includes(sp.sort ?? "") ? (sp.sort as string) : "newest";
  const filters: OrderFilters = {
    search: str(sp.search),
    status: str(sp.status),
    payment: str(sp.payment),
    method: str(sp.method),
    queue,
    sort,
  };
  const hasFilters = Boolean(filters.search || filters.status || filters.payment || filters.method);

  const { orders, totalPages, count } = await getAllOrders({ page: currentPage, pageSize: PAGE_SIZE, ...filters });
  const exportOrders = getAllOrdersForExport.bind(null, filters);

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { search: filters.search, status: filters.status, payment: filters.payment, method: filters.method, queue, sort: sort === "newest" ? undefined : sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };
  const sortState = {
    key: sort.startsWith("total") ? "total" : "date",
    dir: (sort === "oldest" || sort === "total_asc" ? "asc" : "desc") as SortDir,
    href: (key: string, dir: SortDir) => qs({ sort: key === "total" ? (dir === "asc" ? "total_asc" : "total_desc") : dir === "asc" ? "oldest" : undefined }),
    sortLabel: t.common.sortBy,
  };
  const govName = (key: string | null) => {
    const g = GOVERNORATES.find((x) => x.value === key);
    return g ? (locale === "ar" ? g.ar : g.en) : key;
  };

  const tabs = [
    { href: qs({ queue: undefined }), label: L.tabs.all, current: !queue },
    { href: qs({ queue: "fulfil" }), label: L.tabs.fulfil, current: queue === "fulfil" },
    { href: qs({ queue: "awaiting" }), label: L.tabs.awaiting, current: queue === "awaiting" },
    { href: qs({ queue: "cash" }), label: L.tabs.cash, current: queue === "cash" },
  ];

  const customerCell = (o: AdminOrderListItem) => (
    <div className="min-w-0 max-w-64">
      <p className="truncate text-text-primary"><bdi>{o.customer_name || t.orders.guest}</bdi></p>
      <p className="truncate text-[0.75rem] text-text-muted">
        <bdi dir="ltr">{o.email || o.phone || t.orders.noEmail}</bdi>
      </p>
    </div>
  );

  return (
    <>
      <PageHeader
        title={L.title}
        description={fill(L.description, { count: formatInt(count, locale) })}
        actions={<ExportCsvButton fetchData={exportOrders} filename="orders" locale={locale} label={t.common.exportCsv} />}
      />

      <TabsNav label={L.title} tabs={tabs} className="mb-4" />

      <FilterBar
        end={
          hasFilters ? (
            <Link href={qs({ search: undefined, status: undefined, payment: undefined, method: undefined })} className="hover:text-text-primary">
              {t.common.clearFilters}
            </Link>
          ) : null
        }
      >
        <AdminSearchInput placeholder={t.filters.search} className="sm:w-96" />
        <AdminFilterDropdown param="status" options={ORDER_STATUSES.map((s) => ({ value: s, label: t.status[s] }))} defaultLabel={t.filters.allStatuses} />
        <AdminFilterDropdown param="payment" options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t.payment[s] }))} defaultLabel={t.filters.allPayments} />
        <AdminFilterDropdown param="method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: t.method[m] }))} defaultLabel={t.filters.allMethods} />
      </FilterBar>

      <Panel padded={false}>
        {orders.length === 0 ? (
          hasFilters || queue ? (
            <AdminEmptyState
              icon={<ShoppingBag />}
              title={L.emptyTitle}
              body={L.emptyBody}
              action={
                <Link href="/admin/orders" className={adminButton("outline", "sm")}>
                  {t.common.clearFilters}
                </Link>
              }
            />
          ) : (
            <AdminEmptyState icon={<ShoppingBag />} title={L.emptyAllTitle} body={L.emptyAllBody} />
          )
        ) : (
          <>
            {/* Phones: one row card per order */}
            <ul className="divide-y divide-border md:hidden">
              {orders.map((o) => (
                <li key={o.id} className="flex gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-medium tabular-nums text-text-primary hover:underline" dir="ltr">
                        {o.order_number}
                      </Link>
                      <span className="whitespace-nowrap text-[0.8125rem] font-medium tabular-nums">{formatAmount(o.total, locale, 2)}</span>
                    </div>
                    <p className="truncate text-[0.8125rem] text-text-secondary">
                      <bdi>{o.customer_name || t.orders.guest}</bdi>
                      <span className="text-text-muted"> · {formatDateTime(o.created_at, locale)}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <OrderStatusBadge status={o.status} text={t} />
                      <PaymentStatusBadge status={o.payment_status} text={t} />
                      <PaymentMethodBadge method={o.payment_method} text={t} />
                    </div>
                  </div>
                  <OrderActionsDropdown orderId={o.id} order={pickState(o)} locale={locale} orderNumber={o.order_number} />
                </li>
              ))}
            </ul>

            <DataTable
              className="hidden md:block"
              caption={L.title}
              rows={orders}
              rowKey={(o) => o.id}
              sort={sortState}
              columns={[
                {
                  key: "order",
                  header: t.orders.order,
                  label: t.orders.date,
                  sortKey: "date",
                  cell: (o) => (
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-medium tabular-nums text-text-primary hover:underline" dir="ltr">
                        {o.order_number}
                      </Link>
                      <p className="whitespace-nowrap text-[0.75rem] text-text-muted">{formatDateTime(o.created_at, locale)}</p>
                    </div>
                  ),
                },
                { key: "customer", header: t.orders.customer, cell: customerCell },
                {
                  key: "region",
                  header: t.detail.governorate,
                  hideBelow: "xl",
                  cell: (o) => <span className="text-text-secondary">{govName(o.governorate) || t.detail.none}</span>,
                },
                { key: "status", header: t.orders.status, cell: (o) => <OrderStatusBadge status={o.status} text={t} /> },
                {
                  key: "payment",
                  header: t.orders.payment,
                  hideBelow: "lg",
                  cell: (o) => (
                    <div className="flex flex-col items-start gap-1">
                      <PaymentStatusBadge status={o.payment_status} text={t} />
                      <PaymentMethodBadge method={o.payment_method} text={t} />
                    </div>
                  ),
                },
                {
                  key: "total",
                  header: t.orders.total,
                  align: "end",
                  sortKey: "total",
                  cell: (o) => <span className="whitespace-nowrap font-medium tabular-nums">{formatAmount(o.total, locale, 2)}</span>,
                },
                {
                  key: "actions",
                  header: <span className="sr-only">{t.action.actions}</span>,
                  align: "end",
                  className: "w-12",
                  cell: (o) => <OrderActionsDropdown orderId={o.id} order={pickState(o)} locale={locale} orderNumber={o.order_number} />,
                },
              ]}
            />
            {totalPages > 1 ? (
              <div className="border-t border-border">
                <AdminPagination currentPage={currentPage} totalPages={totalPages} locale={locale} />
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  );
}
