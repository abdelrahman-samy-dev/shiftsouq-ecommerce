/* ══════════════════════════════════════════════════════════════
   Admin overview — /admin
   ──────────────────────────────────────────────────────────────
   KPIs for today / 7 days / 30 days against the period before
   (revenue = paid online or COD delivered, not cancelled or
   refunded — same rule as admin_order_stats), work queues, a
   30-day revenue chart, best sellers and recent orders.
   Numbers come from SQL functions in 20261114040000_admin_ops.sql.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, CreditCard, Inbox, MessageSquareQuote, Package, ShoppingBag } from "lucide-react";
import { getDailyRevenue, getKpis, getQueueCounts, getRecentOrders, getTopProducts } from "@/lib/dal/admin";
import { averageOrderValue, isKpiPeriod, percentChange, type KpiPeriod } from "@/lib/admin/kpi";
import { fill, formatAmount, formatDate, formatDateTime, formatInt, formatPercent, getAdminText } from "@/lib/admin/i18n";
import { adminImage } from "@/lib/admin/images";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { DataTable } from "./components/DataTable";
import { RevenueChart } from "./components/RevenueChart";
import { OrderStatusBadge } from "./components/StatusBadges";
import { AdminEmptyState, PageHeader, Panel, StatCard, type StatDelta } from "./components/ui";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [{ period: rawPeriod }, locale] = await Promise.all([searchParams, getLocale()]);
  const period: KpiPeriod = isKpiPeriod(rawPeriod) ? rawPeriod : "7d";
  const t = getAdminText(locale);
  const o = t.overview;

  const [kpis, daily, queues, top, recent, settings] = await Promise.all([
    getKpis(period),
    getDailyRevenue(30),
    getQueueCounts(),
    getTopProducts("30d", 5),
    getRecentOrders(6),
    getStoreSettings(),
  ]);
  // The queue count uses the same threshold (admin_queue_counts reads store_settings.inventory).
  const lowStockThreshold = settings.inventory.lowStockThreshold;

  const { current: cur, previous: prev } = kpis;
  const aov = averageOrderValue(cur.revenue, cur.revenueOrders);
  const prevAov = averageOrderValue(prev.revenue, prev.revenueOrders);
  const delta = (a: number, b: number): StatDelta => {
    const change = percentChange(a, b);
    const label =
      change == null ? o.noComparison : Math.abs(change) < 0.0005 ? o.flat : fill(change > 0 ? o.up : o.down, { pct: formatPercent(change, locale) });
    return { change, label, context: change == null ? undefined : o.vs[period] };
  };

  const total30 = daily.reduce((s, d) => s + d.revenue, 0);
  const orders30 = daily.reduce((s, d) => s + d.orders, 0);

  const queueRows = [
    { key: "toFulfil", label: o.queue.toFulfil, count: queues.toFulfil, href: "/admin/orders?queue=fulfil", icon: ShoppingBag, tone: "ink" },
    { key: "awaiting", label: o.queue.awaiting, count: queues.awaitingPayment, href: "/admin/orders?queue=awaiting", icon: CreditCard, tone: "neutral" },
    { key: "cash", label: o.queue.cash, count: queues.cashToCollect, href: "/admin/orders?queue=cash", icon: Banknote, tone: "neutral" },
    {
      key: "lowStock",
      label: o.queue.lowStock,
      hint: fill(o.queue.lowStockHint, { n: formatInt(lowStockThreshold, locale) }),
      count: queues.lowStock,
      href: "/admin/inventory?stock=low",
      icon: AlertTriangle,
      tone: "warning",
    },
    { key: "reviews", label: o.queue.reviews, count: queues.pendingReviews, href: "/admin/reviews", icon: MessageSquareQuote, tone: "neutral" },
    { key: "messages", label: o.queue.messages, count: queues.unreadMessages, href: "/admin/messages?view=unread", icon: Inbox, tone: "ink" },
  ] as const;
  const waiting = queueRows.filter((q) => q.count > 0).length;

  return (
    <>
      <PageHeader
        title={o.title}
        description={fill(o.subtitle, { date: formatDate(new Date().toISOString(), locale) })}
        actions={
          <nav aria-label={o.period} className="inline-flex rounded-[3px] border border-border bg-surface-elevated p-0.5">
            {(["today", "7d", "30d"] as const).map((p) => (
              <Link
                key={p}
                href={p === "7d" ? "/admin" : `/admin?period=${p}`}
                scroll={false}
                aria-current={p === period ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-[2px] px-3 text-[0.8125rem] transition-colors pointer-coarse:h-10",
                  p === period ? "bg-text-primary text-background" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {o.periods[p]}
              </Link>
            ))}
          </nav>
        }
      />

      {/* ── KPIs ─────────────────────────────────────────── */}
      <section aria-label={o.periods[period]} className="grid grid-cols-2 gap-3 xl:grid-cols-4 lg:gap-4">
        <StatCard label={o.revenue} value={formatAmount(cur.revenue, locale)} delta={delta(cur.revenue, prev.revenue)} hint={o.revenueHint} />
        <StatCard label={o.orders} value={formatInt(cur.orders, locale)} delta={delta(cur.orders, prev.orders)} hint={o.ordersHint} href="/admin/orders" />
        <StatCard label={o.aov} value={formatAmount(aov, locale)} delta={delta(aov, prevAov)} hint={o.aovHint} />
        <StatCard
          label={o.newCustomers}
          value={formatInt(cur.newCustomers, locale)}
          delta={delta(cur.newCustomers, prev.newCustomers)}
          hint={o.newCustomersHint}
          href="/admin/customers"
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-3">
        {/* ── Revenue chart ──────────────────────────────── */}
        <Panel title={o.chartTitle} className="xl:col-span-2" actions={<span className="text-[0.8125rem] tabular-nums text-text-muted">{formatAmount(total30, locale)}</span>}>
          {total30 > 0 ? (
            <RevenueChart
              points={daily}
              locale={locale}
              title={o.chartTitle}
              summary={fill(o.chartDesc, { total: formatAmount(total30, locale), orders: formatInt(orders30, locale) })}
              labels={{ day: o.chartDay, revenue: o.chartRevenue, orders: o.chartOrders }}
            />
          ) : (
            <AdminEmptyState icon={<ShoppingBag />} title={o.chartEmpty} />
          )}
        </Panel>

        {/* ── Work queues ────────────────────────────────── */}
        <Panel title={o.queues} padded={false}>
          <ul className="divide-y divide-border">
            {queueRows.map((q) => {
              const Icon = q.icon;
              const active = q.count > 0;
              return (
                <li key={q.key}>
                  <Link href={q.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/60 sm:px-5">
                    <Icon aria-hidden="true" className={cn("size-4 shrink-0", active ? "text-text-primary" : "text-text-faint")} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[0.8125rem]", active ? "text-text-primary" : "text-text-muted")}>{q.label}</span>
                      {"hint" in q ? <span className="block text-[0.75rem] text-text-faint">{q.hint}</span> : null}
                    </span>
                    <span
                      className={cn(
                        "min-w-7 rounded-full px-2 text-center text-[0.75rem] font-medium leading-6 tabular-nums",
                        !active && "text-text-faint",
                        active && q.tone === "ink" && "bg-text-primary text-background",
                        active && q.tone === "warning" && "bg-warning-bg text-warning",
                        active && q.tone === "neutral" && "bg-surface text-text-primary",
                      )}
                    >
                      {formatInt(q.count, locale)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {waiting === 0 ? <p className="border-t border-border px-5 py-3 text-[0.75rem] text-text-muted">{o.allClear}</p> : null}
        </Panel>

        {/* ── Recent orders ──────────────────────────────── */}
        <Panel
          title={o.recentOrders}
          className="xl:col-span-2"
          padded={false}
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[0.8125rem] text-text-muted hover:text-text-primary">
              {o.viewAll}
              <ArrowUpRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" strokeWidth={1.75} />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <AdminEmptyState icon={<ShoppingBag />} title={o.noOrders} body={o.noOrdersBody} />
          ) : (
            <DataTable
              caption={o.recentOrders}
              rows={recent}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "order",
                  header: t.orders.order,
                  cell: (r) => (
                    <div className="min-w-0">
                      <Link href={`/admin/orders/${r.id}`} className="whitespace-nowrap font-medium tabular-nums text-text-primary hover:underline" dir="ltr">
                        {r.order_number}
                      </Link>
                      <p className="text-[0.75rem] text-text-muted">{formatDateTime(r.created_at, locale)}</p>
                    </div>
                  ),
                },
                {
                  key: "customer",
                  header: t.orders.customer,
                  hideBelow: "md",
                  cell: (r) => <span className="block max-w-48 truncate text-text-secondary">{r.customer_name || t.orders.guest}</span>,
                },
                { key: "status", header: t.orders.status, hideBelow: "sm", cell: (r) => <OrderStatusBadge status={r.status} text={t} /> },
                {
                  key: "total",
                  header: t.orders.total,
                  align: "end",
                  cell: (r) => <span className="whitespace-nowrap font-medium tabular-nums">{formatAmount(r.total, locale, 2)}</span>,
                },
              ]}
            />
          )}
        </Panel>

        {/* ── Top products ───────────────────────────────── */}
        <Panel title={o.topProducts} description={o.topProductsDesc} padded={false}>
          {top.length === 0 ? (
            <AdminEmptyState icon={<Package />} title={o.topEmpty} />
          ) : (
            <ol className="divide-y divide-border">
              {top.map((p, i) => {
                const name = locale === "ar" ? p.nameAr : p.nameEn;
                const img = adminImage(p.imageUrl);
                return (
                  <li key={p.productId ?? `${p.nameEn}-${i}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="w-4 shrink-0 text-[0.75rem] tabular-nums text-text-faint">{i + 1}</span>
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[2px] bg-surface">
                      {img ? <Image src={img.src} unoptimized={img.unoptimized} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      {p.productId ? (
                        <Link href={`/admin/products/${p.productId}`} className="block truncate text-[0.8125rem] text-text-primary hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="block truncate text-[0.8125rem] text-text-primary">{name}</span>
                      )}
                      <span className="block text-[0.75rem] tabular-nums text-text-muted">{formatAmount(p.revenue, locale)}</span>
                    </span>
                    <span className="shrink-0 text-[0.8125rem] font-medium tabular-nums">{fill(o.sold, { n: formatInt(p.units, locale) })}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
