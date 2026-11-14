"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutSuccessContent — Order Confirmation Screen
   ──────────────────────────────────────────────────────────────
   A premium, animated success page with confetti-style particles,
   order number, and CTA to continue shopping.
   ══════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Clock,
  AlertCircle,
  Truck,
} from "lucide-react";
import type { Receipt } from "@/lib/dal/receipt";
import { formatPrice } from "@/lib/utils";

interface CheckoutSuccessContentProps {
  locale: string;
  /** The real order, or null when this browser can't see it (e.g. opened on another device). */
  receipt: Receipt | null;
}

export function CheckoutSuccessContent({ locale, receipt }: CheckoutSuccessContentProps) {
  const isAr = locale === "ar";
  const router = useRouter();
  const loc = isAr ? "ar" : "en";
  const online = receipt?.paymentMethod === "card" || receipt?.paymentMethod === "wallet";
  const confirming = online && receipt?.paymentStatus === "unpaid";
  const failed = online && receipt?.paymentStatus === "failed";

  // The webhook usually confirms within seconds: refresh a few times while we wait.
  useEffect(() => {
    if (!confirming) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 10) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [confirming, router]);

  const heading = failed
    ? isAr ? "لم تكتمل عملية الدفع" : "Payment not completed"
    : confirming
      ? isAr ? "جارٍ تأكيد الدفع…" : "Confirming your payment…"
      : isAr ? "تم استلام طلبك!" : "Order placed!";
  const body = failed
    ? isAr
      ? "لم نتمكن من تأكيد الدفع. يمكنك المحاولة مرة أخرى أو اختيار الدفع عند الاستلام."
      : "We couldn't confirm the payment. You can try again or choose cash on delivery."
    : confirming
      ? isAr
        ? "نتحقق من الدفع مع البنك، قد يستغرق ذلك بضع ثوانٍ."
        : "We're checking the payment with your bank. This usually takes a few seconds."
      : receipt?.paymentMethod === "cod"
        ? isAr
          ? "شكراً لتسوقك من شيفت سوق. ستدفع عند الاستلام، وسنتواصل معك لتأكيد الشحن."
          : "Thank you for shopping at ShiftSouq. You'll pay on delivery — we'll contact you to confirm shipping."
        : isAr
          ? "شكراً لتسوقك من شيفت سوق. سنبدأ تجهيز طلبك."
          : "Thank you for shopping at ShiftSouq. We're preparing your order.";
  const StatusIcon = failed ? AlertCircle : confirming ? Clock : CheckCircle2;
  const tone = failed ? "var(--error, #dc2626)" : confirming ? "var(--accent)" : "var(--success)";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
          className="relative mx-auto mb-6"
        >
          {/* Pulsing rings */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ delay: 0.5, duration: 1.5, repeat: 2 }}
            className="absolute inset-0 w-24 h-24 mx-auto rounded-full"
            style={{ background: tone, opacity: 0.15 }}
          />
          <div
            className="relative w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
            style={{
              background: failed || confirming ? "var(--surface)" : "var(--success-bg)",
              border: `2px solid ${tone}`,
            }}
          >
            <StatusIcon size={48} strokeWidth={1.5} style={{ color: tone }} />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2"
        >
          {heading}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto"
        >
          {body}
        </motion.p>

        {/* Order Number Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="card-elevated p-5 mb-6"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Package size={18} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {isAr ? "رقم الطلب" : "Order Number"}
            </span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)] font-mono tracking-wider" dir="ltr">
            {receipt?.orderNumber ?? (isAr ? "راجع صفحة طلباتي" : "See My Orders")}
          </p>
          {receipt && (
            <div className="mt-4 text-start space-y-2">
              {receipt.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--text-secondary)] truncate">
                    {it.quantity} × {it.name}
                    {it.label ? <span className="text-[var(--text-muted)]"> · {it.label}</span> : null}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] whitespace-nowrap">{formatPrice(it.unitPrice * it.quantity, loc)}</span>
                </div>
              ))}
              {receipt.discount > 0 && (
                <div className="flex justify-between text-sm text-[var(--success)]">
                  <span>{isAr ? "الخصم" : "Discount"}</span>
                  <span>-{formatPrice(receipt.discount, loc)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>{isAr ? "الشحن" : "Shipping"}</span>
                <span>{receipt.shipping > 0 ? formatPrice(receipt.shipping, loc) : isAr ? "مجاني" : "Free"}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border)] font-bold text-[var(--text-primary)]">
                <span>{isAr ? "الإجمالي" : "Total"}</span>
                <span>{formatPrice(receipt.total, loc)}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="space-y-3 mb-8"
        >
          <div
            className="flex items-center gap-3 p-3.5 rounded-xl text-start"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Truck size={18} className="text-[var(--accent)] flex-shrink-0" />
            <p className="text-xs text-[var(--text-secondary)]">
              {isAr ? (
                <>تابع حالة طلبك وتحديثات الشحن من صفحة <Link href="/orders" className="underline">طلباتي</Link>.</>
              ) : (
                <>Track your order and shipping updates in <Link href="/orders" className="underline">My Orders</Link>.</>
              )}
            </p>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link
            href="/shop"
            className="btn-primary flex-1 h-12 text-sm font-bold gap-2 justify-center"
          >
            <ShoppingBag size={18} />
            {isAr ? "متابعة التسوق" : "Continue Shopping"}
          </Link>
          <Link
            href="/"
            className="btn-secondary flex-1 h-12 text-sm font-bold gap-2 justify-center"
          >
            {isAr ? "الصفحة الرئيسية" : "Back to Home"}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
