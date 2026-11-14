"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title={{ en: "This product couldn’t load", ar: "تعذّر تحميل هذا المنتج" }}
      message={{
        en: "We couldn’t load the product details right now. Please try again, or keep browsing the shop.",
        ar: "تعذّر تحميل تفاصيل المنتج الآن. يرجى المحاولة مرة أخرى أو متابعة التسوّق.",
      }}
      digest={error.digest}
      onReset={reset}
      retryLabel={{ en: "Try again", ar: "إعادة المحاولة" }}
      secondaryHref="/shop"
      secondaryLabel={{ en: "Browse the shop", ar: "تصفّح المتجر" }}
      secondaryIcon="shop"
    />
  );
}
