"use client";

/* ══════════════════════════════════════════════════════════════
   OrderActionsDropdown — actions menu for one row of the orders list.
   Shows only the status changes the rules allow for this order;
   cancelling and refunding ask for confirmation first.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Banknote, Eye, MoreHorizontal, Printer } from "lucide-react";
import { Spinner } from "@/components/ds";
import type { OrderState } from "@/lib/admin/orders";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminButton } from "./buttons";
import { ACTION_COLOR, ACTION_ICON, useOrderActions } from "./useOrderActions";

type ActionStatus = Exclude<OrderStatus, "pending">;

export function OrderActionsDropdown({
  orderId,
  order,
  locale,
  orderNumber,
}: {
  orderId: string;
  order: OrderState;
  locale: string;
  orderNumber?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { text, transitions, canCollectCash, blocker, isPending, request, collectCash, dialog } = useOrderActions(orderId, order, locale);
  const label = orderNumber ? `${text.action.actions}: ${orderNumber}` : text.action.actions;

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  const onMenuKey = (e: KeyboardEvent) => {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[2px] px-3 py-2 text-start text-[0.8125rem] text-text-primary outline-none hover:bg-surface focus-visible:bg-surface pointer-coarse:py-3 [&_svg]:size-4 [&_svg]:shrink-0";
  const heading = "px-3 pb-1 pt-2 t-eyebrow";

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        disabled={isPending}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className={adminButton("ghost", "icon")}
      >
        {isPending ? <Spinner /> : <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />}
      </button>

      {isOpen && !isPending && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute end-0 top-full z-30 mt-1 w-60 rounded-[4px] border border-border bg-surface-elevated p-1 shadow-[var(--shadow-float)]"
        >
          <Link href={`/admin/orders/${orderId}`} role="menuitem" tabIndex={-1} className={itemClass} onClick={() => setIsOpen(false)}>
            <Eye aria-hidden="true" className="text-text-muted" strokeWidth={1.75} />
            {text.action.view}
          </Link>
          <Link href={`/admin/orders/${orderId}/print`} role="menuitem" tabIndex={-1} className={itemClass} onClick={() => setIsOpen(false)}>
            <Printer aria-hidden="true" className="text-text-muted" strokeWidth={1.75} />
            {text.orderList.packingSlip}
          </Link>

          {transitions.length > 0 && (
            <>
              <div role="separator" className="my-1 h-px bg-border" />
              <p className={heading}>{text.action.orderStatus}</p>
              {transitions.map((to) => {
                const Icon = ACTION_ICON[to];
                return (
                  <button
                    key={to}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setIsOpen(false);
                      request(to);
                    }}
                    className={cn(itemClass, (to === "cancelled" || to === "refunded") && "text-destructive")}
                  >
                    <Icon aria-hidden="true" className={ACTION_COLOR[to]} strokeWidth={1.75} />
                    {text.action[to as ActionStatus]}
                  </button>
                );
              })}
            </>
          )}

          {canCollectCash && (
            <>
              <div role="separator" className="my-1 h-px bg-border" />
              <p className={heading}>{text.action.payment}</p>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setIsOpen(false);
                  collectCash();
                }}
                className={itemClass}
              >
                <Banknote aria-hidden="true" className="text-success" strokeWidth={1.75} />
                {text.action.cash}
              </button>
            </>
          )}

          {blocker === "awaiting_online_payment" && (
            <p className="mt-1 rounded-[2px] bg-warning-bg px-3 py-2 text-[0.75rem] leading-snug text-warning">
              {text.orderError.awaiting_online_payment}
            </p>
          )}

          {transitions.length === 0 && !canCollectCash && blocker === null && (
            <p className="px-3 py-2 text-[0.75rem] text-text-muted">{text.action.none}</p>
          )}
        </div>
      )}
      {dialog}
    </div>
  );
}
