"use client";

/* ══════════════════════════════════════════════════════════════
   Receipt — the interactive bits
   • ReceiptEffects: empties the bag once this order is settled,
     and refreshes while an online payment is being confirmed.
   • RetryPayment: "Try again" for a failed card / wallet payment
     (same order, same amount; the server checks who is asking).
   • CopyOrderNumber: copies the order number.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ds";
import { useCartStore } from "@/lib/store/useCartStore";
import { useCheckoutStore } from "@/lib/store/useCheckoutStore";
import { retryReceiptPayment } from "@/lib/actions/paymob";
import { CardPaymentDialog, type CardSession } from "./CardPaymentDialog";
import { checkoutCopy } from "./copy";

export function ReceiptEffects({ orderNumber, settled, confirming }: { orderNumber: string; settled: boolean; confirming: boolean }) {
  const router = useRouter();

  // Card / wallet orders keep the bag until the payment is confirmed. Empty it once this order is settled.
  useEffect(() => {
    if (!settled) return;
    const pending = useCheckoutStore.getState().pendingOrder;
    if (pending && pending.orderNumber === orderNumber) {
      useCartStore.getState().clearCart();
      useCheckoutStore.getState().resetCheckout();
    }
  }, [settled, orderNumber]);

  // The webhook usually confirms within seconds: refresh a few times while we wait.
  useEffect(() => {
    if (!confirming) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 12) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [confirming, router]);

  return null;
}

export function RetryPayment({ orderNumber, locale }: { orderNumber: string; locale: string }) {
  const t = checkoutCopy(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardSession | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await retryReceiptPayment(orderNumber);
      if (!res.success) {
        setError(
          res.code === "not_payable"
            ? t.failedExpired
            : locale === "ar"
              ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى."
              : "We couldn't start the payment. Please try again.",
        );
        router.refresh();
        return;
      }
      if (res.method === "wallet") {
        window.location.href = res.redirectUrl;
        return;
      }
      setCard({ token: res.paymentToken, iframeId: res.iframeId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={retry} loading={busy} size="lg">
        {t.tryAgain}
      </Button>
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      ) : null}
      <CardPaymentDialog
        session={card}
        locale={locale}
        onClose={() => setCard(null)}
        onComplete={(ok) => {
          setCard(null);
          if (ok) useCartStore.getState().clearCart();
          router.refresh();
        }}
      />
    </div>
  );
}

export function CopyOrderNumber({ value, locale }: { value: string; locale: string }) {
  const t = checkoutCopy(locale);
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked: the number stays selectable */
        }
      }}
      className="inline-flex min-h-10 items-center gap-1.5 text-[0.8125rem] text-text-secondary hover:text-text-primary"
    >
      {copied ? <Check className="size-3.5" strokeWidth={1.5} aria-hidden="true" /> : <Copy className="size-3.5" strokeWidth={1.5} aria-hidden="true" />}
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </button>
  );
}
