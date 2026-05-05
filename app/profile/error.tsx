"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Profile Error"
      message="We couldn't load your profile. Please try again."
      digest={error.digest}
      onReset={reset}
      retryLabel="Reload Profile"
      secondaryHref="/"
      secondaryLabel="Go Home"
      secondaryIcon="home"
    />
  );
}
