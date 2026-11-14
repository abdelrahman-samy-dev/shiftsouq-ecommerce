/* One approved review. No hooks: rendered on the server for the first page and
   on the client for reviews added by "Show more". */

import { BadgeCheck } from "lucide-react";
import { Rating } from "@/components/ds";
import type { Locale } from "@/lib/types";
import type { PublicReview } from "@/lib/dal/product-page";
import { formatReviewDate, reviewsCopy } from "./pdp-copy";
import { splitParagraphs } from "./pdp-logic";

export default function ReviewItem({ review: r, locale }: { review: PublicReview; locale: Locale }) {
  const copy = reviewsCopy(locale);
  return (
    <li className="border-b border-border py-7 first:pt-6">
      <article className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Rating value={r.rating} locale={locale} />
          <time dateTime={r.date} className="text-[0.8125rem] tabular-nums text-text-muted">
            {formatReviewDate(r.date, locale)}
          </time>
        </div>
        {/* Buyers write in either language: <bdi> keeps each text's own direction
            (punctuation in place) while alignment follows the page. */}
        {r.title ? (
          <h3 className="text-[0.9375rem] font-medium text-text-primary">
            <bdi>{r.title}</bdi>
          </h3>
        ) : null}
        {r.comment ? (
          <div className="flex max-w-prose flex-col gap-2 text-text-secondary">
            {splitParagraphs(r.comment).map((lines, i) => (
              <p key={i} className="whitespace-pre-line">
                <bdi>{lines.join("\n")}</bdi>
              </p>
            ))}
          </div>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-text-muted">
          {r.author ? <bdi className="text-text-primary">{r.author}</bdi> : null}
          {r.verified ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <BadgeCheck className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              {copy.verified}
            </span>
          ) : null}
        </p>
      </article>
    </li>
  );
}
