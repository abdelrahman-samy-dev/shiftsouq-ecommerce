"use client";

/* ══════════════════════════════════════════════════════════════
   PaymentMethodSelector — Step 3: Payment Method Selection
   ──────────────────────────────────────────────────────────────
   Presents 3 payment options:
   - Cash on Delivery (disabled if total > 10,000 EGP)
   - Mobile Wallet (Vodafone Cash, etc.)
   - Credit / Debit Card

   COD safety guard includes an informative tooltip explaining
   why the option is disabled for high-value orders.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Smartphone,
  CreditCard,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { PaymentMethod } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

/* ── Constants ───────────────────────────────────────────────── */

const COD_MAX_AMOUNT = 10000;

/* ── Animation ───────────────────────────────────────────────── */

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

/* ── Component ───────────────────────────────────────────────── */

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  onBack: () => void;
  onPlaceOrder: () => void;
  isProcessing: boolean;
  cartTotal: number;
  locale: string;
  /** Whether the payment iFrame is currently displayed */
  iframeActive?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  onBack,
  onPlaceOrder,
  isProcessing,
  cartTotal,
  locale,
  iframeActive = false,
}: PaymentMethodSelectorProps) {
  const isAr = locale === "ar";
  const isCodDisabled = cartTotal > COD_MAX_AMOUNT;
  const [showCodTooltip, setShowCodTooltip] = useState(false);

  const methods: {
    id: PaymentMethod;
    icon: typeof Banknote;
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
    disabled: boolean;
  }[] = [
    {
      id: "cod",
      icon: Banknote,
      titleEn: "Cash on Delivery",
      titleAr: "الدفع عند الاستلام",
      descEn: "Pay when your order arrives",
      descAr: "ادفع عند وصول طلبك",
      disabled: isCodDisabled,
    },
    {
      id: "wallet",
      icon: Smartphone,
      titleEn: "Mobile Wallet",
      titleAr: "محفظة إلكترونية",
      descEn: "Vodafone Cash, Fawry, WE Pay",
      descAr: "فودافون كاش، فوري، وي باي",
      disabled: false,
    },
    {
      id: "card",
      icon: CreditCard,
      titleEn: "Credit / Debit Card",
      titleAr: "بطاقة ائتمان / خصم",
      descEn: "Visa, Mastercard, Meeza",
      descAr: "فيزا، ماستركارد، ميزة",
      disabled: false,
    },
  ];

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-5">
      {/* Section Header */}
      <motion.div custom={0} variants={cardVariant}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          {isAr ? "طريقة الدفع" : "Payment Method"}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {isAr
            ? "اختر طريقة الدفع المفضلة لديك"
            : "Choose your preferred payment method"}
        </p>
      </motion.div>

      {/* Payment Method Cards */}
      <div className="space-y-3">
        {methods.map((method, index) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <motion.div
              key={method.id}
              custom={index + 1}
              variants={cardVariant}
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  if (!method.disabled) {
                    onSelect(method.id);
                  } else if (method.id === "cod") {
                    setShowCodTooltip(true);
                    setTimeout(() => setShowCodTooltip(false), 4000);
                  }
                }}
                disabled={method.disabled && method.id !== "cod"}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 text-start",
                  isSelected &&
                    !method.disabled &&
                    "border-[var(--primary)] bg-[var(--surface)]",
                  !isSelected &&
                    !method.disabled &&
                    "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)] hover:bg-[var(--surface)]",
                  method.disabled &&
                    "border-[var(--border)] bg-[var(--surface-inset)] opacity-50 cursor-not-allowed"
                )}
                aria-label={isAr ? method.titleAr : method.titleEn}
              >
                {/* Radio indicator */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    isSelected && !method.disabled
                      ? "border-[var(--primary)]"
                      : "border-[var(--text-faint)]"
                  )}
                >
                  {isSelected && !method.disabled && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]"
                    />
                  )}
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                    isSelected && !method.disabled
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                  )}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isSelected && !method.disabled
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    )}
                  >
                    {isAr ? method.titleAr : method.titleEn}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {isAr ? method.descAr : method.descEn}
                  </p>
                </div>

                {/* COD disabled badge */}
                {method.disabled && method.id === "cod" && (
                  <div className="flex-shrink-0">
                    <AlertTriangle
                      size={18}
                      className="text-[var(--warning)]"
                      strokeWidth={2}
                    />
                  </div>
                )}
              </button>

              {/* COD Tooltip */}
              <AnimatePresence>
                {method.id === "cod" && isCodDisabled && showCodTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-2 inset-x-0 z-20 p-3 rounded-xl flex items-start gap-2.5"
                    style={{
                      background: "var(--warning-bg)",
                      border: "1px solid var(--warning)",
                    }}
                  >
                    <Info
                      size={16}
                      className="text-[var(--warning)] flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                      {isAr
                        ? `للطلبات التي تتجاوز ${formatPrice(COD_MAX_AMOUNT, locale as Locale)}، يرجى استخدام الدفع الإلكتروني.`
                        : `For orders exceeding ${formatPrice(COD_MAX_AMOUNT, locale as Locale)}, please use online payment.`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Security Badge */}
      <motion.div
        custom={4}
        variants={cardVariant}
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
        style={{
          background: "var(--success-bg)",
          border: "1px solid var(--success)",
          borderColor: "rgba(34, 197, 94, 0.2)",
        }}
      >
        <ShieldCheck size={18} className="text-[var(--success)] flex-shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          {isAr
            ? "جميع المعاملات مشفرة وآمنة بالكامل. بياناتك محمية."
            : "All transactions are fully encrypted and secure. Your data is protected."}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div custom={5} variants={cardVariant} className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="btn-secondary flex-shrink-0 gap-2"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {isAr ? "رجوع" : "Back"}
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={isProcessing || iframeActive}
          className="btn-primary flex-1 h-12 text-sm font-bold gap-2 relative overflow-hidden"
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full"
              />
              {isAr ? "جارٍ المعالجة..." : "Processing..."}
            </>
          ) : iframeActive ? (
            <>
              <Lock size={16} strokeWidth={2} />
              {isAr ? "أكمل الدفع أدناه" : "Complete Payment Below"}
            </>
          ) : (
            <>
              <Lock size={16} strokeWidth={2} />
              {isAr ? "تأكيد الطلب" : "Place Order"}
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
