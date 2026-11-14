"use client";

/* ══════════════════════════════════════════════════════════════
   PaymentIframe — Paymob's card form, inside our page
   ──────────────────────────────────────────────────────────────
   A modal <dialog> (focus stays inside, the page behind is inert)
   holding Paymob's hosted card form. It never closes on a stray
   tap or Esc — that could abort a payment mid 3-D Secure — only
   with the close button. Messages from Paymob's own origins tell
   us when the transaction finished; the order is only marked paid
   by the signed webhook, never by this page.
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, RefreshCw, X } from "lucide-react";
import { Button, Spinner } from "@/components/ds";

interface PaymentIframeProps {
  paymentToken: string;
  iframeId: string;
  onClose: () => void;
  onTransactionComplete: (success: boolean, data?: Record<string, string>) => void;
  locale: string;
}

const PAYMOB_IFRAME_BASE = "https://accept.paymob.com/api/acceptance/iframes";
const PAYMOB_ORIGINS = ["https://accept.paymob.com", "https://egypt.paymob.com", "https://accept.paymobsolutions.com"];
/** After this long without a load event, show the form anyway with a "retry" hint. */
const LOAD_TIMEOUT_MS = 12_000;

export function PaymentIframe({ paymentToken, iframeId, onClose, onTransactionComplete, locale }: PaymentIframeProps) {
  const isAr = locale === "ar";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const src = `${PAYMOB_IFRAME_BASE}/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(paymentToken)}`;

  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.open) el.showModal();
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setSlow(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, attempt]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!PAYMOB_ORIGINS.includes(event.origin)) return;
      if (event.data && typeof event.data === "object") {
        const { success, txn_response_code } = event.data as { success?: unknown; txn_response_code?: unknown };
        if (success === true || txn_response_code === "APPROVED") onTransactionComplete(true, event.data);
        else if (success === false) onTransactionComplete(false, event.data);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onTransactionComplete]);

  const retry = useCallback(() => {
    setLoading(true);
    setFailed(false);
    setSlow(false);
    setAttempt((n) => n + 1);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="payment-iframe-title"
      onCancel={(e) => e.preventDefault()}
      className="ds-overlay ds-dialog m-0 h-dvh max-h-dvh w-full max-w-full bg-surface-elevated p-0 text-text-primary sm:m-auto sm:h-[min(760px,92dvh)] sm:w-[min(92vw,560px)] sm:rounded-sm"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
          <div className="flex flex-col">
            <h2 id="payment-iframe-title" className="text-base font-medium">
              {isAr ? "الدفع بالبطاقة" : "Card payment"}
            </h2>
            <p className="flex items-center gap-1.5 text-[0.75rem] text-text-muted">
              <Lock className="size-3" strokeWidth={2} aria-hidden="true" />
              {isAr ? "اتصال مشفّر عبر Paymob" : "Encrypted connection via Paymob"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? "إغلاق نموذج الدفع" : "Close the payment form"}
            className="-me-2 inline-flex size-11 items-center justify-center rounded-sm hover:bg-surface"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-white">
          {loading && !failed ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-elevated text-sm text-text-muted">
              <Spinner className="size-5" />
              {isAr ? "جارٍ تحميل نموذج الدفع الآمن…" : "Loading the secure payment form…"}
            </div>
          ) : null}

          {failed ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface-elevated p-6 text-center">
              <p className="text-sm font-medium">{isAr ? "تعذر تحميل نموذج الدفع" : "The payment form didn't load"}</p>
              <p className="max-w-xs text-[0.8125rem] text-text-muted">
                {isAr ? "تحقق من اتصالك بالإنترنت ثم أعد المحاولة." : "Check your connection, then try again."}
              </p>
              <Button variant="secondary" onClick={retry} icon={<RefreshCw className="size-4" strokeWidth={1.5} />}>
                {isAr ? "إعادة المحاولة" : "Try again"}
              </Button>
            </div>
          ) : null}

          <iframe
            key={attempt}
            src={src}
            title={isAr ? "نموذج الدفع الآمن" : "Secure payment form"}
            onLoad={() => {
              setLoading(false);
              setSlow(false);
            }}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            className="absolute inset-0 block h-full w-full border-0"
            allow="payment"
          />

          {slow && !failed ? (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-border bg-warning-bg px-4 py-2.5 text-[0.8125rem] text-text-secondary">
              {isAr ? "إذا لم يظهر النموذج، أعد تحميله." : "If the form doesn't appear, reload it."}
              <button type="button" onClick={retry} className="ms-auto min-h-10 font-medium text-text-primary underline underline-offset-4">
                {isAr ? "إعادة التحميل" : "Reload"}
              </button>
            </div>
          ) : null}
        </div>

        <p className="flex shrink-0 items-start gap-2 border-t border-border px-5 py-3 text-[0.75rem] leading-relaxed text-text-muted">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
          {isAr
            ? "يستضيف Paymob هذا النموذج وفق معيار PCI-DSS، ولا تُحفظ بيانات بطاقتك على خوادمنا."
            : "Paymob hosts this form under PCI-DSS. Your card details never touch our servers."}
        </p>
      </div>
    </dialog>
  );
}
