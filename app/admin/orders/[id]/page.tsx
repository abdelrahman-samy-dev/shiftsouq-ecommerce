/* ══════════════════════════════════════════════════════════════
   Admin order detail — /admin/orders/[id]
   Items and totals, the allowed status changes, a timeline from
   the audit log, customer / delivery / payment details, the
   internal note (never shown to the customer) and print links.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FileText, Package, Printer } from "lucide-react";
import { z } from "zod";
import { getOrderForAdmin, getOrderTimeline } from "@/lib/dal/admin";
import { fill, formatAmount, formatDateTime, formatInt, getAdminText, type AdminText } from "@/lib/admin/i18n";
import { adminImage } from "@/lib/admin/images";
import { isOrderStatus, isPaymentStatus } from "@/lib/admin/orders";
import type { AuditEntry } from "@/lib/admin/types";
import { getLocale } from "@/lib/i18n/server";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";
import { adminButton } from "../../components/buttons";
import { OrderStatusPanel } from "../../components/OrderStatusPanel";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "../../components/StatusBadges";
import { AdminEmptyState, KeyValue, KeyValueList, PageHeader, Panel } from "../../components/ui";
import { OrderNote } from "./OrderNote";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.orders.order };
}

function timelineText(e: AuditEntry, t: AdminText): { title: string; detail?: string } {
  const d = e.data as Record<string, unknown>;
  switch (e.action) {
    case "order.status": {
      const to = isOrderStatus(d.to) ? t.status[d.to] : String(d.to ?? "");
      const pay = isPaymentStatus(d.payment_to) ? fill(t.timeline.paymentTo, { to: t.payment[d.payment_to] }) : undefined;
      return { title: fill(t.timeline.status, { to }), detail: pay };
    }
    case "order.cash_collected":
      return { title: t.timeline.cash };
    case "order.note":
      return { title: t.timeline.note };
    default:
      return { title: t.activity.actions[e.action] ?? e.action };
  }
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const t = getAdminText(locale);
  const valid = z.guid().safeParse(id).success;
  const [order, timeline] = valid ? await Promise.all([getOrderForAdmin(id), getOrderTimeline(id)]) : [null, []];
  const money = (n: number) => formatAmount(n, locale, 2);

  if (!order) {
    return (
      <Panel>
        <AdminEmptyState
          icon={<Package />}
          title={t.detail.notFound}
          body={t.detail.notFoundBody}
          action={
            <Link href="/admin/orders" className={adminButton("outline", "sm")}>
              {t.detail.back}
            </Link>
          }
        />
      </Panel>
    );
  }

  const gov = GOVERNORATES.find((g) => g.value === order.governorate);
  const governorate = gov ? (locale === "ar" ? gov.ar : gov.en) : order.governorate;
  const state = { status: order.status, payment_status: order.payment_status, payment_method: order.payment_method };
  const units = order.items.reduce((n, i) => n + i.quantity, 0);

  const events: { at: string | null; title: string; detail?: string; who?: string }[] = [
    { at: order.created_at, title: t.timeline.placed, who: order.customer_name || t.orders.guest },
    ...timeline.map((e) => {
      const text = timelineText(e, t);
      return { at: e.createdAt, ...text, who: e.actor ? e.actor.name || e.actor.email || t.timeline.system : t.timeline.system };
    }),
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: t.detail.back }}
        title={
          <span dir="ltr" className="font-sans text-[1.625rem] font-medium tracking-tight tabular-nums sm:text-[1.875rem]">
            {order.order_number}
          </span>
        }
        description={`${t.detail.placed} ${formatDateTime(order.created_at, locale)}`}
        meta={
          <>
            <OrderStatusBadge status={order.status} text={t} />
            <PaymentStatusBadge status={order.payment_status} text={t} />
            <PaymentMethodBadge method={order.payment_method} text={t} long />
          </>
        }
        actions={
          <>
            <Link href={`/admin/orders/${order.id}/print`} className={adminButton("outline", "sm")}>
              <Printer aria-hidden="true" strokeWidth={1.75} />
              {t.orderList.packingSlip}
            </Link>
            <Link href={`/admin/orders/${order.id}/print?doc=invoice`} className={adminButton("outline", "sm")}>
              <FileText aria-hidden="true" strokeWidth={1.75} />
              {t.orderList.invoice}
            </Link>
          </>
        }
      />

      <Panel title={t.detail.actionsTitle} className="mb-4 lg:mb-6">
        <OrderStatusPanel orderId={order.id} order={state} locale={locale} />
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <div className="space-y-4 lg:space-y-6 xl:col-span-2">
          {/* ── Items + totals ──────────────────────────────── */}
          <Panel title={`${t.detail.items} · ${formatInt(units, locale)}`} padded={false}>
            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const img = adminImage(item.image_url);
                return (
                  <li key={item.id} className="flex gap-4 px-4 py-4 sm:px-5">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-[2px] bg-surface">
                      {img ? <Image src={img.src} unoptimized={img.unoptimized} alt="" fill sizes="64px" className="object-cover" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.875rem] text-text-primary">
                        {item.product_slug ? (
                          <Link href={`/product/${item.product_slug}`} target="_blank" className="hover:underline" title={t.detail.viewProduct}>
                            {item.product_name}
                          </Link>
                        ) : (
                          item.product_name
                        )}
                      </p>
                      {item.variant_label ? <p className="text-[0.8125rem] text-text-muted">{item.variant_label}</p> : null}
                      {item.sku ? (
                        <p className="text-[0.75rem] tabular-nums text-text-faint">
                          <bdi dir="ltr">{item.sku}</bdi>
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-[0.875rem] font-medium tabular-nums">{money(item.unit_price * item.quantity)}</p>
                      <p className="text-[0.75rem] tabular-nums text-text-muted">
                        {money(item.unit_price)} × {formatInt(item.quantity, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-2 border-t border-border px-4 py-4 text-[0.8125rem] sm:px-5">
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">{t.detail.subtotal}</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              {order.discount_amount > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    {t.detail.discount}
                    {order.promo_code ? (
                      <span className="ms-1.5 rounded-[2px] bg-surface px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-text-secondary" dir="ltr">
                        {order.promo_code}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="tabular-nums text-accent">−{money(order.discount_amount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">{t.detail.shipping}</dt>
                <dd className="tabular-nums">{order.shipping_cost > 0 ? money(order.shipping_cost) : t.detail.free}</dd>
              </div>
              {order.tax_amount > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">{t.detail.tax}</dt>
                  <dd className="tabular-nums">{money(order.tax_amount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-[0.9375rem] font-medium">
                <dt>{t.detail.total}</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          {/* ── Timeline ────────────────────────────────────── */}
          <Panel title={t.timeline.title}>
            <ol className="relative">
              {events.map((e, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < events.length - 1 ? <span aria-hidden="true" className="absolute start-[5px] top-4 bottom-0 w-px bg-border" /> : null}
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 size-[11px] shrink-0 rounded-full border-2", i === events.length - 1 ? "border-text-primary bg-text-primary" : "border-border-hover bg-surface-elevated")}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] text-text-primary">{e.title}</p>
                    {e.detail ? <p className="text-[0.8125rem] text-text-secondary">{e.detail}</p> : null}
                    <p className="mt-0.5 text-[0.75rem] text-text-muted">
                      {formatDateTime(e.at, locale)}
                      {e.who ? ` · ${fill(t.timeline.by, { name: e.who })}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <Panel
            title={t.detail.contact}
            actions={
              order.customer_id ? (
                <Link href={`/admin/customers/${order.customer_id}`} className="text-[0.8125rem] text-text-muted hover:text-text-primary">
                  {t.orderList.viewCustomer}
                </Link>
              ) : null
            }
          >
            <KeyValueList className="-my-2.5">
              <KeyValue label={t.detail.name}>{order.customer_name || t.orders.guest}</KeyValue>
              <KeyValue label={t.detail.email} ltr>
                {order.email ? (
                  <a href={`mailto:${encodeURIComponent(order.email)}`} className="hover:underline">
                    {order.email}
                  </a>
                ) : (
                  t.detail.none
                )}
              </KeyValue>
              <KeyValue label={t.detail.phone} ltr>
                {order.phone ? (
                  <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="tabular-nums hover:underline">
                    {order.phone}
                  </a>
                ) : (
                  t.detail.none
                )}
              </KeyValue>
              <KeyValue label={t.detail.account}>{order.has_account ? t.detail.registered : t.detail.guestCheckout}</KeyValue>
            </KeyValueList>
          </Panel>

          <Panel title={t.detail.address}>
            <address className="not-italic text-[0.8125rem] leading-relaxed text-text-primary">
              {order.customer_name ? <span className="block"><bdi>{order.customer_name}</bdi></span> : null}
              {order.address ? <span className="block whitespace-pre-line"><bdi>{order.address}</bdi></span> : null}
              <span className="block">
                {[order.city, governorate].filter(Boolean).length
                  ? [order.city, governorate].filter(Boolean).map((part, i) => (
                      <span key={i}>
                        {i > 0 ? (locale === "ar" ? "، " : ", ") : null}
                        <bdi>{part}</bdi>
                      </span>
                    ))
                  : t.detail.none}
              </span>
              {order.country ? <span className="block text-text-muted">{order.country}</span> : null}
            </address>
          </Panel>

          <Panel title={t.detail.paymentTitle}>
            <KeyValueList className="-my-2.5">
              <KeyValue label={t.detail.method}>{order.payment_method ? t.method[order.payment_method] : t.methodUnknown}</KeyValue>
              <KeyValue label={t.detail.paymentStatus}>{t.payment[order.payment_status]}</KeyValue>
              {order.transaction_id ? (
                <KeyValue label={t.detail.transaction} ltr>
                  <span className="text-[0.75rem] tabular-nums">{order.transaction_id}</span>
                </KeyValue>
              ) : null}
              {order.paymob_order_id ? (
                <KeyValue label={t.detail.paymobOrder} ltr>
                  <span className="text-[0.75rem] tabular-nums">{order.paymob_order_id}</span>
                </KeyValue>
              ) : null}
              <KeyValue label={t.detail.stock}>{order.stock_released ? t.detail.stockReleased : t.detail.stockReserved}</KeyValue>
              <KeyValue label={t.detail.updated}>{formatDateTime(order.updated_at, locale)}</KeyValue>
            </KeyValueList>
          </Panel>

          <Panel title={t.note.title}>
            <OrderNote orderId={order.id} initial={order.notes ?? ""} locale={locale} />
          </Panel>
        </div>
      </div>
    </>
  );
}
