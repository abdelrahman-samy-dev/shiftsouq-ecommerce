/* ══════════════════════════════════════════════════════════════
   Receipt — /checkout/success
   ──────────────────────────────────────────────────────────────
   The real order (server data only): confirmation, order number,
   items (Arabic names in Arabic), totals, delivery address and
   the payment state — confirming, paid, failed (+ try again).
   Guests are offered an account; everyone can track the order.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import { Banknote, CircleAlert, CircleCheck, Clock } from "lucide-react";
import { ButtonLink, Eyebrow } from "@/components/ds";
import type { Receipt } from "@/lib/dal/receipt";
import { formatOrderDate, methodLabel } from "@/components/orders/order-copy";
import { cn } from "@/lib/utils";
import { formatAddress, formatEgyptianMobile, formatMoney, splitFullName, type Lang } from "./checkout-rules";
import { checkoutCopy } from "./copy";
import { CopyOrderNumber, ReceiptEffects, RetryPayment } from "./ReceiptClient";
import { metaText, noticeTone, panelTitle, totalRow } from "./ui";

interface CheckoutSuccessContentProps {
  locale: string;
  /** The real order, or null when this browser can't see it (e.g. opened on another device). */
  receipt: Receipt | null;
  signedIn: boolean;
}

export function CheckoutSuccessContent({ locale, receipt, signedIn }: CheckoutSuccessContentProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const money = (n: number) => formatMoney(n, lang);

  if (!receipt) {
    return (
      <div className="container-x py-24 md:py-32">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
          <h1 className="t-h1">{t.notFoundTitle}</h1>
          <p className="text-text-secondary">{t.notFoundBody}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/track" size="lg">
              {t.trackOrder}
            </ButtonLink>
            <ButtonLink href="/shop" size="lg" variant="secondary">
              {t.continueShopping}
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const online = receipt.paymentMethod === "card" || receipt.paymentMethod === "wallet";
  const paid = receipt.paymentStatus === "paid";
  const confirming = online && receipt.paymentStatus === "unpaid" && receipt.status === "pending";
  const failed = online && !paid && !confirming;
  const settled = paid || receipt.paymentMethod === "cod";
  const firstName = splitFullName(receipt.delivery.name).firstName;
  const itemCount = receipt.items.reduce((n, i) => n + i.quantity, 0);
  const trackHref = signedIn && !receipt.isGuest ? "/orders" : `/track?order=${encodeURIComponent(receipt.orderNumber)}`;

  const eyebrow = failed ? t.failedTitle : confirming ? t.confirmingTitle : t.receiptEyebrow;
  const heading = failed ? t.failedTitle : t.thanks(firstName);

  return (
    <div className="container-x pb-24 pt-10 md:pt-16">
      <ReceiptEffects orderNumber={receipt.orderNumber} settled={settled} confirming={confirming} />
      <div className="mx-auto max-w-[1100px]">
        {/* Confirmation */}
        <header className="flex flex-col gap-4 border-b border-border pb-10 md:pb-14">
          <Eyebrow className={cn("flex items-center gap-2", failed ? "text-destructive" : paid || !online ? "text-success" : "")}>
            {failed ? (
              <CircleAlert className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            ) : confirming ? (
              <Clock className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <CircleCheck className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            )}
            {eyebrow}
          </Eyebrow>
          <h1 className="t-h1 max-w-3xl">{heading}</h1>
          <p className="max-w-xl text-text-secondary">{failed ? t.failedBody : confirming ? t.confirmingBody : t.receivedBody}</p>

          <div className="mt-4 flex flex-wrap items-start gap-x-12 gap-y-4">
            <div className="flex flex-col gap-1">
              <span className={metaText}>{t.orderNumber}</span>
              <span className="flex flex-wrap items-center gap-x-4">
                <span className="t-price select-all text-2xl tracking-tight text-text-primary" dir="ltr">
                  {receipt.orderNumber}
                </span>
                <CopyOrderNumber value={receipt.orderNumber} locale={lang} />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className={metaText}>{t.placedOn}</span>
              <span className="text-sm text-text-primary">{formatOrderDate(receipt.createdAt, lang, true)}</span>
            </div>
          </div>
          <p className={metaText}>{t.keepNumber}</p>
        </header>

        <div className="grid gap-x-16 gap-y-12 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Items */}
          <section aria-labelledby="receipt-items">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="receipt-items" className={panelTitle}>
                {t.items}
              </h2>
              <span className={metaText}>{t.itemsCount(itemCount)}</span>
            </div>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {receipt.items.map((item, i) => {
                const name = lang === "ar" ? item.nameAr || item.name : item.name;
                const label = lang === "ar" ? item.labelAr || item.label : item.label;
                return (
                  <li key={i} className="flex gap-5 py-5">
                    <div className="relative h-[7.5rem] w-24 shrink-0 overflow-hidden bg-surface">
                      {item.image ? <Image src={item.image} alt="" fill sizes="96px" className="object-cover" /> : null}
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

          {/* Payment, delivery, totals */}
          <aside className="flex flex-col gap-8 lg:bg-surface lg:p-8">
            <section aria-labelledby="receipt-payment" className="flex flex-col gap-3">
              <h2 id="receipt-payment" className="t-eyebrow">
                {t.paymentState}
              </h2>
              {receipt.paymentMethod === "cod" ? (
                <p className="flex items-start gap-3 text-sm text-text-primary">
                  <Banknote className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{t.cod}</span>
                    <span className="block text-text-secondary">{t.codState(money(receipt.total))}</span>
                  </span>
                </p>
              ) : paid ? (
                <p className="flex items-start gap-3 text-sm text-text-primary">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{t.paidState}</span>
                    <span className="block text-text-secondary">{t.paidBy(methodLabel(receipt.paymentMethod, lang))}</span>
                  </span>
                </p>
              ) : confirming ? (
                <p className="flex items-start gap-3 text-sm text-text-primary" role="status">
                  <Clock className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{t.confirmingTitle}</span>
                    <span className="block text-text-secondary">{methodLabel(receipt.paymentMethod, lang)}</span>
                  </span>
                </p>
              ) : (
                <div className={cn("flex flex-col gap-4 border p-4 rounded-sm", noticeTone.danger)}>
                  <p className="text-sm">
                    <span className="block font-medium">{t.failedTitle}</span>
                    <span className="block text-text-secondary">{receipt.canRetry ? t.paymentFailedBody : t.failedExpired}</span>
                  </p>
                  {receipt.canRetry ? (
                    <RetryPayment orderNumber={receipt.orderNumber} locale={lang} />
                  ) : (
                    <ButtonLink href="/checkout" variant="secondary">
                      {t.backToCheckout}
                    </ButtonLink>
                  )}
                </div>
              )}
            </section>

            <section aria-labelledby="receipt-delivery" className="flex flex-col gap-3 border-t border-border pt-8">
              <h2 id="receipt-delivery" className="t-eyebrow">
                {t.deliverTo}
              </h2>
              <address className="text-sm not-italic leading-relaxed text-text-secondary">
                <span className="block text-text-primary">{receipt.delivery.name}</span>
                <span className="block">{formatAddress(receipt.delivery, lang)}</span>
                {receipt.delivery.phone ? (
                  <span className="block text-start rtl:text-end" dir="ltr">
                    {formatEgyptianMobile(receipt.delivery.phone)}
                  </span>
                ) : null}
                {receipt.delivery.email ? (
                  <span className="block text-start rtl:text-end" dir="ltr">
                    {receipt.delivery.email}
                  </span>
                ) : null}
              </address>
            </section>

            <section aria-label={t.summary} className="flex flex-col gap-3 border-t border-border pt-8">
              <div className={totalRow}>
                <span className="text-text-secondary">{t.subtotal}</span>
                <span className="t-price">{money(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 ? (
                <div className={totalRow}>
                  <span className="text-text-secondary">{t.discount}</span>
                  <span className="t-price text-accent">−{money(receipt.discount)}</span>
                </div>
              ) : null}
              <div className={totalRow}>
                <span className="text-text-secondary">{t.deliveryLine}</span>
                <span className="t-price">{receipt.shipping === 0 ? t.free : money(receipt.shipping)}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <span className="text-base font-medium">{t.total}</span>
                <span className="t-price text-xl">{money(receipt.total)}</span>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-border pt-8">
              <ButtonLink href={trackHref} size="lg" fullWidth>
                {t.trackOrder}
              </ButtonLink>
              <ButtonLink href="/shop" size="lg" variant="secondary" fullWidth>
                {t.continueShopping}
              </ButtonLink>
            </div>
          </aside>
        </div>

        {receipt.isGuest && !signedIn ? (
          <section
            aria-labelledby="receipt-account"
            className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-border pt-10 md:flex-row md:items-end"
          >
            <div className="flex max-w-xl flex-col gap-2">
              <h2 id="receipt-account" className={panelTitle}>
                {t.createAccountTitle}
              </h2>
              <p className="text-text-secondary">{t.createAccountBody}</p>
            </div>
            <ButtonLink href="/register?from=order&redirect=%2Faccount" size="lg" variant="secondary" className="shrink-0">
              {t.createAccount}
            </ButtonLink>
          </section>
        ) : null}
      </div>
    </div>
  );
}
