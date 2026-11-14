"use client";

/* ══════════════════════════════════════════════════════════════
   MockPaymentPanel — stands in for the Paymob iframe in local
   development (PAYMOB_MOCK=1). The server only ever hands out the
   "MOCK" iframe id outside production, and /api/checkout/paymob/mock
   answers 404 in production, so this panel can't take real orders.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, X } from "lucide-react";

interface MockPaymentPanelProps {
  locale: string;
  onClose: () => void;
  onTransactionComplete: (success: boolean) => void;
}

export function MockPaymentPanel({ locale, onClose, onTransactionComplete }: MockPaymentPanelProps) {
  const isAr = locale === "ar";
  const [busy, setBusy] = useState(false);

  const pay = async (success: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/paymob/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success }),
      });
      onTransactionComplete(res.ok && success);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-payment-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--background)] border border-[var(--border)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 end-3 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label={isAr ? "إغلاق" : "Close"}
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <FlaskConical size={22} className="text-[var(--warning)]" />
          <h3 id="mock-payment-title" className="text-sm font-bold text-[var(--text-primary)]">
            {isAr ? "دفع تجريبي (بيئة التطوير)" : "Test payment (development)"}
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          {isAr
            ? "مفاتيح Paymob غير مضبوطة محلياً. اختر نتيجة الدفع لتجربة المسار كاملاً."
            : "Paymob keys aren't set locally. Pick a result to walk through the full flow."}
        </p>
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={() => pay(true)} className="btn-primary flex-1 h-11 text-sm font-bold">
            {isAr ? "نجاح الدفع" : "Approve"}
          </button>
          <button type="button" disabled={busy} onClick={() => pay(false)} className="btn-secondary flex-1 h-11 text-sm font-bold">
            {isAr ? "رفض الدفع" : "Decline"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
