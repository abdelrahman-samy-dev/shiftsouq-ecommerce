"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function WishlistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title={{ en: "Wishlist Error", ar: "تعذّر عرض المفضلة" }}
      message={{
        en: "We couldn't load your wishlist. Please try again or browse our collection.",
        ar: "لم نتمكن من تحميل قائمة المفضلة. يرجى المحاولة مرة أخرى أو تصفح تشكيلتنا.",
      }}
      digest={error.digest}
      onReset={reset}
      retryLabel={{ en: "Reload Wishlist", ar: "إعادة تحميل المفضلة" }}
      secondaryHref="/shop"
      secondaryLabel={{ en: "Browse Shop", ar: "تصفح المتجر" }}
      secondaryIcon="shop"
    />
  );
}
