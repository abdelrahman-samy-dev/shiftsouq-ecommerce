"use client";

/* ══════════════════════════════════════════════════════════════
   ListingProvider — shared state for one product listing
   ──────────────────────────────────────────────────────────────
   Reads the listing state from the URL (the single source of
   truth) and navigates inside a transition, so the toolbar,
   filters and grid can show one pending state while the server
   renders the new results.
   ══════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/types";
import { listingHref, parseListingParams, type ListingState } from "@/lib/search/listing-params";

interface ListingContextValue {
  locale: Locale;
  basePath: string;
  /** "shop", "search", "category:<slug>" or "collection:<slug>" (API scope). */
  scope: string;
  state: ListingState;
  pending: boolean;
  /** Go to another state of this listing (client navigation, scroll kept). */
  go: (next: ListingState) => void;
  hrefFor: (next: ListingState) => string;
}

const ListingContext = createContext<ListingContextValue | null>(null);

export function ListingProvider({
  locale,
  basePath,
  scope,
  children,
}: {
  locale: Locale;
  basePath: string;
  scope: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const query = searchParams.toString();
  const state = useMemo(() => parseListingParams(new URLSearchParams(query)), [query]);
  const hrefFor = useCallback((next: ListingState) => listingHref(basePath, next), [basePath]);

  const go = useCallback(
    (next: ListingState) => {
      const href = listingHref(basePath, next);
      startTransition(() => router.push(href, { scroll: false }));
      // When the results top is above the viewport, bring it back into view.
      const top = document.getElementById("listing-results");
      if (top && top.getBoundingClientRect().top < 0) {
        top.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    },
    [basePath, router],
  );

  const value = useMemo(
    () => ({ locale, basePath, scope, state, pending, go, hrefFor }),
    [locale, basePath, scope, state, pending, go, hrefFor],
  );
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListing(): ListingContextValue {
  const ctx = useContext(ListingContext);
  if (!ctx) throw new Error("useListing must be used inside <ListingProvider>");
  return ctx;
}
