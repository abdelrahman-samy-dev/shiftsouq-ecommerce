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
      title="Wishlist Error"
      message="We couldn't load your wishlist. Please try again or browse our collection."
      digest={error.digest}
      onReset={reset}
      retryLabel="Reload Wishlist"
      secondaryHref="/shop"
      secondaryLabel="Browse Shop"
      secondaryIcon="shop"
    />
  );
}
