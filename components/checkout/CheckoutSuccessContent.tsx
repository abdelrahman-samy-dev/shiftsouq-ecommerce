"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutSuccessContent — Order Confirmation Screen
   ──────────────────────────────────────────────────────────────
   A premium, animated success page with confetti-style particles,
   order number, and CTA to continue shopping.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Mail,
} from "lucide-react";

interface CheckoutSuccessContentProps {
  locale: string;
}

export function CheckoutSuccessContent({ locale }: CheckoutSuccessContentProps) {
  const isAr = locale === "ar";
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    // Generate a mock order number
    const num = `SS-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    setOrderNumber(num);
  }, []);

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
            style={{ background: "var(--success)", opacity: 0.15 }}
          />
          <div
            className="relative w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
            style={{
              background: "var(--success-bg)",
              border: "2px solid var(--success)",
            }}
          >
            <CheckCircle2
              size={48}
              strokeWidth={1.5}
              className="text-[var(--success)]"
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2"
        >
          {isAr ? "تم تأكيد طلبك!" : "Order Confirmed!"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto"
        >
          {isAr
            ? "شكراً لتسوقك من شيفت سوق. سنرسل لك تأكيداً بالبريد الإلكتروني قريباً."
            : "Thank you for shopping at ShiftSouq. We'll send you a confirmation email shortly."}
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
          <p className="text-xl font-bold text-[var(--text-primary)] font-mono tracking-wider">
            {orderNumber}
          </p>
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
            <Mail size={18} className="text-[var(--accent)] flex-shrink-0" />
            <p className="text-xs text-[var(--text-secondary)]">
              {isAr
                ? "ستصلك رسالة تأكيد بالبريد الإلكتروني مع تفاصيل الطلب وتتبع الشحنة."
                : "You'll receive a confirmation email with order details and shipment tracking."}
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
