"use client";

/* ══════════════════════════════════════════════════════════════
   OrderSummary — Cart Page Order Summary Panel
   ──────────────────────────────────────────────────────────────
   Displays subtotal, shipping info, total, and a conversion-
   optimized "Proceed to Checkout" CTA. Supports dark mode and
   RTL layout via design system tokens.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, CreditCard, ArrowRight } from "lucide-react";
import { useCartStore, selectCartSubtotal, selectCartTotalItems } from "@/lib/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

interface OrderSummaryProps {
  locale: string;
}

/**
 * OrderSummary — The right-column checkout summary panel.
 *
 * Shows subtotal, shipping status, total, and a massive CTA.
 * Trust signals (secure checkout, free shipping, returns)
 * are shown beneath the CTA to boost conversion.
 */
export function OrderSummary({ locale }: OrderSummaryProps) {
  const isAr = locale === "ar";
  const subAmount = useCartStore(selectCartSubtotal);
  const itemCount = useCartStore(selectCartTotalItems);
  const items = useCartStore((s) => s.items);

  const isFreeShipping = subAmount >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = isFreeShipping ? 0 : 50; // Base default before governorate selection
  const total = subAmount + shippingCost;

  const progressPercent = Math.min((subAmount / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - subAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card-elevated p-6 lg:p-7 lg:sticky lg:top-24"
    >
      {/* Title */}
      <h2 className="text-lg font-bold text-text-primary mb-5">
        {isAr ? "ملخص الطلب" : "Order Summary"}
      </h2>

      {/* Line items */}
      <div className="space-y-3.5 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {isAr ? "المجموع الفرعي" : "Subtotal"}{" "}
            <span className="text-text-faint">
              ({itemCount} {isAr ? "عناصر" : itemCount === 1 ? "item" : "items"})
            </span>
          </span>
          <span className="font-semibold text-text-primary">
            {formatPrice(subAmount, locale as Locale)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {isAr ? "الشحن" : "Shipping"}
          </span>
          <span className="font-semibold text-text-primary">
            {isFreeShipping ? (
              <span className="text-success">
                {isAr ? "مجاني" : "Free"}
              </span>
            ) : (
              formatPrice(shippingCost, locale as Locale)
            )}
          </span>
        </div>

        {/* Free shipping progress bar */}
        {!isFreeShipping && items.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span>
                {isAr
                  ? `أضف ${formatPrice(amountToFreeShipping, locale as Locale)} للشحن المجاني`
                  : `Add ${formatPrice(amountToFreeShipping, locale as Locale)} for free shipping`}
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--surface-inset)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="divider mb-5" />

      {/* Total */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-base font-bold text-text-primary">
          {isAr ? "الإجمالي" : "Total"}
        </span>
        <span className="text-xl font-bold text-text-primary">
          {formatPrice(total, locale as Locale)}
        </span>
      </div>

      {/* CTA */}
      <Link
        href="/checkout"
        className="btn-primary w-full h-14 text-base font-bold gap-2 justify-center"
      >
        <CreditCard size={20} strokeWidth={2} />
        {isAr ? "المتابعة إلى الدفع" : "Proceed to Checkout"}
        <ArrowRight size={18} className="rtl:rotate-180" />
      </Link>

      {/* Trust Signals */}
      <div className="mt-5 space-y-2.5">
        {[
          {
            icon: ShieldCheck,
            text: isAr ? "دفع آمن ومشفر" : "Secure encrypted checkout",
          },
          {
            icon: Truck,
            text: isAr
              ? "شحن مجاني فوق 500 ج.م"
              : "Free shipping over EGP 500",
          },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2.5 text-xs text-text-muted"
          >
            <Icon size={14} strokeWidth={1.5} className="text-success flex-shrink-0" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
