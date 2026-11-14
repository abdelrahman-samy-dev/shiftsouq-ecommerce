/* ══════════════════════════════════════════════════════════════
   Admin Order Detail — /admin/orders/[id]
   Items with variant labels, contact and address, money breakdown,
   payment details, dates, and the allowed status changes.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { z } from "zod";
import { getOrderForAdmin } from "@/lib/dal/admin";
import { APP_NAME } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import type { Locale } from "@/lib/types";
import { formatDateTime, formatMoney, getAdminText } from "@/lib/admin/i18n";
import { isAllowedImageUrl } from "@/lib/admin/products";
import { OrderStatusPanel } from "../../components/OrderStatusPanel";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "../../components/StatusBadges";

export const metadata: Metadata = {
  title: `Order | ${APP_NAME} Admin`,
};

const card = "bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm";
const cardTitle = "px-5 py-4 border-b border-zinc-200 dark:border-zinc-800/80 text-base font-bold text-zinc-900 dark:text-white";

function Row({ label, children, ltr = false }: { label: string; children: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-zinc-500 shrink-0">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-white text-end break-words min-w-0" dir={ltr ? "ltr" : "auto"}>
        {children}
      </dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = getAdminText(locale);
  const currency = dict.common?.currency || "EGP";
  const money = (n: number) => formatMoney(n, locale, currency);
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const order = z.guid().safeParse(id).success ? await getOrderForAdmin(id) : null;

  if (!order) {
    return (
      <div className={`${card} p-12 text-center space-y-3`}>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.detail.notFound}</h1>
        <p className="text-sm text-zinc-500">{t.detail.notFoundBody}</p>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:underline">
          <BackIcon size={16} /> {t.detail.back}
        </Link>
      </div>
    );
  }

  const gov = GOVERNORATES.find((g) => g.value === order.governorate);
  const governorate = gov ? (locale === "ar" ? gov.ar : gov.en) : order.governorate;
  const state = { status: order.status, payment_status: order.payment_status, payment_method: order.payment_method };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
          <BackIcon size={16} /> {t.detail.back}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono break-all">
              {order.order_number}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {t.detail.placed}: {formatDateTime(order.created_at, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} text={t} />
            <PaymentStatusBadge status={order.payment_status} text={t} />
            <PaymentMethodBadge method={order.payment_method} text={t} long />
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <section className={card}>
        <h2 className={cardTitle}>{t.detail.actionsTitle}</h2>
        <div className="p-5">
          <OrderStatusPanel orderId={order.id} order={state} locale={locale} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Items + totals ───────────────────────────────── */}
        <section className={`${card} lg:col-span-2`}>
          <h2 className={cardTitle}>
            {t.detail.items} ({order.items.reduce((n, i) => n + i.quantity, 0)})
          </h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4 sm:px-5">
                <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image_url && isAllowedImageUrl(item.image_url) ? (
                    <Image src={item.image_url} alt={item.product_name} width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} className="text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    {item.product_slug ? (
                      <Link href={`/product/${item.product_slug}`} target="_blank" className="hover:underline" title={t.detail.viewProduct}>
                        {item.product_name}
                      </Link>
                    ) : (
                      item.product_name
                    )}
                  </div>
                  {item.variant_label && <div className="text-xs text-zinc-500 mt-0.5">{item.variant_label}</div>}
                  {item.sku && (
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5" dir="ltr">
                      {t.detail.sku}: {item.sku}
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 mt-1">
                    {money(item.unit_price)} × {item.quantity}
                  </div>
                </div>
                <div className="font-bold text-zinc-900 dark:text-white whitespace-nowrap">{money(item.unit_price * item.quantity)}</div>
              </li>
            ))}
          </ul>
          <dl className="border-t border-zinc-200 dark:border-zinc-800/80 px-5 py-3">
            <Row label={t.detail.subtotal}>{money(order.subtotal)}</Row>
            {order.discount_amount > 0 && (
              <Row label={order.promo_code ? `${t.detail.discount} (${order.promo_code})` : t.detail.discount}>
                −{money(order.discount_amount)}
              </Row>
            )}
            <Row label={t.detail.shipping}>{order.shipping_cost > 0 ? money(order.shipping_cost) : t.detail.free}</Row>
            {order.tax_amount > 0 && <Row label={t.detail.tax}>{money(order.tax_amount)}</Row>}
            <div className="flex items-center justify-between gap-4 pt-3 mt-2 border-t border-zinc-200 dark:border-zinc-800/80">
              <span className="font-bold text-zinc-900 dark:text-white">{t.detail.total}</span>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">{money(order.total)}</span>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          {/* ── Customer & address ───────────────────────────── */}
          <section className={card}>
            <h2 className={cardTitle}>{t.detail.contact}</h2>
            <dl className="px-5 py-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <Row label={t.detail.name}>{order.customer_name || t.orders.guest}</Row>
              <Row label={t.detail.email} ltr>
                {order.email ? (
                  <a href={`mailto:${encodeURIComponent(order.email)}`} className="hover:underline">
                    {order.email}
                  </a>
                ) : (
                  t.detail.none
                )}
              </Row>
              <Row label={t.detail.phone} ltr>
                {order.phone ? (
                  <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                    {order.phone}
                  </a>
                ) : (
                  t.detail.none
                )}
              </Row>
              <Row label={t.detail.account}>{order.has_account ? t.detail.registered : t.detail.guestCheckout}</Row>
            </dl>
          </section>

          <section className={card}>
            <h2 className={cardTitle}>{t.detail.address}</h2>
            <dl className="px-5 py-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <Row label={t.detail.governorate}>{governorate || t.detail.none}</Row>
              <Row label={t.detail.city}>{order.city || t.detail.none}</Row>
              <Row label={t.detail.street}>{order.address || t.detail.none}</Row>
              {order.country && <Row label={t.detail.country}>{order.country}</Row>}
            </dl>
            {order.notes && (
              <div className="px-5 pb-4">
                <div className="text-xs font-semibold text-zinc-500 mb-1">{t.detail.notes}</div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">{order.notes}</p>
              </div>
            )}
          </section>

          {/* ── Payment & dates ──────────────────────────────── */}
          <section className={card}>
            <h2 className={cardTitle}>{t.detail.paymentTitle}</h2>
            <dl className="px-5 py-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <Row label={t.detail.method}>{order.payment_method ? t.method[order.payment_method] : t.methodUnknown}</Row>
              <Row label={t.detail.paymentStatus}>{t.payment[order.payment_status]}</Row>
              <Row label={t.detail.transaction} ltr>
                <span className="font-mono text-xs">{order.transaction_id || t.detail.none}</span>
              </Row>
              {order.paymob_order_id && (
                <Row label={t.detail.paymobOrder} ltr>
                  <span className="font-mono text-xs">{order.paymob_order_id}</span>
                </Row>
              )}
              <Row label={t.detail.stock}>{order.stock_released ? t.detail.stockReleased : t.detail.stockReserved}</Row>
              <Row label={t.detail.placed}>{formatDateTime(order.created_at, locale)}</Row>
              <Row label={t.detail.updated}>{formatDateTime(order.updated_at, locale)}</Row>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
