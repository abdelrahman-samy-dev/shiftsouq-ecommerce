/* ══════════════════════════════════════════════════════════════
   Order badges — status, payment status and payment method.
   Plain components (no hooks): usable from server and client code.
   Calm tags on the design tokens (no bright pills).
   ══════════════════════════════════════════════════════════════ */

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { PaymentMethod } from "@/lib/admin/orders";
import type { AdminText } from "@/lib/admin/i18n";
import { Tag, type TagTone } from "./ui";

const STATUS_TONE: Record<OrderStatus, TagTone> = {
  pending: "warning",
  confirmed: "neutral",
  processing: "neutral",
  shipped: "accent",
  delivered: "success",
  cancelled: "muted",
  refunded: "danger",
};

const PAYMENT_TONE: Record<PaymentStatus, TagTone> = {
  unpaid: "muted",
  paid: "success",
  failed: "danger",
  refunded: "danger",
};

export function OrderStatusBadge({ status, text }: { status: OrderStatus; text: AdminText }) {
  return (
    <Tag tone={STATUS_TONE[status] ?? "neutral"} dot>
      {text.status[status] ?? status}
    </Tag>
  );
}

export function PaymentStatusBadge({ status, text }: { status: PaymentStatus; text: AdminText }) {
  return <Tag tone={PAYMENT_TONE[status] ?? "neutral"}>{text.payment[status] ?? status}</Tag>;
}

const METHOD_ICON = { cod: Banknote, card: CreditCard, wallet: Smartphone } as const;

export function PaymentMethodBadge({
  method,
  text,
  long = false,
}: {
  method: PaymentMethod | null;
  text: AdminText;
  long?: boolean;
}) {
  if (!method) {
    return <span className="text-[0.75rem] text-text-faint">{text.methodUnknown}</span>;
  }
  const Icon = METHOD_ICON[method];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.75rem] text-text-secondary">
      <Icon aria-hidden="true" className="size-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
      {long ? text.method[method] : text.methodShort[method]}
    </span>
  );
}
