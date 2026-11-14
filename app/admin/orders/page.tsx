/* ══════════════════════════════════════════════════════════════
   Admin Orders — /admin/orders
   ──────────────────────────────────────────────────────────────
   Orders with status, payment method and payment status; filters
   for all three, search by order number / name / email / phone,
   CSV export of the filtered list, and per-order actions.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Search, X } from "lucide-react";
import { getAllOrders, clampPage } from "@/lib/dal/admin";
import { getAllOrdersForExport } from "@/lib/actions/admin";
import { APP_NAME } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderState } from "@/lib/admin/orders";
import { fill, formatDateTime, formatMoney, getAdminText } from "@/lib/admin/i18n";
import type { OrderFilters } from "@/lib/admin/types";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { AdminFilterDropdown } from "../components/AdminFilterDropdown";
import { AdminPagination } from "../components/AdminPagination";
import { OrderActionsDropdown } from "../components/OrderActionsDropdown";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "../components/StatusBadges";

export const metadata: Metadata = {
  title: `Orders | ${APP_NAME} Admin`,
};

type SP = { page?: string; search?: string; status?: string; payment?: string; method?: string };
const pickState = (o: OrderState): OrderState => ({ status: o.status, payment_status: o.payment_status, payment_method: o.payment_method });
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = getAdminText(locale);
  const currency = dict.common?.currency || "EGP";

  const sp = await searchParams;
  const currentPage = clampPage(sp.page);
  const filters: OrderFilters = {
    search: str(sp.search),
    status: str(sp.status),
    payment: str(sp.payment),
    method: str(sp.method),
  };
  const hasFilters = Boolean(filters.search || filters.status || filters.payment || filters.method);

  const { orders, totalPages, count } = await getAllOrders({ page: currentPage, pageSize: 10, ...filters });
  const exportOrders = getAllOrdersForExport.bind(null, filters);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
            {dict.admin?.orders?.title || "Orders"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            {(dict.admin?.orders?.description || "Manage your store's orders ({count} total).").replace("{count}", count.toString())}
          </p>
        </div>
        <ExportCsvButton
          fetchData={exportOrders}
          filename="orders"
          locale={locale}
          label={dict.admin?.orders?.exportCsv || "Export CSV"}
          className="w-full sm:w-auto"
        />
      </div>

      {/* ── Filters & Search Bar ───────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2 shadow-sm flex flex-col lg:flex-row lg:items-center gap-2">
        <AdminSearchInput placeholder={t.filters.search} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:ms-auto">
          <AdminFilterDropdown
            param="status"
            options={ORDER_STATUSES.map((s) => ({ value: s, label: t.status[s] }))}
            defaultLabel={t.filters.allStatuses}
          />
          <AdminFilterDropdown
            param="payment"
            options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t.payment[s] }))}
            defaultLabel={t.filters.allPayments}
          />
          <AdminFilterDropdown
            param="method"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t.method[m] }))}
            defaultLabel={t.filters.allMethods}
          />
        </div>
        {hasFilters && (
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <X size={14} /> {t.filters.clear}
          </Link>
        )}
      </div>

      {/* ── Orders ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm">
        {orders.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-5 ring-8 ring-zinc-50/50 dark:ring-zinc-800/20">
              <Search size={28} className="text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              {dict.admin?.orders?.noOrdersFound || "No orders found"}
            </h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              {dict.admin?.orders?.noOrdersDesc || "Try adjusting your search or filters to find what you're looking for."}
            </p>
          </div>
        ) : (
          <>
            {/* Phones: one card per order */}
            <ul className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {orders.map((order) => (
                <li key={order.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-semibold text-zinc-900 dark:text-white hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      <div className="text-xs text-zinc-500 mt-0.5">{formatDateTime(order.created_at, locale)}</div>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      {formatMoney(order.total, locale, currency)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-zinc-900 dark:text-white truncate">{order.customer_name || t.orders.guest}</div>
                    <div className="text-xs text-zinc-500 truncate" dir="ltr">
                      {order.email || t.orders.noEmail}
                      {order.phone ? ` · ${order.phone}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.status} text={t} />
                    <PaymentStatusBadge status={order.payment_status} text={t} />
                    <PaymentMethodBadge method={order.payment_method} text={t} />
                    <div className="ms-auto">
                      <OrderActionsDropdown orderId={order.id} order={pickState(order)} locale={locale} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and up: table */}
            <table className="hidden md:table w-full text-sm text-start">
              <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                <tr>
                  <th className="px-4 lg:px-6 py-4 text-start">{t.orders.order}</th>
                  <th className="px-4 lg:px-6 py-4 text-start">{t.orders.customer}</th>
                  <th className="px-4 lg:px-6 py-4 text-start">{t.orders.status}</th>
                  <th className="px-4 lg:px-6 py-4 text-start">{t.orders.payment}</th>
                  <th className="px-4 lg:px-6 py-4 text-end">{t.orders.total}</th>
                  <th className="px-4 lg:px-6 py-4 text-end">
                    <span className="sr-only">{t.action.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 lg:px-6 py-4 align-top">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-semibold text-zinc-900 dark:text-white hover:underline whitespace-nowrap"
                      >
                        {order.order_number}
                      </Link>
                      <div className="text-xs text-zinc-500 mt-1 whitespace-nowrap">{formatDateTime(order.created_at, locale)}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 align-top max-w-[16rem]">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">{order.customer_name || t.orders.guest}</div>
                      <div className="text-zinc-500 text-xs mt-0.5 truncate" dir="ltr">
                        {order.email || t.orders.noEmail}
                      </div>
                      {order.phone && (
                        <div className="text-zinc-500 text-xs truncate" dir="ltr">
                          {order.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 align-top">
                      <OrderStatusBadge status={order.status} text={t} />
                    </td>
                    <td className="px-4 lg:px-6 py-4 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <PaymentStatusBadge status={order.payment_status} text={t} />
                        <PaymentMethodBadge method={order.payment_method} text={t} />
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 align-top text-end font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      {formatMoney(order.total, locale, currency)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 align-top text-end">
                      <OrderActionsDropdown orderId={order.id} order={pickState(order)} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="flex items-center justify-between gap-2 ps-4">
          <span className="text-xs text-zinc-500">{fill(t.filters.results, { count })}</span>
          <AdminPagination currentPage={currentPage} totalPages={totalPages} locale={locale} />
        </div>
      </div>
    </div>
  );
}
