"use client";

/* ══════════════════════════════════════════════════════════════
   Global Error — Root Error Boundary
   ──────────────────────────────────────────────────────────────
   Catches unhandled errors across the entire application.
   This is the last line of defence — displayed when no
   route-specific error.tsx catches the error first.
   ══════════════════════════════════════════════════════════════ */

import ErrorState from "@/components/shared/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something Went Wrong"
      message="An unexpected error occurred. Our team has been notified. Please try again or return to the homepage."
      digest={error.digest}
      onReset={reset}
      retryLabel="Try Again"
      secondaryHref="/"
      secondaryLabel="Go Home"
      secondaryIcon="home"
    />
  );
}
