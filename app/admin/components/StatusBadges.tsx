/* ══════════════════════════════════════════════════════════════
   Order badges — status, payment status and payment method.
   Plain components (no hooks): usable from server and client code.
   ══════════════════════════════════════════════════════════════ */

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { PaymentMethod } from "@/lib/admin/orders";
import type { AdminText } from "@/lib/admin/i18n";

const BASE =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-sm whitespace-nowrap";

const NEUTRAL = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
const GREEN = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
const BLUE = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
const INDIGO = "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20";
const ORANGE = "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20";
const YELLOW = "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20";
const RED = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20";
const PURPLE = "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: YELLOW,
  confirmed: BLUE,
  processing: INDIGO,
  shipped: ORANGE,
  delivered: GREEN,
  cancelled: RED,
  refunded: PURPLE,
};

const PAYMENT_COLOR: Record<PaymentStatus, string> = {
  unpaid: NEUTRAL,
  paid: GREEN,
  failed: RED,
  refunded: PURPLE,
};

export function OrderStatusBadge({ status, text }: { status: OrderStatus; text: AdminText }) {
  return <span className={`${BASE} ${STATUS_COLOR[status] ?? NEUTRAL}`}>{text.status[status] ?? status}</span>;
}

export function PaymentStatusBadge({ status, text }: { status: PaymentStatus; text: AdminText }) {
  return <span className={`${BASE} ${PAYMENT_COLOR[status] ?? NEUTRAL}`}>{text.payment[status] ?? status}</span>;
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
    return <span className="text-xs font-medium text-zinc-400">{text.methodUnknown}</span>;
  }
  const Icon = METHOD_ICON[method];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
      <Icon size={14} className="shrink-0 text-zinc-400" aria-hidden />
      {long ? text.method[method] : text.methodShort[method]}
    </span>
  );
}
