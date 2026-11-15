"use client";

/* Payment: cash on delivery, card or wallet (unavailable ones disabled with the reason), then "Place order". */

import type { ReactNode } from "react";
import Link from "next/link";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { Button, RadioCard } from "@/components/ds";
import { cn } from "@/lib/utils";
import { PaymentMarks, type PaymentMarkId } from "@/components/ui/PaymentMarks";
import {
  formatEgyptianMobile,
  formatMoney,
  paymentUnavailableMessage,
  type Lang,
  type PaymentMethod,
  type PaymentOption,
} from "./checkout-rules";
import { checkoutCopy } from "./copy";
import { textLink } from "./ui";

interface PaymentSectionProps {
  locale: string;
  method: PaymentMethod | null;
  options: Record<PaymentMethod, PaymentOption>;
  onSelect: (m: PaymentMethod) => void;
  phone: string;
  total: number;
  /** Server refusal for the chosen method (payment_unavailable / cod_limit). */
  error: string | null;
  processing: boolean;
  /** Same order as a failed attempt: the button retries the payment. */
  retry: boolean;
  /** Something elsewhere stops the order (e.g. a bag line no longer available). */
  blocked: boolean;
  locked: boolean;
  /** Shown above the button (e.g. "your payment didn't go through"). */
  notice?: ReactNode;
  onPlaceOrder: () => void;
}

const ICONS: Record<PaymentMethod, typeof Banknote> = { cod: Banknote, card: CreditCard, wallet: Smartphone };
const ORDER: PaymentMethod[] = ["cod", "card", "wallet"];

const CARD_MARKS: PaymentMarkId[] = ["visa", "mastercard", "meeza"];

export function PaymentSection({
  locale,
  method,
  options,
  onSelect,
  phone,
  total,
  error,
  processing,
  retry,
  blocked,
  locked,
  notice,
  onPlaceOrder,
}: PaymentSectionProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const label: Record<PaymentMethod, string> = { cod: t.cod, card: t.card, wallet: t.wallet };
  const hint: Record<PaymentMethod, string> = { cod: t.codHint, card: t.cardHint, wallet: t.walletHint };
  const chosen = method && options[method].available ? method : null;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3" disabled={locked}>
        <legend className="sr-only">{t.payment}</legend>
        {ORDER.map((m) => {
          const o = options[m];
          const Icon = ICONS[m];
          return (
            <RadioCard
              key={m}
              id={`pay-${m}`}
              name="payment-method"
              value={m}
              checked={method === m}
              disabled={!o.available}
              onChange={() => onSelect(m)}
              icon={<Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />}
              label={label[m]}
              aside={
                m === "card" ? (
                  <PaymentMarks ids={CARD_MARKS} locale={lang} size="sm" className="hidden sm:flex" />
                ) : undefined
              }
              description={
                !o.available ? (
                  <span className="text-text-muted">{paymentUnavailableMessage(o.reason, lang)}</span>
                ) : m === "wallet" && method === "wallet" && phone ? (
                  <>
                    {hint[m]} <span className="block text-text-secondary">{t.walletTo(formatEgyptianMobile(phone))}</span>
                  </>
                ) : m === "card" ? (
                  <>
                    {hint[m]}
                    <PaymentMarks ids={CARD_MARKS} locale={lang} size="sm" className="mt-2 sm:hidden" />
                  </>
                ) : (
                  hint[m]
                )
              }
            />
          );
        })}
      </fieldset>

      {notice}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          fullWidth
          onClick={onPlaceOrder}
          loading={processing}
          disabled={!chosen || blocked || locked}
          aria-describedby="checkout-legal"
        >
          {processing ? t.processing : retry ? t.retryPayment : t.placeOrderPay(formatMoney(total, lang))}
        </Button>
        {!chosen && !processing ? <p className="text-center text-[0.8125rem] text-text-muted">{t.chooseMethod}</p> : null}
        <p id="checkout-legal" className={cn("text-center text-[0.8125rem] text-text-muted")}>
          {t.legal}{" "}
          <Link href="/terms" className={textLink}>
            {t.terms}
          </Link>
          {" · "}
          <Link href="/privacy-policy" className={textLink}>
            {t.privacy}
          </Link>
        </p>
      </div>
    </div>
  );
}
