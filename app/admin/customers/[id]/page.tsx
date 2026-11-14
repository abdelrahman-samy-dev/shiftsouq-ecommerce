/* ══════════════════════════════════════════════════════════════
   Admin customer detail — /admin/customers/[id]
   Profile, totals, saved addresses (address book + the address
   saved at checkout) and every order the account placed.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ShoppingBag, UserRound } from "lucide-react";
import { z } from "zod";
import { getCustomerDetail } from "@/lib/dal/admin";
import { averageOrderValue } from "@/lib/admin/kpi";
import { countsAsRevenue } from "@/lib/admin/orders";
import { fill, formatAmount, formatDate, formatDateTime, formatInt, getAdminText } from "@/lib/admin/i18n";
import { getLocale } from "@/lib/i18n/server";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { adminButton } from "../../components/buttons";
import { DataTable } from "../../components/DataTable";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/StatusBadges";
import { AdminEmptyState, Avatar, KeyValue, KeyValueList, PageHeader, Panel, StatCard, Tag } from "../../components/ui";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const t = getAdminText(locale);
  const C = t.customers;
  const customer = z.guid().safeParse(id).success ? await getCustomerDetail(id) : null;

  if (!customer) {
    return (
      <Panel>
        <AdminEmptyState
          icon={<UserRound />}
          title={C.notFound}
          body={C.notFoundBody}
          action={
            <Link href="/admin/customers" className={adminButton("outline", "sm")}>
              {C.back}
            </Link>
          }
        />
      </Panel>
    );
  }

  const gov = (key: string | null) => {
    const g = GOVERNORATES.find((x) => x.value === key);
    return g ? (locale === "ar" ? g.ar : g.en) : key;
  };
  const sep = locale === "ar" ? "، " : ", ";
  const aov = averageOrderValue(customer.totalSpent, customer.orders.filter(countsAsRevenue).length);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: C.back }}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={customer.name} email={customer.email} size={48} className="hidden sm:inline-grid" />
            <span>{customer.name || C.noName}</span>
          </span>
        }
        description={
          <>
            {customer.email ? <bdi dir="ltr">{customer.email}</bdi> : null}
            {customer.email ? " · " : null}
            {C.col.joined} {formatDate(customer.joinedAt, locale)}
          </>
        }
        actions={
          customer.email ? (
            <a href={`mailto:${encodeURIComponent(customer.email)}`} className={adminButton("outline", "sm")}>
              {t.detail.email}
            </a>
          ) : null
        }
      />

      <section className="mb-4 grid grid-cols-2 gap-3 lg:mb-6 lg:grid-cols-4 lg:gap-4">
        <StatCard label={C.col.orders} value={formatInt(customer.ordersCount, locale)} hint={t.overview.ordersHint} />
        <StatCard label={C.col.spent} value={formatAmount(customer.totalSpent, locale)} />
        <StatCard label={C.aov} value={formatAmount(aov, locale)} />
        <StatCard label={C.col.lastOrder} value={<span className="text-[1.125rem] lg:text-[1.25rem]">{customer.lastOrderAt ? formatDate(customer.lastOrderAt, locale) : t.common.none}</span>} />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <Panel title={C.orders} className="xl:col-span-2" padded={false}>
          {customer.orders.length === 0 ? (
            <AdminEmptyState icon={<ShoppingBag />} title={C.noOrders} />
          ) : (
            <DataTable
              caption={C.orders}
              rows={customer.orders}
              rowKey={(o) => o.id}
              columns={[
                {
                  key: "order",
                  header: t.orders.order,
                  cell: (o) => (
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-medium tabular-nums hover:underline" dir="ltr">
                        {o.order_number}
                      </Link>
                      <p className="whitespace-nowrap text-[0.75rem] text-text-muted">{formatDateTime(o.created_at, locale)}</p>
                    </div>
                  ),
                },
                { key: "status", header: t.orders.status, cell: (o) => <OrderStatusBadge status={o.status} text={t} /> },
                { key: "payment", header: t.orders.payment, hideBelow: "sm", cell: (o) => <PaymentStatusBadge status={o.payment_status} text={t} /> },
                {
                  key: "total",
                  header: t.orders.total,
                  align: "end",
                  cell: (o) => <span className="whitespace-nowrap font-medium tabular-nums">{formatAmount(o.total, locale, 2)}</span>,
                },
              ]}
            />
          )}
        </Panel>

        <div className="space-y-4 lg:space-y-6">
          <Panel title={C.profile}>
            <KeyValueList className="-my-2.5">
              <KeyValue label={t.detail.email} ltr>
                {customer.email || t.common.none}
              </KeyValue>
              <KeyValue label={t.detail.phone} ltr>
                {customer.phone ? <span className="tabular-nums">{customer.phone}</span> : t.common.none}
              </KeyValue>
              <KeyValue label={C.location}>{[customer.city, customer.country].filter(Boolean).join(sep) || t.common.none}</KeyValue>
              <KeyValue label={C.col.joined}>{formatDate(customer.joinedAt, locale)}</KeyValue>
              <KeyValue label={C.lastSignIn}>{customer.lastSignInAt ? formatDateTime(customer.lastSignInAt, locale) : t.common.never}</KeyValue>
            </KeyValueList>
          </Panel>

          <Panel title={C.addresses} padded={false}>
            {customer.addresses.length === 0 ? (
              <p className="px-4 py-5 text-[0.8125rem] text-text-muted sm:px-5">{C.noAddresses}</p>
            ) : (
              <ul className="divide-y divide-border">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="flex gap-3 px-4 py-4 sm:px-5">
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {a.label ? <span className="font-medium">{a.label}</span> : null}
                        {a.isDefault ? <Tag tone="ink">{C.default}</Tag> : null}
                        {a.source === "checkout" ? <Tag tone="neutral">{C.savedAtCheckout}</Tag> : null}
                      </div>
                      <address className="not-italic text-text-secondary">
                        {a.fullName ? <span className="block text-text-primary"><bdi>{a.fullName}</bdi></span> : null}
                        <span className="block">
                          <bdi>{a.address}</bdi>
                          {a.apartment ? (
                            <>
                              {sep}
                              {fill(C.apartment, { value: a.apartment })}
                            </>
                          ) : null}
                        </span>
                        <span className="block">
                          {[a.city, gov(a.governorate)].filter(Boolean).map((part, i) => (
                            <span key={i}>
                              {i > 0 ? sep : null}
                              <bdi>{part}</bdi>
                            </span>
                          ))}
                        </span>
                        {a.postalCode ? <span className="block">{fill(C.postal, { value: a.postalCode })}</span> : null}
                        {a.phone ? (
                          <span className="block tabular-nums">
                            <bdi dir="ltr">{a.phone}</bdi>
                          </span>
                        ) : null}
                      </address>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
