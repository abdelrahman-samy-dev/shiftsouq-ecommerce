"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Category Not Available"
      message="We couldn't load this category right now. Please try again or explore our full collection."
      digest={error.digest}
      onReset={reset}
      retryLabel="Try Again"
      secondaryHref="/shop"
      secondaryLabel="All Products"
      secondaryIcon="shop"
    />
  );
}
