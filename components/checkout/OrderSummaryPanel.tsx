"use client";

/* ══════════════════════════════════════════════════════════════
   OrderSummaryPanel — the bag, promo code and totals at checkout
   ──────────────────────────────────────────────────────────────
   Every amount shown is the server's quote (quoteCheckout); while
   a new quote is on its way the old numbers stay in place, dimmed,
   so nothing jumps. Lines the server can no longer sell are
   flagged here and checkout waits until the bag is fixed.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import type { CartItem } from "@/lib/store/useCartStore";
import { cn } from "@/lib/utils";
import { formatMoney, freeShippingProgress, type CheckoutTotals, type Lang } from "./checkout-rules";
import { checkoutCopy } from "./copy";
import { PromoCodeField } from "./PromoCodeField";
import { metaText, panelTitle, totalRow } from "./ui";

interface OrderSummaryPanelProps {
  locale: string;
  items: CartItem[];
  /** Server unit prices keyed "<productId>:<variantId>" (null = can't be bought). */
  unitPrices?: Record<string, number | null>;
  totals: CheckoutTotals;
  freeThreshold: number;
  /** Governorate name for the delivery line, once chosen. */
  deliveryTo?: string;
  updating: boolean;
  promoCode: string | null;
  promoNotice: string | null;
  onApplyPromo: (code: string) => Promise<string | null>;
  onRemovePromo: () => void;
  locked: boolean;
  /** Hide the panel title (the mobile toggle already says what this is). */
  hideTitle?: boolean;
  idPrefix: string;
}

export function lineLabel(item: Pick<CartItem, "size" | "color_en" | "color_ar">, lang: Lang): string {
  const colour = lang === "ar" ? item.color_ar || item.color_en : item.color_en;
  return [colour, item.size].filter(Boolean).join(" · ");
}

export function OrderSummaryPanel({
  locale,
  items,
  unitPrices,
  totals,
  freeThreshold,
  deliveryTo,
  updating,
  promoCode,
  promoNotice,
  onApplyPromo,
  onRemovePromo,
  locked,
  hideTitle,
  idPrefix,
}: OrderSummaryPanelProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const money = (n: number) => formatMoney(n, lang);
  const progress = freeShippingProgress(totals.afterDiscount, freeThreshold);

  return (
    <div className="flex flex-col gap-6">
      {hideTitle ? null : <h2 className={panelTitle}>{t.summary}</h2>}

      <ul className="flex flex-col gap-5" aria-label={t.items}>
        {items.map((item) => {
          const key = `${item.productId}:${item.variantId}`;
          const server = unitPrices ? unitPrices[key] : undefined;
          const unavailable = server === null;
          const unit = typeof server === "number" ? server : item.price;
          const name = lang === "ar" ? item.name_ar || item.name_en : item.name_en;
          const label = lineLabel(item, lang);
          return (
            <li key={item.cartKey} className="flex gap-4">
              <div className="relative h-[5.5rem] w-[4.4rem] shrink-0 overflow-hidden bg-surface">
                {item.image ? (
                  <Image src={item.image} alt="" fill sizes="72px" className={cn("object-cover", unavailable && "opacity-40")} />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm text-text-primary leading-snug">{name}</p>
                {label ? <p className={metaText}>{label}</p> : null}
                <p className={metaText}>{t.qty(item.quantity)}</p>
                {unavailable ? <p className="text-[0.8125rem] text-destructive">{t.unavailableLine}</p> : null}
              </div>
              <p className={cn("t-price shrink-0 text-sm", unavailable && "text-text-faint line-through")}>
                {money(unit * item.quantity)}
              </p>
            </li>
          );
        })}
      </ul>

      <PromoCodeField
        locale={locale}
        appliedCode={promoCode}
        discount={totals.discount}
        notice={promoNotice}
        onApply={onApplyPromo}
        onRemove={onRemovePromo}
        disabled={locked}
        idPrefix={idPrefix}
      />

      <div
        className={cn("flex flex-col gap-3 border-t border-border pt-5 transition-opacity duration-150", updating && "opacity-60")}
        aria-busy={updating || undefined}
      >
        <div className={totalRow}>
          <span className="text-text-secondary">{t.subtotal}</span>
          <span className="t-price">{money(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 ? (
          <div className={totalRow}>
            <span className="text-text-secondary">
              {t.discount}
              {promoCode ? <span className="text-text-muted"> · {promoCode}</span> : null}
            </span>
            <span className="t-price text-accent">−{money(totals.discount)}</span>
          </div>
        ) : null}
        <div className={totalRow}>
          <span className="text-text-secondary">
            {t.deliveryLine}
            {deliveryTo && totals.shipping !== null ? <span className="text-text-muted"> · {deliveryTo}</span> : null}
          </span>
          <span className={cn("t-price", totals.shipping === null && "font-normal text-text-muted")}>
            {totals.shipping === null ? t.deliveryPending : totals.shipping === 0 ? t.free : money(totals.shipping)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <span className="text-base font-medium text-text-primary">{t.total}</span>
          <span className="t-price text-xl text-text-primary" aria-live="polite">
            {money(totals.total)}
          </span>
        </div>
        <span className="sr-only" aria-live="polite">
          {updating ? t.updating : ""}
        </span>
      </div>

      {freeThreshold > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] text-text-secondary">
            {progress.qualifies ? t.freeReached : t.freeLeft(money(progress.remaining))}
          </p>
          <div
            role="progressbar"
            aria-label={t.freeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            className="h-0.5 w-full bg-border"
          >
            <div
              className="h-full bg-text-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
