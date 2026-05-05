"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Checkout Error"
      message="Something went wrong during checkout. Your cart items are safe — please try again."
      digest={error.digest}
      onReset={reset}
      retryLabel="Try Again"
      secondaryHref="/cart"
      secondaryLabel="Back to Cart"
      secondaryIcon="back"
    />
  );
}
