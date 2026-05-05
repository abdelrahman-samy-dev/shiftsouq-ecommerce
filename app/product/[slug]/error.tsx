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
      title="Product Unavailable"
      message="We couldn't load the product details right now. Please try again or browse our other products."
      digest={error.digest}
      onReset={reset}
      retryLabel="Try Again"
      secondaryHref="/shop"
      secondaryLabel="Browse Shop"
      secondaryIcon="shop"
    />
  );
}
