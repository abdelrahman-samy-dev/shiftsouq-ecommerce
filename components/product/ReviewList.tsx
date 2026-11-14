"use client";

/* ══════════════════════════════════════════════════════════════
   ReviewList — approved reviews with "Show more"
   ──────────────────────────────────────────────────────────────
   The first page arrives as server-rendered children (no
   hydration cost); further pages are fetched with a server
   action and rendered here.
   ══════════════════════════════════════════════════════════════ */

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ds";
import type { Locale } from "@/lib/types";
import type { PublicReview } from "@/lib/dal/product-page";
import { loadMoreReviews } from "@/lib/actions/reviews";
import { reviewsCopy } from "./pdp-copy";
import ReviewItem from "./ReviewItem";

interface ReviewListProps {
  productId: string;
  /** Ids of the reviews already rendered as children. */
  initialIds: string[];
  total: number;
  locale: Locale;
  children: ReactNode;
}

export default function ReviewList({ productId, initialIds, total, locale, children }: ReviewListProps) {
  const copy = reviewsCopy(locale);
  const [more, setMore] = useState<PublicReview[]>([]);
  const [count, setCount] = useState(total);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const shown = initialIds.length + more.length;

  const loadMore = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        const next = await loadMoreReviews(productId, shown);
        setMore((prev) => {
          const seen = new Set([...initialIds, ...prev.map((r) => r.id)]);
          return [...prev, ...next.reviews.filter((r) => !seen.has(r.id))];
        });
        setCount(next.total);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col border-t border-border">
        {children}
        {more.map((r) => (
          <ReviewItem key={r.id} review={r} locale={locale} />
        ))}
      </ul>
      {shown < count ? (
        <div className="pt-8">
          <Button variant="secondary" onClick={loadMore} loading={pending}>
            {copy.showMore}
          </Button>
          {failed ? (
            <p role="alert" className="mt-3 text-[0.8125rem] text-destructive">
              {copy.loadFailed}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
