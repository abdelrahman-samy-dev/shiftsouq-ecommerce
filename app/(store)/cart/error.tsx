"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title={{ en: "Cart Error", ar: "تعذّر عرض السلة" }}
      message={{
        en: "We couldn't load your cart. Please try again or continue browsing.",
        ar: "لم نتمكن من تحميل سلتك. يرجى المحاولة مرة أخرى أو متابعة التصفح.",
      }}
      digest={error.digest}
      onReset={reset}
      retryLabel={{ en: "Reload Cart", ar: "إعادة تحميل السلة" }}
      secondaryHref="/shop"
      secondaryLabel={{ en: "Continue Shopping", ar: "متابعة التسوق" }}
      secondaryIcon="shop"
    />
  );
}
