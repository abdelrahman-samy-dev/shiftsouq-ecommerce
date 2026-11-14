"use client";

/* Root error boundary: any page error without a closer error.tsx lands here (header and footer stay). */

import { useEffect } from "react";
import ErrorState from "@/components/shared/ErrorState";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState digest={error.digest} onReset={reset} />;
}
