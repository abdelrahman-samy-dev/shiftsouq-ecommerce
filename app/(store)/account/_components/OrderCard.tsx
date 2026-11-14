/* One order in a list: number, date, status, items preview, total and a link to the details. Server component. */

import Image from "next/image";
import Link from "next/link";
import type { MyOrderSummary } from "@/lib/dal/orders";
import { formatMoney } from "@/components/checkout/checkout-rules";
import { formatOrderDate, paymentStatusLabel, statusLabel, type Lang } from "@/components/orders/order-copy";
import { Badge } from "@/components/ds";
import { cn } from "@/lib/utils";
import { accountCopy } from "./copy";

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "ink"> = {
  pending: "warning",
  confirmed: "neutral",
  processing: "neutral",
  shipped: "ink",
  delivered: "success",
  cancelled: "danger",
  refunded: "neutral",
};

export function OrderCard({ order, lang, className }: { order: MyOrderSummary; lang: Lang; className?: string }) {
  const t = accountCopy(lang);
  const preview = order.items.slice(0, 4);
  return (
    <article className={cn("flex flex-col gap-5 border border-border p-5 md:p-6 rounded-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[0.9375rem] font-medium tabular-nums text-text-primary">
            <span dir="ltr">{order.orderNumber}</span>
          </h3>
          <p className="text-[0.8125rem] text-text-muted">
            {formatOrderDate(order.createdAt, lang)} · {t.items(order.itemCount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TONE[order.status] ?? "neutral"} className={(TONE[order.status] ?? "neutral") === "neutral" ? "border border-border" : undefined}>{statusLabel(order.status, lang)}</Badge>
          {order.paymentStatus === "failed" || (order.canPay && order.paymentStatus === "unpaid") ? (
            <Badge tone="danger">{paymentStatusLabel(order.paymentStatus, order.paymentMethod, lang, order.status)}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <ul className="flex gap-2" aria-hidden="true">
          {preview.map((item, i) => (
            <li key={i} className="relative h-20 w-16 overflow-hidden bg-surface">
              {item.image ? <Image src={item.image} alt="" fill sizes="64px" className="object-cover" /> : null}
            </li>
          ))}
          {order.items.length > preview.length ? (
            <li className="flex h-20 w-16 items-center justify-center bg-surface text-[0.8125rem] text-text-muted">
              +{order.items.length - preview.length}
            </li>
          ) : null}
        </ul>
        <div className="flex flex-col items-end gap-2">
          <span className="t-price text-base">{formatMoney(order.total, lang)}</span>
          <Link
            href={`/orders/${order.id}`}
            className="text-sm text-text-primary underline underline-offset-4 decoration-border-hover hover:decoration-text-primary"
          >
            {t.viewOrder}
            <span className="sr-only"> {order.orderNumber}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
