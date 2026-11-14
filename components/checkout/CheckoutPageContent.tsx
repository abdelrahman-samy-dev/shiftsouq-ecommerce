"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutPageContent — Multi-Step Checkout Orchestrator
   ──────────────────────────────────────────────────────────────
   Client-side orchestrator for the 3-step checkout flow:
   1. Contact → 2. Shipping → 3. Payment

   • Totals shown are the server's quote (quoteCheckout): server
     prices, promo discount, shipping by governorate. Nothing the
     browser computes is ever sent as a price.
   • "Place Order": COD → receipt. Card → Paymob iframe (or the
     local test panel). Wallet → wallet provider redirect.
   • An unpaid card / wallet order of this visit is remembered
     (session storage, no secrets): retrying the payment — also
     after coming back from a failed redirect — reuses it instead
     of reserving stock twice. The cart is emptied only once the
     payment is confirmed.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowLeft, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useCartStore, selectCartSubtotal } from "@/lib/store/useCartStore";
import {
  useCheckoutStore,
  type CheckoutStep,
  type ContactInfo,
  type ShippingAddress,
  type PendingOrder,
} from "@/lib/store/useCheckoutStore";

import { startPayment } from "@/lib/actions/paymob";
import { createOrder, previewPromoCode, quoteCheckout, type CheckoutQuote, type CreateOrderResult } from "@/lib/actions/checkout";
import { cancelOrder } from "@/app/orders/actions";

import { CheckoutSteps } from "./CheckoutSteps";
import { ContactStep } from "./ContactStep";
import { ShippingStep } from "./ShippingStep";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { CheckoutSidebar } from "./CheckoutSidebar";
import { PaymentIframe } from "./PaymentIframe";
import { MockPaymentPanel } from "./MockPaymentPanel";
import { checkoutTotals, normalizeEgyptianMobile, promoErrorMessage, type Lang } from "./checkout-rules";

/* ── Types ───────────────────────────────────────────────────── */

export interface CheckoutPrefillProps {
  contact: ContactInfo;
  shipping: Omit<ShippingAddress, "saveAddress"> | null;
}

interface CheckoutPageContentProps {
  locale: string;
  /** Signed-in buyer's details / saved address, used when the form is still empty. */
  prefill?: CheckoutPrefillProps | null;
  /** Online methods the server can take right now. */
  availability: { card: boolean; wallet: boolean };
}

type StartResult = "started" | "stale" | "failed";

/* ── Helpers ─────────────────────────────────────────────────── */

const subscribeNoop = () => () => {};
const isBlank = (o: object) => Object.values(o).every((v) => v === "" || v === false || v == null);

function orderErrorMessage(r: CreateOrderResult, lang: Lang): string {
  const ar = lang === "ar";
  switch (r.code) {
    case "out_of_stock":
      return ar
        ? "بعض المنتجات لم تعد متوفرة بالكمية المطلوبة. عدّل السلة وحاول مرة أخرى."
        : "Some items are no longer available in the quantity you chose. Please update your cart.";
    case "product_unavailable":
      return ar ? "أحد المنتجات في سلتك لم يعد متاحًا." : "A product in your cart is no longer available.";
    case "choose_variant":
      return ar ? "يرجى اختيار المقاس أو اللون لكل منتج." : "Please choose a size or colour for every product.";
    case "invalid_promo":
      return ar ? "رمز الخصم لم يعد صالحًا لهذا الطلب، وقد أزلناه." : "The promo code is no longer valid for this order, so we removed it.";
    case "invalid_phone":
      return ar ? "يرجى إدخال رقم محمول مصري صحيح (01XXXXXXXXX)." : "Please enter a valid Egyptian mobile number (01XXXXXXXXX).";
    case "payment_unavailable":
      return ar
        ? "طريقة الدفع هذه غير متاحة مؤقتًا. يرجى اختيار الدفع عند الاستلام."
        : "This payment method is temporarily unavailable. Please choose cash on delivery.";
    case "cod_limit":
      return ar
        ? "الدفع عند الاستلام غير متاح لهذا المبلغ. يرجى اختيار الدفع الإلكتروني."
        : "Cash on delivery isn't available for this amount. Please choose an online payment.";
    default:
      return ar ? "تعذر إتمام الطلب. يرجى المحاولة مرة أخرى." : "We couldn't place your order. Please try again.";
  }
}

/* ── Component ───────────────────────────────────────────────── */

export function CheckoutPageContent({ locale, prefill = null, availability }: CheckoutPageContentProps) {
  const isAr = locale === "ar";
  const lang: Lang = isAr ? "ar" : "en";
  const router = useRouter();

  /* ── Cart State ────────────────────────────────────────────── */
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartSubtotal = useCartStore(selectCartSubtotal);

  /* ── Checkout State ────────────────────────────────────────── */
  const step = useCheckoutStore((s) => s.step);
  const contact = useCheckoutStore((s) => s.contact);
  const shipping = useCheckoutStore((s) => s.shipping);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const promoCode = useCheckoutStore((s) => s.promoCode);
  const isProcessing = useCheckoutStore((s) => s.isProcessing);
  const setStep = useCheckoutStore((s) => s.setStep);
  const setContact = useCheckoutStore((s) => s.setContact);
  const setShipping = useCheckoutStore((s) => s.setShipping);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);
  const setPromoCode = useCheckoutStore((s) => s.setPromoCode);
  const setPendingOrder = useCheckoutStore((s) => s.setPendingOrder);
  const setIsProcessing = useCheckoutStore((s) => s.setIsProcessing);
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout);

  /* Empty form + signed-in buyer: start from their profile / saved address. */
  const formContact = isBlank(contact) && prefill ? prefill.contact : contact;
  const formShipping = useMemo(
    () => (isBlank(shipping) && prefill?.shipping ? { ...prefill.shipping, saveAddress: false } : shipping),
    [shipping, prefill]
  );

  /* ── Hydration Guard (cart + checkout state live in browser storage) ── */
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  /* ── Coming back from a failed payment redirect ────────────── */
  const searchParams = useSearchParams();
  const [paymentFailed, setPaymentFailed] = useState(() => searchParams.get("payment_error") === "true");
  useEffect(() => {
    if (searchParams.get("payment_error") === "true") {
      // Clean the URL; the banner stays until dismissed or the next attempt.
      window.history.replaceState(null, "", "/checkout");
    }
  }, [searchParams]);

  /* ── Server quote: what the order will cost ────────────────── */
  const quoteGovernorate = formShipping.governorate || undefined;
  const quoteKey = JSON.stringify({
    items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    governorate: quoteGovernorate,
    promoCode: promoCode ?? undefined,
  });
  const [quoteState, setQuoteState] = useState<{ key: string; quote: CheckoutQuote } | null>(null);
  const [promoNotice, setPromoNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      quoteCheckout(JSON.parse(quoteKey))
        .then((quote) => {
          if (cancelled) return;
          setQuoteState({ key: quoteKey, quote });
          // The code stopped applying (cart changed, used up, expired…): drop it and say why.
          if (quote.ok && quote.promo && !quote.promo.ok) {
            setPromoNotice(promoErrorMessage(quote.promo.reason, lang, quote.promo.minOrder));
            useCheckoutStore.getState().setPromoCode(null);
          }
        })
        .catch(() => {
          /* keep showing the estimate */
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quoteKey, mounted, items.length, lang]);

  const freshQuote = quoteState?.key === quoteKey && quoteState.quote.ok ? quoteState.quote : null;
  const lastDiscount = promoCode && quoteState?.quote.promo?.ok && quoteState.quote.promo.code === promoCode ? quoteState.quote.discount : 0;
  const totals = freshQuote ?? checkoutTotals(cartSubtotal, lastDiscount, quoteGovernorate);
  const quoteUpdating = !freshQuote;

  /* ── Paymob Embedded iFrame State ──────────────────────────── */
  const [showIframe, setShowIframe] = useState(false);
  const [iframePaymentToken, setIframePaymentToken] = useState("");
  const [iframeId, setIframeId] = useState("");
  /** Access token of the order created in this page view (the receipt cookie covers reloads). */
  const accessTokenRef = useRef<{ orderId: string; token: string } | null>(null);

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
      setDirection(1);
      setStep(3);
    },
    [setShipping, setStep]
  );

  const handleGovernorateChange = useCallback(
    (governorate: string) => setShipping({ ...formShipping, governorate }),
    [formShipping, setShipping]
  );

  const handleGoBack = useCallback(
    (targetStep: CheckoutStep) => {
      setDirection(-1);
      setStep(targetStep);
    },
    [setStep]
  );

  /* ── Promo code ────────────────────────────────────────────── */

  const handleApplyPromo = useCallback(
    async (code: string): Promise<string | null> => {
      setPromoNotice(null);
      const res = await previewPromoCode(
        code,
        items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      );
      if (!res.ok) return promoErrorMessage(res.reason, lang, res.minOrder);
      setPromoCode(code.trim());
      toast.success(isAr ? "تم تطبيق رمز الخصم." : "Promo code applied.");
      return null;
    },
    [items, lang, isAr, setPromoCode]
  );

  const handleRemovePromo = useCallback(() => {
    setPromoNotice(null);
    setPromoCode(null);
  }, [setPromoCode]);

  /* ── Online payment (card iframe / wallet redirect) ────────── */

  const startOnlinePayment = useCallback(
    async (order: PendingOrder): Promise<StartResult> => {
      const token = accessTokenRef.current?.orderId === order.orderId ? accessTokenRef.current.token : undefined;

      if (order.method === "wallet") {
        const res = await fetch("/api/checkout/paymob/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            accessToken: token,
            walletPhone: normalizeEgyptianMobile(contact.phone) ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 || res.status === 409) return "stale";
        if (!res.ok || !data.success || !data.redirectUrl) {
          toast.error(
            res.status === 503
              ? orderErrorMessage({ success: false, code: "payment_unavailable" }, lang)
              : isAr
                ? "تعذر بدء الدفع بالمحفظة. يرجى المحاولة مرة أخرى."
                : "We couldn't start the wallet payment. Please try again."
          );
          return "failed";
        }
        // The cart stays until the payment is confirmed (receipt page), so a failed
        // wallet payment brings the buyer back to a full cart.
        window.location.href = data.redirectUrl;
        return "started";
      }

      const result = await startPayment({ orderId: order.orderId, accessToken: token, method: "card" });
      if (!result.success) {
        if (result.code === "not_found" || result.code === "not_payable") return "stale";
        toast.error(
          result.code === "unavailable"
            ? orderErrorMessage({ success: false, code: "payment_unavailable" }, lang)
            : isAr
              ? "بوابة الدفع لا تستجيب حاليًا. يرجى المحاولة مرة أخرى."
              : "The payment gateway is not responding. Please try again."
        );
        return "failed";
      }
      if (result.method !== "card") return "failed";
      setIframePaymentToken(result.paymentToken);
      setIframeId(result.iframeId);
      setShowIframe(true);
      return "started";
    },
    [contact.phone, isAr, lang]
  );

  /* ── Place Order Logic ─────────────────────────────────────── */

  const handlePlaceOrder = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentFailed(false);

    try {
      const lines = items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }));
      const orderKey = JSON.stringify([contact, { ...shipping, saveAddress: undefined }, paymentMethod, promoCode, lines]);

      /* ── Retry: same details, same method → pay for the same order ── */
      const previous = useCheckoutStore.getState().pendingOrder;
      if (previous) {
        if (paymentMethod !== "cod" && previous.key === orderKey && previous.method === paymentMethod) {
          const started = await startOnlinePayment(previous);
          if (started !== "stale") {
            // A wallet redirect keeps the button busy while the browser leaves the page.
            if (started === "failed" || previous.method === "card") setIsProcessing(false);
            return;
          }
          // The old order can no longer be paid (expired / cancelled): place a new one.
        } else {
          // Details / method / cart changed: give the old unpaid order's stock back first.
          await cancelOrder(previous.orderId).catch(() => null);
        }
        setPendingOrder(null);
      }

      /* ── 1. Create the order: the server prices it and reserves stock ── */
      const orderResult = await createOrder({
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
        promoCode: promoCode ?? undefined,
        saveAddress: shipping.saveAddress,
        items: lines,
      });

      if (!orderResult.success || !orderResult.orderId || !orderResult.accessToken) {
        if (orderResult.code === "invalid_promo") setPromoCode(null);
        if (orderResult.code === "invalid_phone") handleGoBack(1);
        toast.error(orderErrorMessage(orderResult, lang));
        setIsProcessing(false);
        return;
      }

      const { orderId, accessToken, orderNumber = "" } = orderResult;

      if (paymentMethod === "cod") {
        clearCart();
        resetCheckout();
        router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
        return;
      }

      /* ── 2. Online payment ─────────────────────────────────── */
      accessTokenRef.current = { orderId, token: accessToken };
      const pending: PendingOrder = { key: orderKey, orderId, orderNumber, method: paymentMethod };
      setPendingOrder(pending);
      const started = await startOnlinePayment(pending);
      if (started === "stale") {
        toast.error(isAr ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى." : "We couldn't start the payment. Please try again.");
        setPendingOrder(null);
      }
      if (started !== "started" || paymentMethod === "card") setIsProcessing(false);
    } catch (error) {
      console.error("[Checkout] Order processing error:", error);
      toast.error(
        isAr
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
    promoCode,
    items,
    clearCart,
    resetCheckout,
    router,
    isAr,
    lang,
    setIsProcessing,
    setPendingOrder,
    setPromoCode,
    startOnlinePayment,
    handleGoBack,
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
        const orderNumber = useCheckoutStore.getState().pendingOrder?.orderNumber;
        clearCart();
        resetCheckout();
        router.push(orderNumber ? `/checkout/success?order=${encodeURIComponent(orderNumber)}` : "/checkout/success");
      } else {
        setPaymentFailed(true);
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

      {/* Payment did not go through (failed card / wallet redirect) */}
      {paymentFailed && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)" }}
        >
          <AlertTriangle size={18} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-[var(--text-primary)]">
              {isAr ? "لم تكتمل عملية الدفع" : "Your payment was not completed"}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isAr
                ? "سلتك وبياناتك ما زالت محفوظة. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى."
                : "Your cart and details are still here. You can try again or choose another payment method."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPaymentFailed(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label={isAr ? "إغلاق" : "Dismiss"}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ContactStep
                    defaultValues={formContact}
                    onSubmit={handleContactSubmit}
                    locale={locale}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="shipping"
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ShippingStep
                    defaultValues={formShipping}
                    onSubmit={handleShippingSubmit}
                    onBack={() => handleGoBack(1)}
                    onGovernorateChange={handleGovernorateChange}
                    subtotalAfterDiscount={totals.afterDiscount}
                    locale={locale}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="payment"
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
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
                    cartTotal={totals.total}
                    locale={locale}
                    iframeActive={showIframe}
                    availability={availability}
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
        <CheckoutSidebar
          locale={locale}
          totals={totals}
          unitPrices={freshQuote?.unitPrices ?? quoteState?.quote.unitPrices}
          updating={quoteUpdating}
          promoCode={promoCode}
          promoNotice={promoNotice}
          onApplyPromo={handleApplyPromo}
          onRemovePromo={handleRemovePromo}
          locked={isProcessing || showIframe}
        />
      </div>
    </div>
  );
}
