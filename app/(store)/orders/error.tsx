"use client";

import ErrorState from "@/components/shared/ErrorState";
import { useCookieLocale } from "@/components/checkout/useCookieLocale";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAr = useCookieLocale() === "ar";
  return (
    <ErrorState
      title={isAr ? "تعذر عرض الطلبات" : "Orders Unavailable"}
      message={
        isAr
          ? "لم نتمكن من تحميل طلباتك الآن. قد تكون مشكلة مؤقتة — يرجى المحاولة مرة أخرى."
          : "We couldn't load your orders right now. This may be a temporary issue — please try again."
      }
      digest={error.digest}
      onReset={reset}
      retryLabel={isAr ? "إعادة تحميل الطلبات" : "Reload Orders"}
      secondaryHref="/shop"
      secondaryLabel={isAr ? "متابعة التسوق" : "Continue Shopping"}
      secondaryIcon="shop"
    />
  );
}
