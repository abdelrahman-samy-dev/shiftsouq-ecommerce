"use client";

/* Status buttons on the order detail page (same rules as the list dropdown). */

import { Banknote, Loader2 } from "lucide-react";
import type { OrderState } from "@/lib/admin/orders";
import type { OrderStatus } from "@/lib/types";
import { ACTION_COLOR, ACTION_ICON, useOrderActions } from "./useOrderActions";

type ActionStatus = Exclude<OrderStatus, "pending">;

export function OrderStatusPanel({ orderId, order, locale }: { orderId: string; order: OrderState; locale: string }) {
  const { text, transitions, canCollectCash, blocker, isPending, request, collectCash, dialog } = useOrderActions(
    orderId,
    order,
    locale,
  );

  const btn =
    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {transitions.map((to) => {
          const Icon = ACTION_ICON[to];
          return (
            <button key={to} type="button" disabled={isPending} onClick={() => request(to)} className={btn}>
              <Icon size={16} className={ACTION_COLOR[to]} />
              {text.action[to as ActionStatus]}
            </button>
          );
        })}
        {canCollectCash && (
          <button type="button" disabled={isPending} onClick={collectCash} className={btn}>
            <Banknote size={16} className="text-emerald-600 dark:text-emerald-400" />
            {text.action.cash}
          </button>
        )}
        {isPending && <Loader2 size={18} className="animate-spin text-zinc-400 self-center" />}
      </div>
      {blocker === "awaiting_online_payment" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{text.orderError.awaiting_online_payment}</p>
      )}
      {transitions.length === 0 && !canCollectCash && <p className="text-sm text-zinc-500">{text.action.none}</p>}
      {dialog}
    </div>
  );
}
