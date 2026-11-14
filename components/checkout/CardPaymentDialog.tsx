"use client";

/* The card payment window: Paymob's form, or the local test panel when the server handed out the "MOCK" id. */

import { MockPaymentPanel } from "./MockPaymentPanel";
import { PaymentIframe } from "./PaymentIframe";

export interface CardSession {
  token: string;
  iframeId: string;
}

interface CardPaymentDialogProps {
  session: CardSession | null;
  locale: string;
  onClose: () => void;
  onComplete: (success: boolean) => void;
}

export function CardPaymentDialog({ session, locale, onClose, onComplete }: CardPaymentDialogProps) {
  if (!session) return null;
  return session.iframeId === "MOCK" ? (
    <MockPaymentPanel locale={locale} onClose={onClose} onTransactionComplete={onComplete} />
  ) : (
    <PaymentIframe
      paymentToken={session.token}
      iframeId={session.iframeId}
      locale={locale}
      onClose={onClose}
      onTransactionComplete={(ok) => onComplete(ok)}
    />
  );
}
