"use client";

import ErrorState from "@/components/shared/ErrorState";
import { useCookieLocale } from "@/components/checkout/useCookieLocale";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAr = useCookieLocale() === "ar";
  return (
    <ErrorState
      title={isAr ? "خطأ في صفحة الدفع" : "Checkout Error"}
      message={
        isAr
          ? "حدث خطأ أثناء إتمام الطلب. منتجات سلتك محفوظة — يرجى المحاولة مرة أخرى."
          : "Something went wrong during checkout. Your cart items are safe — please try again."
      }
      digest={error.digest}
      onReset={reset}
      retryLabel={isAr ? "حاول مرة أخرى" : "Try Again"}
      secondaryHref="/cart"
      secondaryLabel={isAr ? "العودة إلى السلة" : "Back to Cart"}
      secondaryIcon="back"
    />
  );
}
