"use client";

/* ══════════════════════════════════════════════════════════════
   MockPaymentPanel — stands in for the Paymob card form in local
   development (PAYMOB_MOCK=1). The server only ever hands out the
   "MOCK" iframe id outside production, and /api/checkout/paymob/mock
   answers 404 in production, so this panel can't take real orders.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button, Dialog } from "@/components/ds";

interface MockPaymentPanelProps {
  locale: string;
  onClose: () => void;
  onTransactionComplete: (success: boolean) => void;
}

export function MockPaymentPanel({ locale, onClose, onTransactionComplete }: MockPaymentPanelProps) {
  const isAr = locale === "ar";
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);

  const pay = async (success: boolean) => {
    setBusy(success ? "approve" : "decline");
    try {
      const res = await fetch("/api/checkout/paymob/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success }),
      });
      onTransactionComplete(res.ok && success);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      closeLabel={isAr ? "إغلاق" : "Close"}
      title={
        <span className="flex items-center gap-2">
          <FlaskConical className="size-5 text-warning" strokeWidth={1.5} aria-hidden="true" />
          {isAr ? "دفع تجريبي (بيئة التطوير)" : "Test payment (development)"}
        </span>
      }
    >
      <p className="text-sm text-text-secondary">
        {isAr
          ? "مفاتيح Paymob غير مضبوطة محليًا. اختر نتيجة الدفع لتجربة المسار كاملًا."
          : "Paymob keys aren't set locally. Pick a result to walk through the full flow."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button fullWidth loading={busy === "approve"} disabled={busy !== null} onClick={() => pay(true)}>
          {isAr ? "قبول الدفع" : "Approve"}
        </Button>
        <Button fullWidth variant="secondary" loading={busy === "decline"} disabled={busy !== null} onClick={() => pay(false)}>
          {isAr ? "رفض الدفع" : "Decline"}
        </Button>
      </div>
    </Dialog>
  );
}
