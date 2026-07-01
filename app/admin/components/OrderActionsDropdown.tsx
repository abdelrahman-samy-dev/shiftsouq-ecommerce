"use client";

/* ══════════════════════════════════════════════════════════════
   OrderActionsDropdown — Admin Order Actions
   ──────────────────────────────────────────────────────────────
   Context-aware dropdown that shows only valid next-status
   transitions for each order. Includes status update, payment
   status update, and order detail expansion.
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useTransition } from "react";
import {
  MoreHorizontal,
  Truck,
  CheckCircle2,
  XCircle,
  PackageCheck,
  RefreshCw,
  CreditCard,
  ChevronRight,
  Loader2,
  ArrowRight,
  Ban,
} from "lucide-react";
import { updateOrderStatus, updatePaymentStatus } from "@/lib/actions/admin";
import { toast } from "sonner";

/* ── Types ───────────────────────────────────────────────────── */

interface OrderActionsDropdownProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  locale: string;
}

/* ── Status config ───────────────────────────────────────────── */

interface StatusOption {
  value: string;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "confirmed",
    label: "Confirm",
    labelAr: "تأكيد",
    icon: CheckCircle2,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "processing",
    label: "Process",
    labelAr: "معالجة",
    icon: RefreshCw,
    color: "text-indigo-600 dark:text-indigo-400",
  },
  {
    value: "shipped",
    label: "Ship",
    labelAr: "شحن",
    icon: Truck,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    value: "delivered",
    label: "Delivered",
    labelAr: "تم التسليم",
    icon: PackageCheck,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "cancelled",
    label: "Cancel",
    labelAr: "إلغاء",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
  },
  {
    value: "refunded",
    label: "Refund",
    labelAr: "استرداد",
    icon: Ban,
    color: "text-purple-600 dark:text-purple-400",
  },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

const PAYMENT_OPTIONS = [
  { value: "paid", label: "Mark Paid", labelAr: "تم الدفع", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "refunded", label: "Mark Refunded", labelAr: "مسترد", color: "text-purple-600 dark:text-purple-400" },
];

/* ── Component ───────────────────────────────────────────────── */

export function OrderActionsDropdown({
  orderId,
  currentStatus,
  currentPaymentStatus,
  locale,
}: OrderActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowPaymentMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Get valid next statuses */
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const availableStatusOptions = STATUS_OPTIONS.filter((opt) =>
    allowedTransitions.includes(opt.value)
  );

  /* Available payment actions */
  const availablePaymentOptions = PAYMENT_OPTIONS.filter(
    (opt) => opt.value !== currentPaymentStatus
  );

  const isTerminal = allowedTransitions.length === 0 && availablePaymentOptions.length === 0;

  /* ── Handlers ─────────────────────────────────────────────── */

  const handleStatusChange = (newStatus: string) => {
    setIsOpen(false);
    setShowPaymentMenu(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isAr ? "تم تحديث حالة الطلب" : "Order status updated"
        );
      }
    });
  };

  const handlePaymentChange = (newStatus: string) => {
    setIsOpen(false);
    setShowPaymentMenu(false);
    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isAr ? "تم تحديث حالة الدفع" : "Payment status updated"
        );
      }
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowPaymentMenu(false);
        }}
        disabled={isPending || isTerminal}
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold transition-all px-3 py-1.5 rounded-lg shadow-sm ${
          isPending
            ? "opacity-60 cursor-wait bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            : isTerminal
            ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        }`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MoreHorizontal size={14} />
        )}
        {isAr ? "إجراءات" : "Actions"}
      </button>

      {/* Dropdown */}
      {isOpen && !isPending && (
        <div
          className={`absolute z-50 mt-1.5 ${
            isAr ? "left-0" : "right-0"
          } w-52 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Fulfillment Status section */}
          {availableStatusOptions.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/80">
                {isAr ? "حالة الطلب" : "Order Status"}
              </div>
              {availableStatusOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
                  >
                    <Icon
                      size={16}
                      className={`${opt.color} shrink-0`}
                      strokeWidth={2}
                    />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
                      {isAr ? opt.labelAr : opt.label}
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

          {/* Payment Status section */}
          {availablePaymentOptions.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-t border-zinc-100 dark:border-zinc-800/80">
                {isAr ? "حالة الدفع" : "Payment"}
              </div>
              {availablePaymentOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePaymentChange(opt.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
                >
                  <CreditCard
                    size={16}
                    className={`${opt.color} shrink-0`}
                    strokeWidth={2}
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
                    {isAr ? opt.labelAr : opt.label}
                  </span>
                  <ArrowRight
                    size={12}
                    className={`${isAr ? "mr-auto rotate-180" : "ml-auto"} text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                </button>
              ))}
            </>
          )}

          {/* No actions available */}
          {availableStatusOptions.length === 0 &&
            availablePaymentOptions.length === 0 && (
              <div className="px-4 py-3 text-sm text-zinc-400 text-center">
                {isAr ? "لا توجد إجراءات متاحة" : "No actions available"}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
