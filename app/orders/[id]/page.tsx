/* ══════════════════════════════════════════════════════════════
   Order details — /orders/[id] (account area)
   Status timeline, items with their Arabic names in Arabic,
   delivery address, totals, and — for pending orders — complete
   payment / cancel. Only the buyer's own orders (DAL + RLS).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { getMyOrder, getPaymentAvailability } from "@/lib/dal/orders";
import { OrderActions } from "@/components/orders/OrderActions";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { formatOrderDate, formatTime, methodLabel, paymentStatusLabel } from "@/components/orders/order-copy";
import { formatAddress, formatEgyptianMobile, formatMoney } from "@/components/checkout/checkout-rules";
import { metaText, panelTitle, totalRow } from "@/components/checkout/ui";
import { AccountShell } from "@/app/account/_components/AccountShell";
import { accountCopy } from "@/app/account/_components/copy";
import { requireAccountUser } from "@/app/account/_components/require-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: accountCopy(await getLocale()).ordersTitle, robots: { index: false, follow: false } };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const lang = locale === "ar" ? "ar" : "en";
  const t = accountCopy(lang);
  const user = await requireAccountUser(`/orders/${encodeURIComponent(id)}`);
  const order = await getMyOrder(id);
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, lang);
  const online = order.paymentMethod === "card" || order.paymentMethod === "wallet";
  const paymentAvailable = online ? getPaymentAvailability()[order.paymentMethod as "card" | "wallet"] : false;

  return (
    <AccountShell
      locale={locale}
      user={user}
      active="orders"
      title={
        <span dir="ltr" className="font-sans text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium tabular-nums tracking-tight">
          {order.orderNumber}
        </span>
      }
      intro={`${t.placed}: ${formatOrderDate(order.createdAt, lang, true)}`}
      aside={
        <Link href="/orders" className="inline-flex min-h-10 items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="size-4 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden="true" />
          {t.backToOrders}
        </Link>
      }
    >
      <section aria-label={t.status} className="border-y border-border py-8">
        <OrderTimeline status={order.status} createdAt={order.createdAt} updatedAt={order.updatedAt} lang={lang} />
      </section>

      {order.canPay || order.canCancel ? (
        <div className="flex flex-col gap-4 border-b border-border py-6 md:flex-row md:items-center md:justify-between">
          {order.payBy ? <p className="text-sm text-text-secondary">{t.payBy(formatTime(order.payBy, lang))}</p> : <span />}
          <OrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            paymentMethod={order.paymentMethod}
            canPay={order.canPay}
            canCancel={order.canCancel}
            paymentAvailable={paymentAvailable}
            locale={lang}
          />
        </div>
      ) : null}

      <div className="grid gap-x-14 gap-y-10 pt-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="order-items">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="order-items" className={panelTitle}>
              {t.itemsTitle}
            </h2>
            <span className={metaText}>{t.items(order.itemCount)}</span>
          </div>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {order.items.map((item, i) => {
              const name = lang === "ar" ? item.nameAr || item.name : item.name;
              const label = lang === "ar" ? item.labelAr || item.label : item.label;
              return (
                <li key={i} className="flex gap-4 py-5">
                  <div className="relative h-[6.25rem] w-20 shrink-0 overflow-hidden bg-surface">
                    {item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-cover" /> : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[0.9375rem] text-text-primary">{name}</p>
                    {label ? <p className={metaText}>{label}</p> : null}
                    <p className={metaText}>
                      {t.qty(item.quantity)} · {money(item.unitPrice)}
                    </p>
                  </div>
                  <p className="t-price shrink-0 text-sm">{money(item.unitPrice * item.quantity)}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="flex flex-col gap-8 xl:bg-surface xl:p-7">
          <section className="flex flex-col gap-2">
            <h2 className="t-eyebrow">{t.payment}</h2>
            <p className="text-sm text-text-primary">{methodLabel(order.paymentMethod, lang)}</p>
            <p className={metaText}>{paymentStatusLabel(order.paymentStatus, order.paymentMethod, lang, order.status)}</p>
          </section>
          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="t-eyebrow">{t.deliveryAddress}</h2>
            <address className="text-sm not-italic leading-relaxed text-text-secondary">
              {order.delivery.name ? <span className="block text-text-primary">{order.delivery.name}</span> : null}
              <span className="block">{formatAddress(order.delivery, lang)}</span>
              {order.delivery.phone ? (
                <span className="block text-start rtl:text-end" dir="ltr">
                  {formatEgyptianMobile(order.delivery.phone)}
                </span>
              ) : null}
            </address>
          </section>
          <section aria-label={t.summary} className="flex flex-col gap-3 border-t border-border pt-6">
            <div className={totalRow}>
              <span className="text-text-secondary">{t.subtotal}</span>
              <span className="t-price">{money(order.subtotal)}</span>
            </div>
            {order.discount > 0 ? (
              <div className={totalRow}>
                <span className="text-text-secondary">{t.discount}</span>
                <span className="t-price text-accent">−{money(order.discount)}</span>
              </div>
            ) : null}
            <div className={totalRow}>
              <span className="text-text-secondary">{t.delivery}</span>
              <span className="t-price">{order.shippingCost === 0 ? t.free : money(order.shippingCost)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <span className="font-medium">{t.total}</span>
              <span className="t-price text-lg">{money(order.total)}</span>
            </div>
          </section>
          <p className="border-t border-border pt-6 text-[0.8125rem] text-text-muted">
            {t.needHelp}{" "}
            <Link href="/contact" className="text-text-primary underline underline-offset-4">
              {t.contact}
            </Link>
          </p>
        </aside>
      </div>
    </AccountShell>
  );
}
