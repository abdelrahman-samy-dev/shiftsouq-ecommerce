"use client";

/* ══════════════════════════════════════════════════════════════
   PaymentIframe — Embedded Paymob Card Payment
   ──────────────────────────────────────────────────────────────
   Hosts the Paymob iFrame inline on the checkout page so users
   complete card payment without ever leaving ShiftSouq.

   Features:
   • Premium shimmer skeleton while the iFrame loads
   • Responsive container: full screen on phones, a tall dialog on
     larger screens; Paymob's whole form (including the 3-D Secure
     step) scrolls inside the iframe — nothing is cropped
   • Smooth Framer Motion entrance/exit animations
   • Fallback timeout (12s) to escape stuck loading states
   • Listens for postMessage events from Paymob to detect
     transaction completion or failure
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Lock, X, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────── */

interface PaymentIframeProps {
  paymentToken: string;
  iframeId: string;
  onClose: () => void;
  onTransactionComplete: (success: boolean, data?: Record<string, string>) => void;
  locale: string;
}

/* ── Constants ───────────────────────────────────────────────── */

const PAYMOB_IFRAME_BASE = "https://accept.paymob.com/api/acceptance/iframes";

/** Maximum time to wait for the iFrame to load before showing timeout error */
const LOAD_TIMEOUT_MS = 12_000;

/* ── Component ───────────────────────────────────────────────── */

export function PaymentIframe({
  paymentToken,
  iframeId,
  onClose,
  onTransactionComplete,
  locale,
}: PaymentIframeProps) {
  const isAr = locale === "ar";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const iframeUrl = `${PAYMOB_IFRAME_BASE}/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(paymentToken)}`;

  /* No beforeunload guard: after a payment Paymob's callback page navigates
     this window to the receipt, and a "Leave site?" prompt would block it. */

  /* ── Fallback Timeout ──────────────────────────────────────── */
  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      if (isLoading) {
        // Don't show error — force the iframe visible in case it loaded
        // but onLoad didn't fire (cross-origin restriction)
        setIsLoading(false);
        setIsTimeout(true);
      }
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading, retryCount]);

  /* ── Listen for Paymob postMessage Events ──────────────────── */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only trust messages from Paymob's domain
      if (
        event.origin !== "https://accept.paymob.com" &&
        event.origin !== "https://egypt.paymob.com" &&
        event.origin !== "https://accept.paymobsolutions.com"
      ) {
        return;
      }

      // Paymob sends transaction status via postMessage
      if (event.data && typeof event.data === "object") {
        const { success, txn_response_code } = event.data;
        if (success === true || txn_response_code === "APPROVED") {
          onTransactionComplete(true, event.data);
        } else if (success === false) {
          onTransactionComplete(false, event.data);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTransactionComplete]);

  /* ── iFrame Load Handler ───────────────────────────────────── */
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setIsTimeout(false);
    setHasError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setIsTimeout(false);
    setRetryCount((c) => c + 1);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-iframe-title"
    >
      {/* No click-away close: a stray tap must not abort a payment (e.g. during 3-D Secure). */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full sm:max-w-[560px] h-full sm:h-[min(760px,92vh)] flex flex-col bg-white dark:bg-[var(--background)] sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] shrink-0 bg-[var(--background)] relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <CreditCard size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 id="payment-iframe-title" className="text-sm font-bold text-[var(--text-primary)]">
                {isAr ? "الدفع بالبطاقة" : "Card Payment"}
              </h3>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Lock size={11} strokeWidth={2.5} />
                {isAr
                  ? "اتصال مشفر وآمن"
                  : "Secure, encrypted connection"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              "border border-[var(--border)] bg-[var(--background)]",
              "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              "hover:border-[var(--border-hover)] transition-all duration-200"
            )}
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── iFrame Container ────────────────────────────────── */}
        <div className="relative w-full flex-1 min-h-0 bg-white">
          {/* Shimmer Loading Overlay */}
          <AnimatePresence>
            {isLoading && !hasError && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-white p-6"
              >
                {/* Shimmer Card Skeleton */}
                <div className="w-full max-w-sm space-y-4">
                  {/* Card number skeleton */}
                  <div className="space-y-2">
                    <div className="payment-shimmer h-3 w-24 rounded-md" />
                    <div className="payment-shimmer h-12 w-full rounded-xl" />
                  </div>
                  {/* Expiry + CVV row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="payment-shimmer h-3 w-16 rounded-md" />
                      <div className="payment-shimmer h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="payment-shimmer h-3 w-12 rounded-md" />
                      <div className="payment-shimmer h-12 rounded-xl" />
                    </div>
                  </div>
                  {/* Cardholder name */}
                  <div className="space-y-2">
                    <div className="payment-shimmer h-3 w-32 rounded-md" />
                    <div className="payment-shimmer h-12 w-full rounded-xl" />
                  </div>
                  {/* Submit button */}
                  <div className="payment-shimmer h-12 w-full rounded-xl mt-2" />
                </div>

                {/* Loading text */}
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw size={14} />
                  </motion.div>
                  {isAr
                    ? "جارٍ تحميل نموذج الدفع الآمن..."
                    : "Loading secure payment form..."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[var(--background)]">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--destructive-bg)",
                  border: "1px solid var(--destructive-border)",
                }}
              >
                <AlertTriangle
                  size={24}
                  strokeWidth={1.8}
                  className="text-[var(--destructive)]"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {isAr
                    ? "تعذر تحميل نموذج الدفع"
                    : "Payment form failed to load"}
                </p>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                  {isAr
                    ? "تحقق من اتصال الإنترنت وحاول مرة أخرى"
                    : "Please check your connection and try again"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="btn-secondary gap-2 text-sm"
              >
                <RefreshCw size={14} />
                {isAr ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          )}

          {/* Actual iFrame */}
          <iframe
            ref={iframeRef}
            key={retryCount}
            src={iframeUrl}
            title={isAr ? "نموذج الدفع الآمن" : "Secure Payment Form"}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className={cn(
              "absolute inset-0 w-full h-full border-0 block transition-opacity duration-300",
              isLoading || hasError ? "opacity-0" : "opacity-100"
            )}
            allow="payment"
          />

          {/* Timeout notice */}
          {isTimeout && !isLoading && !hasError && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center gap-2.5 px-4 py-2.5 text-xs z-20"
              style={{
                background: "var(--warning-bg)",
                borderTop: "1px solid rgba(245, 158, 11, 0.2)",
                color: "var(--text-secondary)",
              }}
            >
              <Clock size={13} className="text-[var(--warning)] flex-shrink-0" />
              {isAr
                ? "إذا لم يظهر النموذج، اضغط إعادة المحاولة"
                : "If the form doesn't appear, click retry"}
              <button
                type="button"
                onClick={handleRetry}
                className="ms-auto text-[var(--text-primary)] font-semibold hover:underline"
              >
                {isAr ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          )}
        </div>

        {/* ── Security Footer ─────────────────────────────────── */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-t"
          style={{
            background: "var(--success-bg)",
            borderColor: "var(--border)",
          }}
        >
          <Lock size={14} className="text-[var(--success)] flex-shrink-0" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isAr
              ? "هذا النموذج مستضاف بواسطة Paymob ومحمي بمعايير PCI-DSS. لا يتم تخزين بيانات بطاقتك على خوادمنا."
              : "This form is hosted by Paymob and protected by PCI-DSS standards. Your card details are never stored on our servers."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
