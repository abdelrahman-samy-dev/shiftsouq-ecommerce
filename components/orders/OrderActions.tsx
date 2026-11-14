"use client";

/* ══════════════════════════════════════════════════════════════
   OrderActions — "Complete payment" and "Cancel order" (My Orders)
   ──────────────────────────────────────────────────────────────
   Shown only for the buyer's own pending orders; the server checks
   ownership, status and payment again on every click:
   • payForMyOrder → Paymob card form (or the local test panel)
     or a wallet redirect, for the amount stored on the order.
   • cancelOrder → pending + unpaid only; stock goes back on the
     shelf (database trigger). Asked for in a confirm dialog.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Dialog } from "@/components/ds";
import { payForMyOrder } from "@/lib/actions/paymob";
import { cancelOrder } from "@/app/orders/actions";
import { CardPaymentDialog, type CardSession } from "@/components/checkout/CardPaymentDialog";
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

export function OrderActions({ orderId, orderNumber, paymentMethod, canPay, canCancel, paymentAvailable, locale }: OrderActionsProps) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [card, setCard] = useState<CardSession | null>(null);

  if (!canPay && !canCancel) return null;

  const pay = async () => {
    setBusy("pay");
    try {
      const res = await payForMyOrder(orderId);
      if (!res.success) {
        toast.error(
          res.code === "not_payable"
            ? ar
              ? "لم يعد بالإمكان دفع هذا الطلب إلكترونيًا."
              : "This order can no longer be paid online."
            : res.code === "unavailable"
              ? ar
                ? "الدفع الإلكتروني غير متاح حاليًا. حاول لاحقًا."
                : "Online payment isn't available right now. Please try later."
              : ar
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
    } catch {
      toast.error(ar ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى." : "We couldn't start the payment. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const onCardResult = (success: boolean) => {
    setCard(null);
    if (success) router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
    else {
      toast.error(ar ? "فشلت عملية الدفع. يمكنك المحاولة مرة أخرى." : "The payment failed. You can try again.");
      router.refresh();
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const res = await cancelOrder(orderId);
      if (res.ok) toast.success(ar ? "تم إلغاء الطلب." : "Your order was cancelled.");
      else
        toast.error(
          res.code === "not_cancellable"
            ? ar
              ? "لا يمكن إلغاء هذا الطلب الآن."
              : "This order can no longer be cancelled."
            : ar
              ? "تعذر إلغاء الطلب. يرجى المحاولة مرة أخرى."
              : "We couldn't cancel the order. Please try again.",
        );
      setConfirmCancel(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:items-end">
      <div className="flex flex-wrap gap-3">
        {canPay && paymentAvailable ? (
          <Button onClick={pay} loading={busy === "pay"} disabled={busy !== null}>
            {paymentMethod === "wallet" ? (ar ? "إكمال الدفع بالمحفظة" : "Complete wallet payment") : ar ? "إكمال الدفع بالبطاقة" : "Complete card payment"}
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="secondary" onClick={() => setConfirmCancel(true)} disabled={busy !== null}>
            {ar ? "إلغاء الطلب" : "Cancel order"}
          </Button>
        ) : null}
      </div>
      {canPay && !paymentAvailable ? (
        <p className="max-w-sm text-[0.8125rem] text-text-muted">
          {ar
            ? "الدفع الإلكتروني غير متاح مؤقتًا. يمكنك إلغاء الطلب وإعادة الطلب بالدفع عند الاستلام."
            : "Online payment is temporarily unavailable. You can cancel this order and order again with cash on delivery."}
        </p>
      ) : null}

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={ar ? "هل تريد إلغاء هذا الطلب؟" : "Cancel this order?"}
        closeLabel={ar ? "إغلاق" : "Close"}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>
              {ar ? "لا، احتفظ به" : "No, keep it"}
            </Button>
            <Button onClick={cancel} loading={busy === "cancel"}>
              {ar ? "نعم، ألغِ الطلب" : "Yes, cancel it"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          {ar ? "ستعود القطع إلى المخزون، ولن يُحصَّل أي مبلغ." : "The items go back on sale and nothing will be charged."}
        </p>
      </Dialog>

      <CardPaymentDialog session={card} locale={locale} onClose={() => setCard(null)} onComplete={onCardResult} />
    </div>
  );
}
