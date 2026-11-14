"use client";

/* ══════════════════════════════════════════════════════════════
   Order actions — shared by the list dropdown and the detail page.
   Which buttons appear comes from lib/admin/orders.ts; the server
   action re-checks everything before writing.
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, PackageCheck, RefreshCw, RotateCcw, Truck, XCircle, type LucideIcon } from "lucide-react";
import { markCashCollected, updateOrderStatus } from "@/lib/actions/admin";
import { availableTransitions, forwardBlocker, type OrderState } from "@/lib/admin/orders";
import { errorText, getAdminText, type AdminText } from "@/lib/admin/i18n";
import type { OrderStatus } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

export const ACTION_ICON: Record<OrderStatus, LucideIcon> = {
  pending: RotateCcw,
  confirmed: CheckCircle2,
  processing: RefreshCw,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
  refunded: Ban,
};

export const ACTION_COLOR: Record<OrderStatus, string> = {
  pending: "text-zinc-500",
  confirmed: "text-blue-600 dark:text-blue-400",
  processing: "text-indigo-600 dark:text-indigo-400",
  shipped: "text-orange-600 dark:text-orange-400",
  delivered: "text-emerald-600 dark:text-emerald-400",
  cancelled: "text-red-600 dark:text-red-400",
  refunded: "text-purple-600 dark:text-purple-400",
};

const NEEDS_CONFIRM: OrderStatus[] = ["cancelled", "refunded"];

export function useOrderActions(orderId: string, order: OrderState, locale: string) {
  const text: AdminText = getAdminText(locale);
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);

  const transitions = availableTransitions(order);
  const canCollectCash =
    order.payment_method === "cod" && order.payment_status === "unpaid" && (order.status === "shipped" || order.status === "delivered");
  const blocker = forwardBlocker(order);

  const apply = useCallback(
    (to: OrderStatus) => {
      startTransition(async () => {
        const res = await updateOrderStatus(orderId, to);
        if (res.ok) toast.success(text.action.updated);
        else toast.error(errorText(text.orderError, res.error));
        setConfirming(null);
      });
    },
    [orderId, text],
  );

  const request = useCallback(
    (to: OrderStatus) => {
      if (NEEDS_CONFIRM.includes(to)) setConfirming(to);
      else apply(to);
    },
    [apply],
  );

  const collectCash = useCallback(() => {
    startTransition(async () => {
      const res = await markCashCollected(orderId);
      if (res.ok) toast.success(text.action.cashUpdated);
      else toast.error(errorText(text.orderError, res.error));
    });
  }, [orderId, text]);

  const cancelConfirm = useCallback(() => setConfirming(null), []);

  const dialog = (
    <ConfirmDialog
      open={confirming !== null}
      title={confirming === "refunded" ? text.confirm.refundedTitle : text.confirm.cancelledTitle}
      body={
        confirming === "refunded"
          ? order.payment_method === "cod"
            ? text.confirm.refundedBodyCod
            : text.confirm.refundedBodyOnline
          : text.confirm.cancelledBody
      }
      confirmLabel={confirming ? text.action[confirming as "cancelled" | "refunded"] : ""}
      cancelLabel={text.confirm.keep}
      tone={confirming === "refunded" ? "warning" : "danger"}
      pending={isPending}
      onCancel={cancelConfirm}
      onConfirm={() => confirming && apply(confirming)}
    />
  );

  return { text, transitions, canCollectCash, blocker, isPending, request, collectCash, dialog };
}
