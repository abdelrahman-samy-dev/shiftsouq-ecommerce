"use client";

/* ══════════════════════════════════════════════════════════════
   OrderActions — "Complete payment" and "Cancel order" (My Orders)
   ──────────────────────────────────────────────────────────────
   Shown only for the buyer's own pending orders; the server checks
   ownership, status and payment again on every click:
   • payForMyOrder → Paymob card iframe (or the local test panel)
     or a wallet redirect, for the amount stored on the order.
   • cancelOrder → pending + unpaid only; stock goes back on the
     shelf (database trigger).
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { payForMyOrder } from "@/lib/actions/paymob";
import { cancelOrder } from "@/app/orders/actions";
import { PaymentIframe } from "@/components/checkout/PaymentIframe";
import { MockPaymentPanel } from "@/components/checkout/MockPaymentPanel";
import type { PaymentMethodValue } from "./order-rules";

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  paymentMethod: PaymentMethodValue | null;
  canPay: boolean;
  canCancel: boolean;
  /** Whether the server can take this order's online payment method right now. */
  paymentAvailable: boolean;
  locale: string;
}

export function OrderActions({
  orderId,
  orderNumber,
  paymentMethod,
  canPay,
  canCancel,
  paymentAvailable,
  locale,
}: OrderActionsProps) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [card, setCard] = useState<{ token: string; iframeId: string } | null>(null);

  if (!canPay && !canCancel) return null;

  const pay = async () => {
    setBusy("pay");
    try {
      const res = await payForMyOrder(orderId);
      if (!res.success) {
        toast.error(
          res.code === "not_payable"
            ? isAr
              ? "لم يعد بالإمكان دفع هذا الطلب إلكترونيًا."
              : "This order can no longer be paid online."
            : res.code === "unavailable"
              ? isAr
                ? "الدفع الإلكتروني غير متاح حاليًا. حاول لاحقًا."
                : "Online payment isn't available right now. Please try later."
              : isAr
                ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى."
                : "We couldn't start the payment. Please try again."
        );
        router.refresh();
        setBusy(null);
        return;
      }
      if (res.method === "wallet") {
        window.location.href = res.redirectUrl;
        return;
      }
      setCard({ token: res.paymentToken, iframeId: res.iframeId });
      setBusy(null);
    } catch {
      toast.error(isAr ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى." : "We couldn't start the payment. Please try again.");
      setBusy(null);
    }
  };

  const onCardResult = (success: boolean) => {
    setCard(null);
    if (success) {
      router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
    } else {
      toast.error(isAr ? "فشلت عملية الدفع. يمكنك المحاولة مرة أخرى." : "The payment failed. You can try again.");
      router.refresh();
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const res = await cancelOrder(orderId);
      if (res.ok) {
        toast.success(isAr ? "تم إلغاء الطلب." : "Your order was cancelled.");
      } else {
        toast.error(
          res.code === "not_cancellable"
            ? isAr
              ? "لا يمكن إلغاء هذا الطلب الآن."
              : "This order can no longer be cancelled."
            : isAr
              ? "تعذر إلغاء الطلب. يرجى المحاولة مرة أخرى."
              : "We couldn't cancel the order. Please try again."
        );
      }
      setConfirmCancel(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {canPay && paymentAvailable && (
        <button type="button" onClick={pay} disabled={busy !== null} className="btn-primary h-11 text-sm font-bold gap-2">
          {busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {paymentMethod === "wallet"
            ? isAr
              ? "إكمال الدفع بالمحفظة"
              : "Complete payment with wallet"
            : isAr
              ? "إكمال الدفع بالبطاقة"
              : "Complete card payment"}
        </button>
      )}
      {canPay && !paymentAvailable && (
        <p className="text-xs text-[var(--text-muted)]">
          {isAr
            ? "الدفع الإلكتروني غير متاح مؤقتًا. يمكنك إلغاء الطلب وإعادة الطلب بالدفع عند الاستلام."
            : "Online payment is temporarily unavailable. You can cancel this order and order again with cash on delivery."}
        </p>
      )}

      {canCancel &&
        (confirmCancel ? (
          <div className="rounded-xl p-3 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <p className="font-semibold text-[var(--text-primary)] mb-2">
              {isAr ? "هل تريد إلغاء هذا الطلب؟" : "Cancel this order?"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={busy !== null}
                className="btn-secondary flex-1 h-10 text-sm font-semibold gap-2 text-[var(--destructive)]"
              >
                {busy === "cancel" && <Loader2 size={14} className="animate-spin" />}
                {isAr ? "نعم، ألغِ الطلب" : "Yes, cancel it"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                disabled={busy !== null}
                className="btn-secondary flex-1 h-10 text-sm font-semibold"
              >
                {isAr ? "لا، احتفظ به" : "No, keep it"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={busy !== null}
            className="btn-secondary h-11 text-sm font-semibold gap-2"
          >
            <XCircle size={16} />
            {isAr ? "إلغاء الطلب" : "Cancel order"}
          </button>
        ))}

      <AnimatePresence>
        {card && card.iframeId === "MOCK" && (
          <MockPaymentPanel locale={locale} onClose={() => setCard(null)} onTransactionComplete={onCardResult} />
        )}
        {card && card.iframeId !== "MOCK" && (
          <PaymentIframe
            paymentToken={card.token}
            iframeId={card.iframeId}
            locale={locale}
            onClose={() => setCard(null)}
            onTransactionComplete={onCardResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
