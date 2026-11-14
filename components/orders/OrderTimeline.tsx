/* ══════════════════════════════════════════════════════════════
   OrderTimeline — placed → confirmed → preparing → shipped →
   delivered. Vertical on phones, horizontal from tablet up.
   Cancelled and refunded orders show their own end state.
   No hooks: usable from server and client components.
   ══════════════════════════════════════════════════════════════ */

import { cn } from "@/lib/utils";
import { formatOrderDate, type Lang } from "./order-copy";
import { orderTimeline, type OrderStatusValue, type TimelineStep } from "./order-rules";

const LABELS: Record<TimelineStep, [string, string]> = {
  pending: ["Order placed", "تم استلام الطلب"],
  confirmed: ["Confirmed", "تم التأكيد"],
  processing: ["Preparing", "قيد التجهيز"],
  shipped: ["Shipped", "تم الشحن"],
  delivered: ["Delivered", "تم التوصيل"],
};

const ENDED: Record<"cancelled" | "refunded", { title: [string, string]; body: [string, string] }> = {
  cancelled: {
    title: ["Order cancelled", "أُلغي الطلب"],
    body: ["This order was cancelled. Nothing will be delivered or charged.", "أُلغي هذا الطلب، فلن يُوصَّل ولن يُحصَّل أي مبلغ."],
  },
  refunded: {
    title: ["Refunded", "تم استرداد المبلغ"],
    body: ["The amount paid for this order was refunded.", "استُرد المبلغ المدفوع لهذا الطلب."],
  },
};

interface OrderTimelineProps {
  status: OrderStatusValue;
  createdAt: string;
  updatedAt?: string | null;
  lang: Lang;
  className?: string;
}

export function OrderTimeline({ status, createdAt, updatedAt, lang, className }: OrderTimelineProps) {
  const ar = lang === "ar";
  const { steps, ended } = orderTimeline(status);
  const pick = (pair: [string, string]) => (ar ? pair[1] : pair[0]);

  if (ended) {
    return (
      <div className={cn("border border-border px-5 py-4 rounded-sm", className)}>
        <p className="text-sm font-medium text-text-primary">{pick(ENDED[ended].title)}</p>
        <p className="mt-1 text-[0.8125rem] text-text-secondary">{pick(ENDED[ended].body)}</p>
        {updatedAt ? <p className="mt-2 text-[0.8125rem] text-text-muted">{formatOrderDate(updatedAt, lang, true)}</p> : null}
      </div>
    );
  }

  return (
    // The last step takes only its own width, so the line runs the full width of the order above it.
    <ol className={cn("grid gap-0 md:grid-cols-[repeat(4,minmax(0,1fr))_max-content]", className)} aria-label={ar ? "حالة الطلب" : "Order status"}>
      {steps.map((step, i) => {
        const date =
          step.key === "pending" ? formatOrderDate(createdAt, lang) : step.state === "current" && updatedAt ? formatOrderDate(updatedAt, lang) : null;
        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex gap-4 pb-6 last:pb-0 md:flex-col md:gap-3 md:pb-0 md:pe-4 md:last:pe-0"
          >
            {/* connector */}
            {i < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-[7px] top-4 bottom-0 w-px md:start-4 md:end-0 md:top-[7px] md:bottom-auto md:h-px md:w-auto",
                  steps[i + 1].state === "upcoming" ? "bg-border" : "bg-text-primary",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-[1] mt-0.5 size-[15px] shrink-0 rounded-full border md:mt-0",
                step.state === "done" && "border-text-primary bg-text-primary",
                step.state === "current" && "border-text-primary bg-background ring-4 ring-inset ring-text-primary",
                step.state === "upcoming" && "border-border-hover bg-background",
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span className={cn("text-sm", step.state === "upcoming" ? "text-text-muted" : "text-text-primary", step.state === "current" && "font-medium")}>
                {pick(LABELS[step.key])}
              </span>
              {date ? <span className="text-[0.8125rem] text-text-muted">{date}</span> : null}
              <span className="sr-only">
                {step.state === "done" ? (ar ? "(مكتمل)" : "(done)") : step.state === "current" ? (ar ? "(الحالة الحالية)" : "(current)") : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
