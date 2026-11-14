"use client";

/* One bag line: photo, name, colour / size, unit price, quantity stepper, remove, move to wishlist. */

import Image from "next/image";
import Link from "next/link";
import { QuantityStepper } from "@/components/ds";
import type { CartItem } from "@/lib/store/useCartStore";
import { cn } from "@/lib/utils";
import { formatMoney, type Lang } from "@/components/checkout/checkout-rules";
import { cartCopy } from "./copy";

interface CartLineProps {
  item: CartItem;
  lang: Lang;
  unavailable: boolean;
  /** Largest quantity the stepper allows (stock). */
  max: number;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  onMoveToWishlist: () => void;
}

export function CartLine({ item, lang, unavailable, max, onQuantity, onRemove, onMoveToWishlist }: CartLineProps) {
  const t = cartCopy(lang);
  const name = lang === "ar" ? item.name_ar || item.name_en : item.name_en;
  const colour = lang === "ar" ? item.color_ar || item.color_en : item.color_en;
  const href = `/product/${item.slug}`;
  const action = "min-h-10 text-[0.8125rem] text-text-secondary underline-offset-4 hover:text-text-primary hover:underline";

  return (
    <li className="flex gap-4 py-6 md:gap-6">
      <Link href={href} className="relative block h-[8.75rem] w-28 shrink-0 overflow-hidden bg-surface md:h-[11.25rem] md:w-36" tabIndex={-1} aria-hidden="true">
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="(max-width: 767px) 112px, 144px" className={cn("object-cover", unavailable && "opacity-40")} />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link href={href} className="text-[0.9375rem] leading-snug text-text-primary hover:underline underline-offset-4">
              {name}
            </Link>
            <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8125rem] text-text-muted">
              {colour ? (
                <div className="flex gap-1">
                  <dt>{t.colour}:</dt>
                  <dd className="text-text-secondary">{colour}</dd>
                </div>
              ) : null}
              {item.size ? (
                <div className="flex gap-1">
                  <dt>{t.size}:</dt>
                  <dd className="text-text-secondary">{item.size}</dd>
                </div>
              ) : null}
            </dl>
            {item.quantity > 1 && !unavailable ? (
              <p className="text-[0.8125rem] text-text-muted">
                {formatMoney(item.price, lang)} {t.each}
              </p>
            ) : null}
          </div>
          <p className={cn("t-price shrink-0 text-[0.9375rem]", unavailable && "text-text-faint line-through")}>
            {formatMoney(item.price * item.quantity, lang)}
          </p>
        </div>

        {unavailable ? (
          <p className="mt-2 text-[0.8125rem] text-destructive">
            {t.unavailable}. <span className="text-text-muted">{t.unavailableHint}</span>
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4">
          {unavailable ? (
            <span />
          ) : (
            <QuantityStepper value={item.quantity} onChange={onQuantity} min={1} max={max} locale={lang} />
          )}
          <div className="flex items-center gap-5">
            <button type="button" onClick={onMoveToWishlist} className={action} aria-label={t.moveItem(name)}>
              {t.moveToWishlist}
            </button>
            <button type="button" onClick={onRemove} className={action} aria-label={t.removeItem(name)}>
              {t.remove}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
