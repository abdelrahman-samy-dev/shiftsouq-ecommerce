/* ══════════════════════════════════════════════════════════════
   Orders History Page — /orders
   ──────────────────────────────────────────────────────────────
   Displays a list of the user's past orders with status badges,
   date, total, and a link to view details.

   Protected by proxy — only authenticated users can access.
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
} from "lucide-react";
import type { Locale, OrderStatus } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getUserOrders } from "@/lib/dal/orders";
import Pagination from "@/components/shared/Pagination";

/* ── SEO ──────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "My Orders",
  description:
    "View and track your order history at ShiftSouq. Check order status, details, and delivery updates.",
};

/* ── Status Configuration ─────────────────────────────────────── */

const STATUS_CONFIG: Record<
  OrderStatus,
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

/* ── Helper: Status label from dict ───────────────────────────── */

function getStatusLabel(status: OrderStatus, dict: Record<string, any>): string {
  const od = dict.orders || {};
  const map: Record<OrderStatus, string> = {
    pending: od.statusPending || "Pending",
    confirmed: od.statusConfirmed || "Confirmed",
    processing: od.statusProcessing || "Processing",
    shipped: od.statusShipped || "Shipped",
    delivered: od.statusDelivered || "Delivered",
    cancelled: od.statusCancelled || "Cancelled",
    refunded: od.statusRefunded || "Refunded",
  };
  return map[status];
}

/* ── Helper: Format date ──────────────────────────────────────── */

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ── Helper: Format currency ──────────────────────────────────── */

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} EGP`;
}

/* ── Page Component ───────────────────────────────────────────── */

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);
  const od = dict.orders || ({} as Record<string, any>);

  const pageParam =
    typeof resolvedParams.page === "string"
      ? parseInt(resolvedParams.page, 10)
      : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = 10;

  const { orders, count } = await getUserOrders({ page, pageSize });
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
            {od.title || "My Orders"}
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {od.subtitle || "Track and manage your orders"}
          {count > 0 && (
            <span className="ms-2 font-medium" style={{ color: "var(--text-secondary)" }}>
              ({count})
            </span>
          )}
        </p>
      </div>

      {/* ── Orders List ─────────────────────────────────────── */}
      {orders.length === 0 ? (
        <EmptyOrders dict={dict} />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const StatusIcon = cfg.icon;
            const itemCount = order.order_items?.length ?? 0;

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="card-elevated group flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 transition-all duration-300 hover:border-border-hover hover:shadow-lg"
              >
                {/* Left: Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {od.orderNumber || "Order #"}{order.order_number}
                    </span>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bgClass}`}
                    >
                      <StatusIcon size={13} className={cfg.colorClass} />
                      <span className={cfg.colorClass}>
                        {getStatusLabel(order.status, dict)}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{formatDate(order.created_at, locale)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      {itemCount} {od.items || "items"}
                    </span>
                  </div>
                </div>

                {/* Right: Total + Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {formatPrice(Number(order.total))}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-text-faint group-hover:text-text-primary transition-all group-hover:translate-x-0.5"
                    style={{ color: "var(--text-faint)" }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        searchParams={flatParams}
        basePath="/orders"
      />
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────── */

function EmptyOrders({ dict }: { dict: Record<string, any> }) {
  const od = dict.orders || {};
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--surface-elevated)" }}
      >
        <ShoppingBag size={36} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {od.noOrders || "You haven't placed any orders yet"}
      </h2>
      <p className="text-sm max-w-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {od.noOrdersDesc ||
          "When you place an order, it will appear here. Start shopping to find something you love!"}
      </p>
      <Link href="/shop" className="btn-primary px-8 py-3 text-[15px]">
        <ShoppingBag size={17} />
        {od.startShopping || "Start Shopping"}
      </Link>
    </div>
  );
}
