/* ══════════════════════════════════════════════════════════════
   Orders History Page — /orders
   ──────────────────────────────────────────────────────────────
   The signed-in buyer's own orders: number, date, status, payment
   method + status, items (with size / colour) and total.
   Unpaid card / wallet orders point to "Complete payment".

   Protected by proxy — only authenticated users can access; the
   data layer also scopes every query to the buyer's profile.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Package,
  ChevronRight,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RotateCcw,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getMyOrders } from "@/lib/dal/orders";
import Pagination from "@/components/shared/Pagination";
import { formatMoney } from "@/components/checkout/checkout-rules";
import type { OrderStatusValue } from "@/components/orders/order-rules";
import {
  formatOrderDate,
  formatTime,
  methodLabel,
  paymentStatusLabel,
  statusLabel,
  type Lang,
} from "@/components/orders/order-copy";

/* ── SEO ──────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "My Orders",
  description:
    "View and track your order history at ShiftSouq. Check order status, details, and delivery updates.",
};

/* ── Status Configuration ─────────────────────────────────────── */

const STATUS_CONFIG: Record<
  OrderStatusValue,
  {
    icon: typeof Package;
    colorClass: string;
    bgClass: string;
  }
> = {
  pending: {
    icon: Clock,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20",
  },
  confirmed: {
    icon: CheckCircle,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
  },
  processing: {
    icon: AlertCircle,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20",
  },
  shipped: {
    icon: Truck,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
  },
  delivered: {
    icon: CheckCircle,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
  },
  cancelled: {
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
  },
  refunded: {
    icon: RotateCcw,
    colorClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20",
  },
};

/* ── Page Component ───────────────────────────────────────────── */

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const od = (await getDictionary(lang)).orders;

  const pageParam = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = 10;

  const { orders, count } = await getMyOrders(page, pageSize);
  const totalPages = Math.ceil(count / pageSize);

  /* Flatten searchParams for Pagination component */
  const flatParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string") flatParams[key] = value;
  }

  return (
    <div className="min-h-[70vh] mx-auto max-w-5xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--surface-elevated)" }}
          >
            <Package size={20} style={{ color: "var(--text-primary)" }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {od.title}
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {od.subtitle}
          {count > 0 && (
            <span className="ms-2 font-medium" style={{ color: "var(--text-secondary)" }}>
              ({count})
            </span>
          )}
        </p>
      </div>

      {/* ── Orders List ─────────────────────────────────────── */}
      {orders.length === 0 ? (
        <EmptyOrders title={od.noOrders} description={od.noOrdersDesc} cta={od.startShopping} />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const preview = order.items.slice(0, 2);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="card-elevated group flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 transition-all duration-300 hover:border-border-hover hover:shadow-lg"
              >
                {/* Left: Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }} dir="ltr">
                      {order.orderNumber}
                    </span>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bgClass}`}
                    >
                      <StatusIcon size={13} className={cfg.colorClass} />
                      <span className={cfg.colorClass}>{statusLabel(order.status, lang)}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{formatOrderDate(order.createdAt, lang)}</span>
                    <span aria-hidden="true">•</span>
                    <span>
                      {order.itemCount} {isAr ? (order.itemCount === 1 ? "منتج" : "منتجات") : order.itemCount === 1 ? "item" : "items"}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1">
                      <CreditCard size={12} />
                      {methodLabel(order.paymentMethod, lang)} — {paymentStatusLabel(order.paymentStatus, order.paymentMethod, lang, order.status)}
                    </span>
                  </div>

                  {preview.length > 0 && (
                    <p className="mt-2 text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {preview
                        .map((i) => `${i.quantity} × ${i.name}${i.label ? ` (${i.label})` : ""}`)
                        .join(isAr ? "، " : ", ")}
                      {order.items.length > preview.length && (isAr ? ` و${order.items.length - preview.length} أخرى` : ` +${order.items.length - preview.length} more`)}
                    </p>
                  )}

                  {order.canPay && order.payBy && (
                    <p className="mt-2 text-xs font-semibold text-[var(--warning)]">
                      {isAr
                        ? `بانتظار الدفع — أكمل الدفع قبل ${formatTime(order.payBy, lang)}`
                        : `Awaiting payment — complete it before ${formatTime(order.payBy, lang)}`}
                    </p>
                  )}
                </div>

                {/* Right: Total + Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {formatMoney(order.total, lang)}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-text-faint group-hover:text-text-primary transition-all group-hover:translate-x-0.5 rtl:rotate-180"
                    style={{ color: "var(--text-faint)" }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      <Pagination currentPage={page} totalPages={totalPages} searchParams={flatParams} basePath="/orders" />
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────── */

function EmptyOrders({ title, description, cta }: { title: string; description: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--surface-elevated)" }}
      >
        <ShoppingBag size={36} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <p className="text-sm max-w-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      <Link href="/shop" className="btn-primary px-8 py-3 text-[15px]">
        <ShoppingBag size={17} />
        {cta}
      </Link>
    </div>
  );
}
