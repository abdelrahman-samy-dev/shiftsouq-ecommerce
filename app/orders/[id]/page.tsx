/* ══════════════════════════════════════════════════════════════
   Order Detail Page — /orders/[id]
   ──────────────────────────────────────────────────────────────
   Shows full details for a single order including:
   - Status timeline / stepper
   - Ordered items with images
   - Shipping information
   - Order cost breakdown

   Protected by proxy — only authenticated users can access.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RotateCcw,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  CreditCard,
} from "lucide-react";
import type { Locale, OrderStatus } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getOrderById } from "@/lib/dal/orders";

/* ── SEO ──────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Order Details",
  description: "View your order details, status, and shipping information.",
};

/* ── Status timeline steps ────────────────────────────────────── */

const TIMELINE_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const STATUS_ICONS: Record<OrderStatus, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: AlertCircle,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  refunded: RotateCcw,
};

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

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(amount: number | string): string {
  return `${Number(amount).toFixed(2)} EGP`;
}

/* ── Page Component ───────────────────────────────────────────── */

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);
  const od = dict.orders || ({} as Record<string, any>);

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const isCancelled = order.status === "cancelled" || order.status === "refunded";
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);

  return (
    <div className="min-h-[70vh] mx-auto max-w-5xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
      {/* ── Back Link ──────────────────────────────────────── */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} />
        {od.backToOrders || "Back to Orders"}
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {od.orderDetails || "Order Details"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {od.orderNumber || "Order #"}{order.order_number} • {formatDate(order.created_at, locale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Items + Timeline ─────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Status Timeline */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              {od.orderTimeline || "Order Timeline"}
            </h2>

            {isCancelled ? (
              <CancelledStatus status={order.status} dict={dict} />
            ) : (
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div
                  className="absolute top-5 h-[2px] z-0"
                  style={{
                    left: "2rem",
                    right: "2rem",
                    background: "var(--border)",
                  }}
                />
                <div
                  className="absolute top-5 h-[2px] z-[1] transition-all duration-500"
                  style={{
                    left: "2rem",
                    width: currentStepIndex >= 0
                      ? `${(currentStepIndex / (TIMELINE_STEPS.length - 1)) * (100 - 15)}%`
                      : "0%",
                    background: "var(--success)",
                  }}
                />

                {TIMELINE_STEPS.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = STATUS_ICONS[step];

                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-2 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isCurrent
                            ? "border-green-500 bg-green-500 text-white shadow-md shadow-green-500/25"
                            : isActive
                            ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                            : "border-border bg-surface text-text-faint"
                        }`}
                      >
                        <Icon size={18} strokeWidth={isCurrent ? 2.5 : 1.8} />
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-semibold text-center ${
                          isActive ? "text-text-primary" : "text-text-faint"
                        }`}
                      >
                        {getStatusLabel(step, dict)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
              {od.items || "Items"} ({order.order_items?.length ?? 0})
            </h2>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {(order.order_items ?? []).map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Image */}
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} style={{ color: "var(--text-faint)" }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {item.product_name}
                    </p>
                    {item.variant_label && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.variant_label}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {od.quantity || "Qty"}: {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>

                  {/* Line Total */}
                  <div className="flex items-center">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatPrice(Number(item.unit_price) * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Summary + Shipping ──────────────── */}
        <div className="flex flex-col gap-6">
          {/* Order Summary */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
              {od.orderSummary || "Order Summary"}
            </h2>
            <div className="flex flex-col gap-3">
              <SummaryRow label={od.subtotal || "Subtotal"} value={formatPrice(Number(order.subtotal))} />
              <SummaryRow label={od.shipping || "Shipping"} value={formatPrice(Number(order.shipping_cost))} />
              <SummaryRow label={od.tax || "Tax"} value={formatPrice(Number(order.tax_amount))} />
              {Number(order.discount_amount) > 0 && (
                <SummaryRow
                  label={od.discount || "Discount"}
                  value={`-${formatPrice(Number(order.discount_amount))}`}
                  isDiscount
                />
              )}
              <div className="divider my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {od.total || "Total"}
                </span>
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {formatPrice(Number(order.total))}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipping_name && (
            <div className="card-elevated p-6">
              <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
                {od.shippingInfo || "Shipping Information"}
              </h2>
              <div className="flex flex-col gap-3.5">
                <InfoRow icon={MapPin} value={`${order.shipping_name}${order.shipping_address ? `\n${order.shipping_address}` : ""}${order.shipping_city ? `, ${order.shipping_city}` : ""}${order.shipping_country ? `, ${order.shipping_country}` : ""}`} />
                {order.shipping_phone && (
                  <InfoRow icon={Phone} value={order.shipping_phone} dir="ltr" />
                )}
                {order.shipping_email && (
                  <InfoRow icon={Mail} value={order.shipping_email} dir="ltr" />
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="card-elevated p-6">
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                Notes
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────── */

function SummaryRow({
  label,
  value,
  isDiscount = false,
}: {
  label: string;
  value: string;
  isDiscount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: isDiscount ? "var(--success)" : "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  value,
  dir,
}: {
  icon: typeof MapPin;
  value: string;
  dir?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} />
      <span
        className="text-sm leading-relaxed whitespace-pre-line"
        style={{ color: "var(--text-secondary)" }}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

function CancelledStatus({
  status,
  dict,
}: {
  status: OrderStatus;
  dict: Record<string, any>;
}) {
  const Icon = STATUS_ICONS[status];
  const isRefund = status === "refunded";

  return (
    <div className="flex items-center gap-4 py-4">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isRefund
            ? "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400"
            : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {getStatusLabel(status, dict)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {isRefund
            ? "Your refund has been processed"
            : "This order has been cancelled"}
        </p>
      </div>
    </div>
  );
}
