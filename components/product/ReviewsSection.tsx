/* ══════════════════════════════════════════════════════════════
   ReviewsSection — server component, streamed below the fold
   ──────────────────────────────────────────────────────────────
   Summary (average, count, 5 → 1 distribution), the first page
   of approved reviews and what this visitor may do (sign in /
   write / edit). The heading lives in the page so the #reviews
   anchor works before this streams in.
   ══════════════════════════════════════════════════════════════ */

import { Rating } from "@/components/ds";
import type { Locale } from "@/lib/types";
import {
  REVIEWS_PAGE_SIZE,
  getApprovedReviews,
  getReviewSummary,
  getReviewerState,
} from "@/lib/dal/product-page";
import { reviewsCopy } from "./pdp-copy";
import ReviewList from "./ReviewList";
import ReviewItem from "./ReviewItem";
import ReviewComposer from "./ReviewComposer";

interface ReviewsSectionProps {
  productId: string;
  slug: string;
  locale: Locale;
}

export default async function ReviewsSection({ productId, slug, locale }: ReviewsSectionProps) {
  const copy = reviewsCopy(locale);
  const [summary, first, viewer] = await Promise.all([
    getReviewSummary(productId),
    getApprovedReviews(productId, 0, REVIEWS_PAGE_SIZE),
    getReviewerState(productId),
  ]);
  const composer = (
    <ReviewComposer
      productId={productId}
      viewer={viewer}
      signInHref={`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`}
      locale={locale}
    />
  );

  if (summary.count === 0) {
    return (
      <div className="flex flex-col items-start gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <p className="t-h3">{copy.none}</p>
          <p className="text-text-secondary">{copy.noneBody}</p>
        </div>
        {composer}
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-20">
      <div className="flex flex-col gap-8">
        <div className="flex items-end gap-4">
          <p className="font-[family-name:var(--font-display)] text-[3.5rem] leading-none tabular-nums text-text-primary">
            {summary.average.toFixed(1)}
          </p>
          <div className="flex flex-col gap-1 pb-1.5">
            <Rating value={summary.average} locale={locale} />
            <p className="text-[0.8125rem] text-text-muted">{copy.basedOn(summary.count)}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {summary.distribution.map((row) => {
            const pct = summary.count ? Math.round((row.count / summary.count) * 100) : 0;
            return (
              <li key={row.stars} className="flex items-center gap-3 text-[0.8125rem] tabular-nums">
                <span className="sr-only">{copy.starsRow(row.stars, row.count)}</span>
                <span aria-hidden="true" className="flex w-7 shrink-0 items-center gap-1 text-text-secondary">
                  {row.stars}
                  <svg viewBox="0 0 16 16" className="size-3 text-text-primary">
                    <path fill="currentColor" d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.1 4.1 13.3l.9-4.3-3.3-3 4.4-.5z" />
                  </svg>
                </span>
                <span aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="absolute inset-y-0 start-0 bg-text-primary" style={{ width: `${pct}%` }} />
                </span>
                <span aria-hidden="true" className="w-8 shrink-0 text-end text-text-muted">
                  {row.count}
                </span>
              </li>
            );
          })}
        </ul>

        {composer}
      </div>

      <ReviewList productId={productId} initialIds={first.reviews.map((r) => r.id)} total={first.total} locale={locale}>
        {first.reviews.map((r) => (
          <ReviewItem key={r.id} review={r} locale={locale} />
        ))}
      </ReviewList>
    </div>
  );
}
