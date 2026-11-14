"use client";

/* ══════════════════════════════════════════════════════════════
   OrderActionsDropdown — actions menu for one row of the orders list.
   Shows only the status changes the rules allow for this order;
   cancelling and refunding ask for confirmation first.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Eye, Loader2, MoreHorizontal } from "lucide-react";
import type { OrderState } from "@/lib/admin/orders";
import type { OrderStatus } from "@/lib/types";
import { ACTION_COLOR, ACTION_ICON, useOrderActions } from "./useOrderActions";

type ActionStatus = Exclude<OrderStatus, "pending">;

export function OrderActionsDropdown({
  orderId,
  order,
  locale,
}: {
  orderId: string;
  order: OrderState;
  locale: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";
  const { text, transitions, canCollectCash, blocker, isPending, request, collectCash, dialog } = useOrderActions(
    orderId,
    order,
    locale,
  );

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const itemClass =
    "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group text-start";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold transition-all px-3 py-1.5 rounded-lg shadow-sm ${
          isPending
            ? "opacity-60 cursor-wait bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        }`}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
        {text.action.actions}
      </button>

      {isOpen && !isPending && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 ${isAr ? "left-0" : "right-0"} w-60 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <Link href={`/admin/orders/${orderId}`} role="menuitem" className={itemClass} onClick={() => setIsOpen(false)}>
            <Eye size={16} className="text-zinc-500 shrink-0" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
              {text.action.view}
            </span>
          </Link>

          {transitions.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-y border-zinc-100 dark:border-zinc-800/80">
                {text.action.orderStatus}
              </div>
              {transitions.map((to) => {
                const Icon = ACTION_ICON[to];
                return (
                  <button
                    key={to}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOpen(false);
                      request(to);
                    }}
                    className={itemClass}
                  >
                    <Icon size={16} className={`${ACTION_COLOR[to]} shrink-0`} strokeWidth={2} />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
                      {text.action[to as ActionStatus]}
                    </span>
                    <ArrowRight
                      size={12}
                      className={`${isAr ? "mr-auto rotate-180" : "ml-auto"} text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity`}
                    />
                  </button>
                );
              })}
            </>
          )}

          {canCollectCash && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-y border-zinc-100 dark:border-zinc-800/80">
                {text.action.payment}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  collectCash();
                }}
                className={itemClass}
              >
                <Banknote size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{text.action.cash}</span>
              </button>
            </>
          )}

          {blocker === "awaiting_online_payment" && (
            <div className="px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-500/5 border-t border-zinc-100 dark:border-zinc-800/80 whitespace-normal text-start">
              {text.orderError.awaiting_online_payment}
            </div>
          )}

          {transitions.length === 0 && !canCollectCash && blocker === null && (
            <div className="px-4 py-3 text-sm text-zinc-400 text-center border-t border-zinc-100 dark:border-zinc-800/80">
              {text.action.none}
            </div>
          )}
        </div>
      )}
      {dialog}
    </div>
  );
}
