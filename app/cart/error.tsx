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
      title="Cart Error"
      message="We couldn't load your cart. Please try again or continue browsing."
      digest={error.digest}
      onReset={reset}
      retryLabel="Reload Cart"
      secondaryHref="/shop"
      secondaryLabel="Continue Shopping"
      secondaryIcon="shop"
    />
  );
}
