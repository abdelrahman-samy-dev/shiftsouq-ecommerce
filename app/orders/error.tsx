"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Orders Unavailable"
      message="We couldn't load your orders right now. This may be a temporary issue — please try again."
      digest={error.digest}
      onReset={reset}
      retryLabel="Reload Orders"
      secondaryHref="/shop"
      secondaryLabel="Continue Shopping"
      secondaryIcon="shop"
    />
  );
}
