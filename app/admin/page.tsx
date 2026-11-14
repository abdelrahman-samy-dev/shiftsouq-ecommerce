/* ══════════════════════════════════════════════════════════════
   Admin Dashboard Overview — /admin
   ──────────────────────────────────────────────────────────────
   Revenue counts only money received (paid online, or COD
   delivered) — see admin_order_stats() in the database. Also:
   orders needing work, low-stock variants, recent orders.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { AlertTriangle, ArrowUpRight, Banknote, DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { getAdminDashboardStats, LOW_STOCK_THRESHOLD } from "@/lib/dal/admin";
import { fill, formatDateTime, formatMoney, getAdminText } from "@/lib/admin/i18n";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "./components/StatusBadges";

export const metadata: Metadata = {
  title: `Dashboard | ${APP_NAME} Admin`,
};

const cardClass =
  "relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm";
const chip = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = getAdminText(locale);
  const isRTL = locale === "ar";
  const currency = dict.common?.currency || "EGP";
  const int = (n: number) => n.toLocaleString(isRTL ? "ar-EG" : "en-EG");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header ────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
          {dict.admin?.overview?.title || "Overview"}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
          {dict.admin?.overview?.description || "Here's what's happening with your store today."}
        </p>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.dashboard.revenue}</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            <span className="text-xl font-medium text-zinc-400 me-1">{currency}</span>
            {stats.revenue.toLocaleString(isRTL ? "ar-EG" : "en-EG", { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-xs text-zinc-500">{fill(t.dashboard.revenueHint, { count: int(stats.revenueOrders) })}</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.dashboard.orders}</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{int(stats.totalOrders)}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href="/admin/orders" className={`${chip} bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400`}>
              {fill(t.dashboard.toFulfil, { count: int(stats.toFulfil) })}
            </Link>
            {stats.awaitingPayment > 0 && (
              <Link
                href="/admin/orders?status=pending&payment=unpaid"
                className={`${chip} bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400`}
              >
                {fill(t.dashboard.awaitingPayment, { count: int(stats.awaitingPayment) })}
              </Link>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.dashboard.cashToCollect}</h3>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Banknote size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            <span className="text-xl font-medium text-zinc-400 me-1">{currency}</span>
            {stats.cashToCollect.toLocaleString(isRTL ? "ar-EG" : "en-EG", { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            <Link href="/admin/orders?method=cod&payment=unpaid" className="hover:underline">
              {t.method.cod}
            </Link>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t.dashboard.products} · {t.dashboard.users}
            </h3>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Package size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{int(stats.totalProducts)}</div>
            <div className="flex items-center gap-1 text-sm font-semibold text-zinc-500 pb-1">
              <Users size={14} /> {int(stats.totalUsers)}
            </div>
          </div>
          {stats.lowStockCount > 0 && (
            <div className="mt-2">
              <span className={`${chip} bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400`}>
                {fill(t.dashboard.lowStockCount, { count: int(stats.lowStockCount) })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* ── Recent Orders ──────────────────────────────────── */}
        <section className="xl:col-span-2 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">{t.dashboard.recentOrders}</h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              {dict.admin?.viewAllOrders || "View all"} <ArrowUpRight size={14} className={isRTL ? "-scale-x-100" : ""} />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag size={28} className="text-zinc-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">{dict.admin?.overview?.noOrdersYet || "No orders yet"}</h3>
              <p className="text-zinc-500 text-sm">{dict.admin?.overview?.noOrdersYetDesc || "When customers place orders, they will appear here."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <div className="min-w-0 sm:w-56">
                      <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">{order.order_number}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">
                        {order.customer_name || t.orders.guest} · {formatDateTime(order.created_at, locale)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <OrderStatusBadge status={order.status} text={t} />
                      <PaymentStatusBadge status={order.payment_status} text={t} />
                      <PaymentMethodBadge method={order.payment_method} text={t} />
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white whitespace-nowrap">{formatMoney(order.total, locale, currency)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Low stock ──────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-transparent">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> {t.dashboard.lowStockTitle}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">{fill(t.dashboard.lowStockDesc, { n: LOW_STOCK_THRESHOLD })}</p>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">{fill(t.dashboard.lowStockEmpty, { n: LOW_STOCK_THRESHOLD })}</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {stats.lowStock.map((v) => {
                const name = isRTL ? v.product_name_ar : v.product_name_en;
                const label = [v.size, v.color_en].filter(Boolean).join(" / ");
                const href = `/admin/products?search=${encodeURIComponent(v.product_name_en)}&edit=${v.product_id}`;
                return (
                  <li key={v.id}>
                    <Link href={href} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {name}
                          {!v.product_active && <span className="ms-2 text-[10px] font-bold uppercase text-zinc-400">{t.dashboard.hidden}</span>}
                        </div>
                        <div className="text-xs text-zinc-500 truncate" dir="ltr">
                          {label ? `${label} · ` : ""}
                          {v.sku}
                        </div>
                      </div>
                      <span
                        className={`${chip} whitespace-nowrap ${
                          v.stock === 0
                            ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {v.stock === 0 ? t.dashboard.outOfStock : fill(t.dashboard.left, { n: int(v.stock) })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
