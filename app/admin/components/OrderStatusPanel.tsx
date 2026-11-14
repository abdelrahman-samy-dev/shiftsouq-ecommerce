"use client";

/* Status buttons on the order detail page (same rules as the list dropdown). */

import { Banknote } from "lucide-react";
import { Spinner } from "@/components/ds";
import type { OrderState } from "@/lib/admin/orders";
import type { OrderStatus } from "@/lib/types";
import { adminButton } from "./buttons";
import { ACTION_ICON, useOrderActions } from "./useOrderActions";

type ActionStatus = Exclude<OrderStatus, "pending">;

export function OrderStatusPanel({ orderId, order, locale }: { orderId: string; order: OrderState; locale: string }) {
  const { text, transitions, canCollectCash, blocker, isPending, request, collectCash, dialog } = useOrderActions(orderId, order, locale);
  const forward = transitions.filter((s) => s !== "cancelled" && s !== "refunded");
  const final = transitions.filter((s) => s === "cancelled" || s === "refunded");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {forward.map((to, i) => {
          const Icon = ACTION_ICON[to];
          return (
            <button key={to} type="button" disabled={isPending} onClick={() => request(to)} className={adminButton(i === 0 ? "primary" : "outline", "sm")}>
              <Icon aria-hidden="true" strokeWidth={1.75} />
              {text.action[to as ActionStatus]}
            </button>
          );
        })}
        {canCollectCash && (
          <button type="button" disabled={isPending} onClick={collectCash} className={adminButton(forward.length ? "outline" : "primary", "sm")}>
            <Banknote aria-hidden="true" strokeWidth={1.75} />
            {text.action.cash}
          </button>
        )}
        {final.map((to) => {
          const Icon = ACTION_ICON[to];
          return (
            <button key={to} type="button" disabled={isPending} onClick={() => request(to)} className={adminButton("danger", "sm")}>
              <Icon aria-hidden="true" strokeWidth={1.75} />
              {text.action[to as ActionStatus]}
            </button>
          );
        })}
        {isPending && <Spinner className="text-text-muted" />}
      </div>
      {blocker === "awaiting_online_payment" && (
        <p className="text-[0.8125rem] text-warning">{text.orderError.awaiting_online_payment}</p>
      )}
      {transitions.length === 0 && !canCollectCash && <p className="text-[0.8125rem] text-text-muted">{text.action.none}</p>}
      {dialog}
    </div>
  );
}
