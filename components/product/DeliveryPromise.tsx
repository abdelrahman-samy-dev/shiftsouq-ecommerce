"use client";

/* ══════════════════════════════════════════════════════════════
   DeliveryPromise — what delivery costs and how long it takes
   ──────────────────────────────────────────────────────────────
   The buyer picks a governorate (remembered on this device); the
   fee comes from the store settings with the checkout rule
   (shippingFeeFor). Cash-on-delivery and returns lines follow
   the settings too.
   ══════════════════════════════════════════════════════════════ */

import { useId } from "react";
import { Banknote, RotateCcw, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { ShippingSettings } from "@/lib/settings/types";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { deliveryQuote } from "./pdp-logic";
import { pdpCopy } from "./pdp-copy";
import { useStoredValue, writeStored } from "./use-stored-value";

export const GOVERNORATE_KEY = "shiftsouq-governorate";

export interface DeliverySettings {
  shipping: ShippingSettings;
  cod: boolean;
  returnDays: number;
}

interface DeliveryPromiseProps {
  settings: DeliverySettings;
  /** Price × quantity of what the buyer is about to add. */
  amount: number;
  locale: Locale;
}

const DEFAULT_GOVERNORATE = GOVERNORATES[0].value;

export default function DeliveryPromise({ settings, amount, locale }: DeliveryPromiseProps) {
  const copy = pdpCopy(locale);
  const id = useId();
  const stored = useStoredValue(GOVERNORATE_KEY);
  const governorate = GOVERNORATES.some((g) => g.value === stored) ? (stored as string) : DEFAULT_GOVERNORATE;
  const place = GOVERNORATES.find((g) => g.value === governorate) ?? GOVERNORATES[0];
  const { shipping } = settings;
  const quote = deliveryQuote(shipping, governorate, amount);
  const { min, max } = shipping.etaDays;

  const line = quote.free
    ? copy.freeDeliveryLine(place[locale], min, max)
    : copy.deliveryLine(place[locale], formatPrice(quote.fee, locale), min, max);
  const [before, after] = splitAround(line, place[locale]);

  return (
    <div className="flex flex-col gap-2.5 text-[0.8125rem] text-text-secondary">
      <div className="flex items-start gap-3">
        <Truck className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
        <p className="leading-relaxed">
          <label htmlFor={id} className="sr-only">
            {copy.deliverTo}
          </label>
          {before}
          <span className="relative inline-flex items-center">
            <select
              id={id}
              value={governorate}
              onChange={(e) => writeStored(GOVERNORATE_KEY, e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pe-4 font-medium text-text-primary underline decoration-border-hover underline-offset-4 outline-none [field-sizing:content] hover:decoration-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            >
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g[locale]}
                </option>
              ))}
            </select>
            <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute end-0 size-3 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </span>
          {after}
          {!quote.free && shipping.freeThreshold > 0 ? (
            <span className="block text-text-muted">{copy.freeFrom(formatPrice(shipping.freeThreshold, locale))}</span>
          ) : null}
        </p>
      </div>
      {settings.cod ? (
        <p className="flex items-start gap-3">
          <Banknote className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
          {copy.cod}
        </p>
      ) : null}
      {settings.returnDays > 0 ? (
        <p className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
          {copy.freeReturns(settings.returnDays)}
        </p>
      ) : null}
    </div>
  );
}

/** Splits a sentence around the place name so the select can sit inside it. */
function splitAround(text: string, word: string): [string, string] {
  const i = text.indexOf(word);
  if (i < 0) return [`${text} `, ""];
  return [text.slice(0, i), text.slice(i + word.length)];
}
