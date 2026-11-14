"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutPageContent — Multi-Step Checkout Orchestrator
   ──────────────────────────────────────────────────────────────
   Client-side orchestrator for the 3-step checkout flow:
   1. Contact → 2. Shipping → 3. Payment
   
   Handles form state management, step transitions with Framer
   Motion, and the "Place Order" submission routing:
   - COD → process locally, clear cart, redirect to success
   - Card/Wallet → call Paymob server action, redirect to pay
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useCartStore, selectCartSubtotal } from "@/lib/store/useCartStore";
import { shippingFee } from "@/lib/checkout/shipping";
import {
  useCheckoutStore,
  type CheckoutStep,
  type ContactInfo,
  type ShippingAddress,
  type PaymentMethod,
} from "@/lib/store/useCheckoutStore";

import { startPayment } from "@/lib/actions/paymob";
import { createOrder } from "@/lib/actions/checkout";

import { CheckoutSteps } from "./CheckoutSteps";
import { ContactStep } from "./ContactStep";
import { ShippingStep } from "./ShippingStep";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { CheckoutSidebar } from "./CheckoutSidebar";
import { PaymentIframe } from "./PaymentIframe";
import { MockPaymentPanel } from "./MockPaymentPanel";
import { cn } from "@/lib/utils";

/* ── Step Transition Variants ────────────────────────────────── */

const stepTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

/* ── Component ───────────────────────────────────────────────── */

interface CheckoutPageContentProps {
  locale: string;
}

export function CheckoutPageContent({ locale }: CheckoutPageContentProps) {
  const isAr = locale === "ar";
  const router = useRouter();
  const iframeSectionRef = useRef<HTMLDivElement>(null);

  /* ── Cart State ────────────────────────────────────────────── */
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore(selectCartSubtotal);

  /* ── Checkout State ────────────────────────────────────────── */
  const step = useCheckoutStore((s) => s.step);
  const contact = useCheckoutStore((s) => s.contact);
  const shipping = useCheckoutStore((s) => s.shipping);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const shippingCost = useCheckoutStore((s) => s.shippingCost);
  const isProcessing = useCheckoutStore((s) => s.isProcessing);
  const setStep = useCheckoutStore((s) => s.setStep);
  const setContact = useCheckoutStore((s) => s.setContact);
  const setShipping = useCheckoutStore((s) => s.setShipping);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);
  const setShippingCost = useCheckoutStore((s) => s.setShippingCost);
  const setIsProcessing = useCheckoutStore((s) => s.setIsProcessing);
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout);

  /* ── Hydration Guard ───────────────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Payment Error Detection (from Paymob redirect) ────────── */
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("payment_error") === "true") {
      toast.error(
        isAr
          ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى."
          : "Payment failed. Please try again or choose a different payment method."
      );
      // Clean the URL without triggering a navigation
      window.history.replaceState({}, "", "/checkout");
    }
  }, [searchParams, isAr]);

  /* ── Paymob Embedded iFrame State ──────────────────────────── */
  const [showIframe, setShowIframe] = useState(false);
  const [iframePaymentToken, setIframePaymentToken] = useState("");
  const [iframeId, setIframeId] = useState("");
  /** Unpaid online order from this visit: retrying payment reuses it instead of reserving stock twice. */
  const pendingOrderRef = useRef<{ key: string; orderId: string; accessToken: string; orderNumber: string } | null>(null);

  /* ── Step direction for animation ──────────────────────────── */
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  /* ── Step Handlers ─────────────────────────────────────────── */

  const handleContactSubmit = useCallback(
    (data: ContactInfo) => {
      setContact(data);
      setDirection(1);
      setStep(2);
    },
    [setContact, setStep]
  );

  const handleShippingSubmit = useCallback(
    (data: ShippingAddress) => {
      setShipping(data);
      setShippingCost(shippingFee(data.governorate, subtotal));
      setDirection(1);
      setStep(3);
    },
    [setShipping, setShippingCost, setStep, subtotal]
  );

  const handleGoBack = useCallback(
    (targetStep: CheckoutStep) => {
      setDirection(-1);
      setStep(targetStep);
    },
    [setStep]
  );

  /* ── Place Order Logic ─────────────────────────────────────── */

  const handlePlaceOrder = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const orderKey = JSON.stringify([contact, shipping, paymentMethod, items.map((i) => [i.productId, i.variantId, i.quantity])]);
      const reuse = paymentMethod !== "cod" && pendingOrderRef.current?.key === orderKey ? pendingOrderRef.current : null;

      /* ── 1. Create the order: the server prices it and reserves stock ── */
      const orderResult = reuse
        ? { success: true as const, ...reuse }
        : await createOrder({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        governorate: shipping.governorate,
        city: shipping.city,
        address: shipping.address,
        apartment: shipping.apartment,
        postalCode: shipping.postalCode,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });

      if (!orderResult.success || !orderResult.orderId || !orderResult.accessToken) {
        const msg =
          orderResult.code === "out_of_stock"
            ? isAr
              ? "بعض المنتجات لم تعد متوفرة بالكمية المطلوبة. عدّل السلة وحاول مرة أخرى."
              : "Some items are no longer available in the quantity you chose. Please update your cart."
            : orderResult.code === "product_unavailable"
              ? isAr
                ? "أحد المنتجات في سلتك لم يعد متاحاً."
                : "A product in your cart is no longer available."
              : orderResult.code === "choose_variant"
                ? isAr
                  ? "يرجى اختيار المقاس أو اللون لكل منتج."
                  : "Please choose a size or colour for every product."
                : isAr
                  ? "تعذر إتمام الطلب. يرجى المحاولة مرة أخرى."
                  : orderResult.error || "We couldn't place your order. Please try again.";
        toast.error(msg);
        setIsProcessing(false);
        return;
      }

      const { orderId, accessToken, orderNumber } = orderResult;
      if (paymentMethod !== "cod") {
        pendingOrderRef.current = { key: orderKey, orderId, accessToken, orderNumber: orderNumber ?? "" };
      }

      if (paymentMethod === "cod") {
        clearCart();
        resetCheckout();
        router.push(`/checkout/success?order=${encodeURIComponent(orderNumber ?? "")}`);
        return;
      }

      if (paymentMethod === "wallet") {
        /* ── 2a. Wallet: redirect to the wallet provider ─────── */
        const res = await fetch("/api/checkout/paymob/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, accessToken, walletPhone: contact.phone }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.redirectUrl) {
          throw new Error(data.error || "Wallet payment initiation failed");
        }
        clearCart();
        resetCheckout();
        window.location.href = data.redirectUrl;
        return;
      }

      /* ── 2b. Card: embedded Paymob iframe ──────────────────── */
      const result = await startPayment({ orderId, accessToken, method: "card" });
      if (!result.success) throw new Error(result.error);
      if (result.method !== "card") throw new Error("Unexpected payment response.");

      setIframePaymentToken(result.paymentToken);
      setIframeId(result.iframeId);
      setShowIframe(true);
      setIsProcessing(false);
      requestAnimationFrame(() => {
        iframeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.error("[Checkout] Order processing error:", error);
      toast.error(
        error instanceof Error && error.message && !isAr
          ? error.message
          : isAr
            ? "حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى."
            : "An error occurred while processing your order. Please try again."
      );
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    paymentMethod,
    contact,
    shipping,
    items,
    clearCart,
    resetCheckout,
    router,
    isAr,
    setIsProcessing,
  ]);

  /* ── iFrame Handlers ───────────────────────────────────────── */

  const handleIframeClose = useCallback(() => {
    setShowIframe(false);
    setIframePaymentToken("");
    setIframeId("");
  }, []);

  const handleTransactionComplete = useCallback(
    (success: boolean) => {
      setShowIframe(false);
      setIframePaymentToken("");
      setIframeId("");

      if (success) {
        clearCart();
        resetCheckout();
        const orderNumber = pendingOrderRef.current?.orderNumber;
        pendingOrderRef.current = null;
        router.push(orderNumber ? `/checkout/success?order=${encodeURIComponent(orderNumber)}` : "/checkout/success");
      } else {
        toast.error(
          isAr
            ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى."
            : "Payment failed. Please try again or choose a different payment method."
        );
      }
    },
    [clearCart, resetCheckout, router, isAr]
  );

  /* ── Loading / Empty Guards ────────────────────────────────── */

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* Step indicator skeleton */}
            <div className="flex justify-between mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="skeleton-block w-10 h-10 rounded-full" />
                  <div className="skeleton-block w-16 h-3 rounded-lg" />
                </div>
              ))}
            </div>
            {/* Form skeleton */}
            <div className="card-elevated p-6 space-y-4">
              <div className="skeleton-block h-6 w-48 rounded-lg" />
              <div className="skeleton-block h-4 w-72 rounded-lg" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="skeleton-block h-12 rounded-xl" />
                <div className="skeleton-block h-12 rounded-xl" />
              </div>
              <div className="skeleton-block h-12 rounded-xl" />
              <div className="skeleton-block h-12 rounded-xl" />
            </div>
          </div>
          <div className="skeleton-block h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto px-4 py-20 text-center"
      >
        <div
          className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <ShieldCheck size={40} strokeWidth={1.2} className="text-[var(--text-faint)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {isAr ? "لا توجد منتجات للدفع" : "No items to checkout"}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-8 max-w-sm mx-auto">
          {isAr
            ? "سلة التسوق فارغة. أضف بعض المنتجات قبل المتابعة."
            : "Your cart is empty. Add some products before proceeding."}
        </p>
        <Link
          href="/shop"
          className="btn-primary h-12 px-8 text-base font-bold gap-2 inline-flex"
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
          {isAr ? "تصفح المنتجات" : "Browse Products"}
        </Link>
      </motion.div>
    );
  }

  /* ── Main Checkout Layout ──────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/cart"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {isAr ? "السلة" : "Cart"}
        </Link>
        <span className="text-[var(--text-faint)]">/</span>
        <span className="text-[var(--text-primary)] font-semibold">
          {isAr ? "الدفع" : "Checkout"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 items-start">
        {/* Left: Checkout Steps + Form */}
        <div>
          {/* Step Progress */}
          <CheckoutSteps
            currentStep={step}
            onStepClick={(s) => handleGoBack(s)}
            locale={locale}
          />

          {/* Step Content with Animation */}
          <div className="card-elevated p-5 sm:p-7 !overflow-visible">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div
                  key="contact"
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 24 : -24,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -24 : 24,
                  }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ContactStep
                    defaultValues={contact}
                    onSubmit={handleContactSubmit}
                    locale={locale}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="shipping"
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 24 : -24,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -24 : 24,
                  }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ShippingStep
                    defaultValues={shipping}
                    onSubmit={handleShippingSubmit}
                    onBack={() => handleGoBack(1)}
                    locale={locale}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="payment"
                  custom={direction}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 24 : -24,
                  }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -24 : 24,
                  }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <PaymentMethodSelector
                    selectedMethod={paymentMethod}
                    onSelect={(m) => {
                      setPaymentMethod(m);
                      // Close iFrame if user switches payment method
                      if (showIframe) handleIframeClose();
                    }}
                    onBack={() => {
                      if (showIframe) handleIframeClose();
                      handleGoBack(2);
                    }}
                    onPlaceOrder={handlePlaceOrder}
                    isProcessing={isProcessing}
                    cartTotal={subtotal + shippingCost}
                    locale={locale}
                    iframeActive={showIframe}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Embedded Payment iFrame Modal ────────────────── */}
          <AnimatePresence>
            {showIframe && iframeId === "MOCK" && (
              <MockPaymentPanel
                onClose={handleIframeClose}
                onTransactionComplete={handleTransactionComplete}
                locale={locale}
              />
            )}
            {showIframe && iframeId !== "MOCK" && (
              <PaymentIframe
                paymentToken={iframePaymentToken}
                iframeId={iframeId}
                onClose={handleIframeClose}
                onTransactionComplete={handleTransactionComplete}
                locale={locale}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Right: Order Summary Sidebar */}
        <CheckoutSidebar locale={locale} />
      </div>
    </div>
  );
}
