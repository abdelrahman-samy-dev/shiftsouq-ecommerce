"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Couldn't Load Products"
      message="We ran into an issue loading the shop. This is usually temporary — please try again in a moment."
      digest={error.digest}
      onReset={reset}
      retryLabel="Reload Products"
      secondaryHref="/"
      secondaryLabel="Back to Home"
      secondaryIcon="home"
    />
  );
}
