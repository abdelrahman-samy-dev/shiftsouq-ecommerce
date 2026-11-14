/* ══════════════════════════════════════════════════════════════
   Order Detail Page — /orders/[id]
   ──────────────────────────────────────────────────────────────
   One of the buyer's own orders:
   - Status timeline
   - Items with size / colour
   - Payment method and status, with "Complete payment" (unpaid
     card / wallet order inside its 60-minute window) and
     "Cancel order" (pending, unpaid)
   - Subtotal, discount, shipping, total and delivery details

   Protected by proxy — only authenticated users can access; the
   data layer returns the order only to its owner.
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
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getMyOrder, getPaymentAvailability } from "@/lib/dal/orders";
import { formatMoney } from "@/components/checkout/checkout-rules";
import { OrderActions } from "@/components/orders/OrderActions";
import { isOnlineMethod, type OrderStatusValue } from "@/components/orders/order-rules";
import {
  formatOrderDate,
  formatTime,
  governorateLabel,
  methodLabel,
  paymentStatusLabel,
  statusLabel,
  type Lang,
} from "@/components/orders/order-copy";

/* ── SEO ──────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Order Details",
  description: "View your order details, status, and shipping information.",
  robots: { index: false, follow: false },
};

/* ── Status timeline steps ────────────────────────────────────── */

const TIMELINE_STEPS: OrderStatusValue[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_ICONS: Record<OrderStatusValue, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: AlertCircle,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  refunded: RotateCcw,
};

/* ── Page Component ───────────────────────────────────────────── */

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const od = (await getDictionary(lang)).orders;

  const order = await getMyOrder(id);
  if (!order) notFound();

  const isCancelled = order.status === "cancelled" || order.status === "refunded";
  const currentStepIndex = TIMELINE_STEPS.indexOf(order.status);
  const availability = getPaymentAvailability();
  const paymentAvailable = isOnlineMethod(order.paymentMethod) ? availability[order.paymentMethod] : false;
  const governorate = governorateLabel(order.delivery.governorate, lang);

  return (
    <div className="min-h-[70vh] mx-auto max-w-5xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
      {/* ── Back Link ──────────────────────────────────────── */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {od.backToOrders}
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {od.orderDetails}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            <span dir="ltr">{order.orderNumber}</span> • {formatOrderDate(order.createdAt, lang, true)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Items + Timeline ─────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Status Timeline */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-6" style={{ color: "var(--text-primary)" }}>
              {od.orderTimeline}
            </h2>

            {isCancelled ? (
              <CancelledStatus status={order.status} lang={lang} />
            ) : (
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div
                  className="absolute top-5 h-[2px] z-0 start-8 end-8"
                  style={{ background: "var(--border)" }}
                />
                <div
                  className="absolute top-5 h-[2px] z-[1] transition-all duration-500 start-8"
                  style={{
                    width:
                      currentStepIndex >= 0
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
                        {statusLabel(step, lang)}
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
              {od.items} ({order.itemCount})
            </h2>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Image */}
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} style={{ color: "var(--text-faint)" }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {item.name}
                    </p>
                    {item.label && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.label}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {od.quantity}: {item.quantity} × {formatMoney(item.unitPrice, lang)}
                    </p>
                  </div>

                  {/* Line Total */}
                  <div className="flex items-center">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatMoney(item.unitPrice * item.quantity, lang)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Payment + Summary + Shipping ────── */}
        <div className="flex flex-col gap-6">
          {/* Payment */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              {od.paymentInfo}
            </h2>
            <div className="flex flex-col gap-3 mb-4">
              <SummaryRow label={isAr ? "طريقة الدفع" : "Method"} value={methodLabel(order.paymentMethod, lang)} />
              <SummaryRow
                label={isAr ? "حالة الدفع" : "Payment status"}
                value={paymentStatusLabel(order.paymentStatus, order.paymentMethod, lang, order.status)}
              />
            </div>
            {order.canPay && order.payBy && (
              <p className="text-xs mb-4 text-[var(--warning)]">
                {isAr
                  ? `أكمل الدفع قبل ${formatTime(order.payBy, lang)}، وإلا يُلغى الطلب تلقائيًا وتعود المنتجات إلى المخزون.`
                  : `Complete the payment before ${formatTime(order.payBy, lang)}; otherwise the order is cancelled automatically and the items are released.`}
              </p>
            )}
            {order.expired && (
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                {isAr
                  ? "انتهت مهلة الدفع لهذا الطلب (60 دقيقة)، وسيُلغى تلقائيًا."
                  : "The 60-minute payment window for this order has passed; it will be cancelled automatically."}
              </p>
            )}
            <OrderActions
              orderId={order.id}
              orderNumber={order.orderNumber}
              paymentMethod={order.paymentMethod}
              canPay={order.canPay}
              canCancel={order.canCancel}
              paymentAvailable={paymentAvailable}
              locale={lang}
            />
            {!order.canPay && !order.canCancel && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <CreditCard size={14} />
                {isAr ? "لا توجد إجراءات مطلوبة منك." : "Nothing needed from you."}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
              {od.orderSummary}
            </h2>
            <div className="flex flex-col gap-3">
              <SummaryRow label={od.subtotal} value={formatMoney(order.subtotal, lang)} />
              {order.discount > 0 && (
                <SummaryRow label={od.discount} value={`−${formatMoney(order.discount, lang)}`} isDiscount />
              )}
              <SummaryRow
                label={od.shipping}
                value={order.shippingCost > 0 ? formatMoney(order.shippingCost, lang) : isAr ? "مجانًا" : "Free"}
              />
              <div className="divider my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {od.total}
                </span>
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {formatMoney(order.total, lang)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          {order.delivery.name && (
            <div className="card-elevated p-6">
              <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
                {od.shippingInfo}
              </h2>
              <div className="flex flex-col gap-3.5">
                <InfoRow
                  icon={MapPin}
                  value={[
                    order.delivery.name,
                    order.delivery.address,
                    [order.delivery.city, governorate].filter(Boolean).join(isAr ? "، " : ", "),
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
                {order.delivery.phone && <InfoRow icon={Phone} value={order.delivery.phone} dir="ltr" />}
                {order.delivery.email && <InfoRow icon={Mail} value={order.delivery.email} dir="ltr" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────── */

function SummaryRow({ label, value, isDiscount = false }: { label: string; value: string; isDiscount?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm font-medium text-end"
        style={{ color: isDiscount ? "var(--success)" : "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoRow({ icon: Icon, value, dir }: { icon: typeof MapPin; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} />
      <span className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }} dir={dir}>
        {value}
      </span>
    </div>
  );
}

function CancelledStatus({ status, lang }: { status: OrderStatusValue; lang: Lang }) {
  const Icon = STATUS_ICONS[status];
  const isRefund = status === "refunded";
  const isAr = lang === "ar";

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
          {statusLabel(status, lang)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {isRefund
            ? isAr
              ? "تمت معالجة استرداد المبلغ"
              : "Your refund has been processed"
            : isAr
              ? "تم إلغاء هذا الطلب"
              : "This order has been cancelled"}
        </p>
      </div>
    </div>
  );
}
