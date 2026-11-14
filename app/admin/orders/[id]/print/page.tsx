/* ══════════════════════════════════════════════════════════════
   Printable packing slip / invoice — /admin/orders/[id]/print
   ──────────────────────────────────────────────────────────────
   ?doc=invoice shows prices and totals; the packing slip (default)
   lists items with a "packed" box and no prices. Brand from
   lib/brand, contact and returns from store settings. Internal
   notes are never printed: these sheets travel with the parcel.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getOrderForAdmin } from "@/lib/dal/admin";
import { brand, t as pick } from "@/lib/brand/config";
import { fill, formatAmount, formatDate, formatInt, getAdminText } from "@/lib/admin/i18n";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";
import { adminButton } from "../../../components/buttons";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Print" };

const PRINT_CSS = `
@page { size: A4; margin: 14mm 12mm; }
@media print {
  html, body { background: #fff !important; }
  body > *:not(main) { display: none !important; }
  [data-print-sheet] { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important; width: auto !important; }
  [data-print-sheet] tr { break-inside: avoid; }
}`;

export default async function OrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const [{ id }, { doc }, locale, settings] = await Promise.all([params, searchParams, getLocale(), getStoreSettings()]);
  if (!z.guid().safeParse(id).success) notFound();
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const t = getAdminText(locale);
  const P = t.print;
  const invoice = doc === "invoice";
  const money = (n: number) => formatAmount(n, locale, 2);
  const storeName = pick(brand.name, locale);
  const address = pick(settings.contact.address, locale);
  const contactLine = [settings.contact.email, settings.contact.phone].filter(Boolean).join(" · ");
  const gov = GOVERNORATES.find((g) => g.value === order.governorate);
  const governorate = gov ? (locale === "ar" ? gov.ar : gov.en) : order.governorate;
  const units = order.items.reduce((n, i) => n + i.quantity, 0);
  const sep = locale === "ar" ? "، " : ", ";

  return (
    <div className="min-h-full px-4 py-6 sm:py-10 print:p-0">
      <style>{PRINT_CSS}</style>

      {/* Toolbar (screen only) */}
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center gap-2 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className={adminButton("ghost", "sm", "-ms-2")}>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
          {P.back}
        </Link>
        <nav aria-label={P.show} className="ms-auto inline-flex rounded-[3px] border border-border bg-surface-elevated p-0.5">
          {[
            { key: "slip", href: `/admin/orders/${order.id}/print`, label: P.packingSlip, current: !invoice },
            { key: "invoice", href: `/admin/orders/${order.id}/print?doc=invoice`, label: P.invoice, current: invoice },
          ].map((d) => (
            <Link
              key={d.key}
              href={d.href}
              aria-current={d.current ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-[2px] px-3 text-[0.8125rem] pointer-coarse:h-10",
                d.current ? "bg-text-primary text-background" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {d.label}
            </Link>
          ))}
        </nav>
        <PrintButton label={P.print} />
      </div>

      {/* The sheet: always ink on white, like paper */}
      <article
        data-print-sheet
        className="mx-auto w-full max-w-[210mm] bg-white px-6 py-8 text-[#161513] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.25)] sm:px-12 sm:py-12"
      >
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#ddd8ce] pb-6">
          <div>
            <p className="font-display text-[2rem] leading-none [&:lang(ar)]:font-sans [&:lang(ar)]:text-[1.5rem] [&:lang(ar)]:font-semibold">{storeName}</p>
            <div className="mt-3 space-y-0.5 text-[0.75rem] leading-relaxed text-[#4a4741]">
              {address ? <p>{address}</p> : null}
              {contactLine ? (
                <p>
                  <bdi dir="ltr">{contactLine}</bdi>
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-end">
            <h1 className="text-[1.25rem] font-medium">{invoice ? P.invoice : P.packingSlip}</h1>
            <dl className="mt-2 space-y-0.5 text-[0.8125rem]">
              <div className="flex justify-end gap-2">
                <dt className="text-[#6f6b63]">{P.order}</dt>
                <dd className="font-medium tabular-nums" dir="ltr">
                  {order.order_number}
                </dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt className="text-[#6f6b63]">{P.date}</dt>
                <dd className="tabular-nums">{formatDate(order.created_at, locale)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 border-b border-[#ddd8ce] py-6 text-[0.8125rem] sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#6f6b63] [&:lang(ar)]:normal-case [&:lang(ar)]:tracking-normal [&:lang(ar)]:text-[0.75rem]">
              {P.deliverTo}
            </h2>
            <address className="not-italic leading-relaxed">
              <span className="block font-medium">{order.customer_name || t.orders.guest}</span>
              {order.address ? <span className="block whitespace-pre-line">{order.address}</span> : null}
              <span className="block">{[order.city, governorate].filter(Boolean).join(sep)}</span>
              {order.phone ? (
                <span className="block tabular-nums" dir="ltr">
                  {order.phone}
                </span>
              ) : null}
            </address>
          </div>
          <div>
            <h2 className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#6f6b63] [&:lang(ar)]:normal-case [&:lang(ar)]:tracking-normal [&:lang(ar)]:text-[0.75rem]">
              {P.payment}
            </h2>
            <p className="leading-relaxed">
              {order.payment_method ? t.method[order.payment_method] : t.methodUnknown}
              <span className="text-[#6f6b63]"> · {t.payment[order.payment_status]}</span>
            </p>
            {invoice && order.payment_method === "cod" && order.payment_status !== "paid" ? (
              <p className="mt-1 font-medium tabular-nums">{money(order.total)}</p>
            ) : null}
            <p className="mt-1 text-[#6f6b63]">{fill(P.itemsCount, { n: formatInt(units, locale) })}</p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="border-b border-[#161513] text-[0.6875rem] uppercase tracking-[0.1em] text-[#6f6b63] [&:lang(ar)]:normal-case [&:lang(ar)]:tracking-normal [&:lang(ar)]:text-[0.75rem]">
              <th className="pb-2 text-start font-medium">{P.item}</th>
              <th className="w-16 pb-2 text-center font-medium">{P.qty}</th>
              {invoice ? <th className="w-28 pb-2 text-end font-medium">{P.price}</th> : null}
              {invoice ? <th className="w-28 pb-2 text-end font-medium">{P.total}</th> : null}
              {!invoice ? <th className="w-20 pb-2 text-center font-medium">{P.packed}</th> : null}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-[#ddd8ce] align-top">
                <td className="py-3 pe-4">
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_label ? <p className="text-[#4a4741]">{item.variant_label}</p> : null}
                  {item.sku ? (
                    <p className="text-[0.75rem] tabular-nums text-[#6f6b63]" dir="ltr">
                      {P.sku}: {item.sku}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 text-center tabular-nums">{formatInt(item.quantity, locale)}</td>
                {invoice ? <td className="py-3 text-end tabular-nums">{money(item.unit_price)}</td> : null}
                {invoice ? <td className="py-3 text-end tabular-nums">{money(item.unit_price * item.quantity)}</td> : null}
                {!invoice ? (
                  <td className="py-3 text-center">
                    <span aria-hidden="true" className="inline-block size-4 border border-[#161513] align-middle" />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {invoice ? (
          <dl className="ms-auto mt-6 w-full max-w-72 space-y-1.5 text-[0.8125rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-[#6f6b63]">{t.detail.subtotal}</dt>
              <dd className="tabular-nums">{money(order.subtotal)}</dd>
            </div>
            {order.discount_amount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f6b63]">
                  {t.detail.discount}
                  {order.promo_code ? <span dir="ltr"> ({order.promo_code})</span> : null}
                </dt>
                <dd className="tabular-nums">−{money(order.discount_amount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-[#6f6b63]">{t.detail.shipping}</dt>
              <dd className="tabular-nums">{order.shipping_cost > 0 ? money(order.shipping_cost) : t.detail.free}</dd>
            </div>
            {order.tax_amount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[#6f6b63]">{t.detail.tax}</dt>
                <dd className="tabular-nums">{money(order.tax_amount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-[#161513] pt-2 text-[0.9375rem] font-medium">
              <dt>{t.detail.total}</dt>
              <dd className="tabular-nums">{money(order.total)}</dd>
            </div>
          </dl>
        ) : null}

        <footer className="mt-10 border-t border-[#ddd8ce] pt-5 text-[0.75rem] leading-relaxed text-[#4a4741]">
          <p>{fill(P.thanks, { brand: storeName })}</p>
          <p>{fill(P.returns, { days: formatInt(settings.policies.returnDays, locale) })}</p>
          {contactLine ? <p>{fill(P.contact, { contact: contactLine })}</p> : null}
        </footer>
      </article>
    </div>
  );
}
