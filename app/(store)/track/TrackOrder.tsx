"use client";

/* Order tracking form and result (status timeline, items, totals). */

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Input } from "@/components/ds";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { formatOrderDate, governorateLabel, methodLabel, paymentStatusLabel } from "@/components/orders/order-copy";
import { formatMoney, type Lang } from "@/components/checkout/checkout-rules";
import { metaText, panelTitle, textLink, totalRow } from "@/components/checkout/ui";
import { cn } from "@/lib/utils";
import { trackOrder, type TrackResult } from "./actions";
import { trackCopy } from "./copy";

export function TrackOrder({ locale, initialOrder }: { locale: string; initialOrder: string }) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = trackCopy(lang);
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await trackOrder({ orderNumber, email });
      setResult(r);
      if (r.ok) requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setResult({ ok: false, reason: "not_found" });
    } finally {
      setBusy(false);
    }
  }

  const error = result && !result.ok ? (result.reason === "rate_limited" ? t.rateLimited : result.reason === "invalid" ? t.invalid : t.notFound) : null;

  if (result?.ok) {
    const o = result.order;
    const money = (n: number) => formatMoney(n, lang);
    const place = [o.city, governorateLabel(o.governorate, lang)].filter(Boolean).join(lang === "ar" ? "، " : ", ");
    return (
      <div className="container-x pb-24 pt-10 md:pt-16">
        <div className="mx-auto max-w-[1000px]">
          <p className={metaText}>{t.title}</p>
          <h1 ref={resultRef} tabIndex={-1} style={{ outline: "none" }} className="mt-2 break-all font-sans text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tabular-nums tracking-tight text-text-primary">
            <span dir="ltr">{o.orderNumber}</span>
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {t.placed} {formatOrderDate(o.createdAt, lang, true)}
          </p>

          <section aria-label={t.status} className="mt-10 border-y border-border py-8">
            <OrderTimeline status={o.status} createdAt={o.createdAt} updatedAt={o.updatedAt} lang={lang} />
          </section>

          <div className="grid gap-x-16 gap-y-10 pt-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="track-items">
              <h2 id="track-items" className={panelTitle}>
                {t.items}
              </h2>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {o.items.map((item, i) => (
                  <li key={i} className="flex gap-4 py-4">
                    <div className="relative h-[5.5rem] w-[4.4rem] shrink-0 overflow-hidden bg-surface">
                      {item.image ? <Image src={item.image} alt="" fill sizes="72px" className="object-cover" /> : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm text-text-primary">{lang === "ar" ? item.nameAr || item.name : item.name}</p>
                      {(lang === "ar" ? item.labelAr || item.label : item.label) ? (
                        <p className={metaText}>{lang === "ar" ? item.labelAr || item.label : item.label}</p>
                      ) : null}
                      <p className={metaText}>{t.qty(item.quantity)}</p>
                    </div>
                    <p className="t-price shrink-0 text-sm">{money(item.unitPrice * item.quantity)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="flex flex-col gap-6 lg:bg-surface lg:p-7">
              {place ? (
                <div className="flex flex-col gap-1.5">
                  <h2 className="t-eyebrow">{t.deliveryTo}</h2>
                  <p className="text-sm text-text-primary">{place}</p>
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5 border-t border-border pt-6">
                <h2 className="t-eyebrow">{t.payment}</h2>
                <p className="text-sm text-text-primary">{methodLabel(o.paymentMethod, lang)}</p>
                <p className={metaText}>{paymentStatusLabel(o.paymentStatus, o.paymentMethod, lang, o.status)}</p>
              </div>
              <div className="flex flex-col gap-3 border-t border-border pt-6">
                <div className={totalRow}>
                  <span className="text-text-secondary">{t.subtotal}</span>
                  <span className="t-price">{money(o.subtotal)}</span>
                </div>
                {o.discount > 0 ? (
                  <div className={totalRow}>
                    <span className="text-text-secondary">{t.discount}</span>
                    <span className="t-price text-accent">−{money(o.discount)}</span>
                  </div>
                ) : null}
                <div className={totalRow}>
                  <span className="text-text-secondary">{t.delivery}</span>
                  <span className="t-price">{o.shipping === 0 ? t.free : money(o.shipping)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <span className="font-medium">{t.total}</span>
                  <span className="t-price text-lg">{money(o.total)}</span>
                </div>
              </div>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setResult(null);
                  setEmail("");
                  setOrderNumber("");
                }}
              >
                {t.another}
              </Button>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pb-24 pt-14 md:pt-24">
      <div className="mx-auto flex max-w-[480px] flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="t-h1">{t.title}</h1>
          <p className="text-text-secondary">{t.intro}</p>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Input
            id="track-order"
            name="orderNumber"
            label={t.orderNumber}
            placeholder={t.orderPlaceholder}
            hint={t.orderHint}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            dir="ltr"
            className="text-start uppercase placeholder:normal-case rtl:text-end"
            maxLength={40}
            required
          />
          <Input
            id="track-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            className="text-start rtl:text-end"
            label={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
          />
          {error ? (
            <p role="alert" className="border border-destructive-border bg-destructive-bg px-4 py-3 text-sm text-text-primary rounded-sm">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" fullWidth loading={busy} disabled={!orderNumber.trim() || !email.trim()}>
            {t.submit}
          </Button>
        </form>

        <div className={cn("flex flex-col gap-2 border-t border-border pt-6 text-sm text-text-secondary")}>
          <p>
            {t.haveAccount}{" "}
            <Link href="/login?redirect=%2Forders" className={cn("text-text-primary", textLink)}>
              {t.signIn}
            </Link>
          </p>
          <p>
            {t.help}{" "}
            <Link href="/contact" className={cn("text-text-primary", textLink)}>
              {t.contact}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
