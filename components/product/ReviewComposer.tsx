"use client";

/* ══════════════════════════════════════════════════════════════
   ReviewComposer — "Write a review" for buyers who received it
   ──────────────────────────────────────────────────────────────
   Guests get a sign-in link; signed-in visitors without a
   delivered order see why they can't review; buyers open a ds
   Dialog with the form. The server action checks everything
   again (lib/actions/reviews.ts) and keeps the review pending
   until it is approved.
   ══════════════════════════════════════════════════════════════ */

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button, ButtonLink, Dialog, Input, Textarea } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { ReviewerState } from "@/lib/dal/product-page";
import { submitReview } from "@/lib/actions/reviews";
import { reviewsCopy } from "./pdp-copy";
import {
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN,
  REVIEW_TITLE_MAX,
  type ReviewField,
} from "./review-schema";

interface ReviewComposerProps {
  productId: string;
  viewer: ReviewerState;
  signInHref: string;
  locale: Locale;
}

export default function ReviewComposer({ productId, viewer, signInHref, locale }: ReviewComposerProps) {
  const copy = reviewsCopy(locale);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  if (viewer.status === "guest") {
    return (
      <ButtonLink href={signInHref} variant="secondary" className="self-start">
        {copy.signIn}
      </ButtonLink>
    );
  }

  const { canReview, existing } = viewer;
  return (
    <div className="flex flex-col items-start gap-3">
      {canReview ? (
        <Button
          variant="secondary"
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
        >
          {existing ? copy.edit : copy.write}
        </Button>
      ) : !existing ? (
        <p className="max-w-xs text-[0.8125rem] text-text-muted">{copy.onlyBuyers}</p>
      ) : null}
      {existing?.status === "pending" ? <p className="text-[0.8125rem] text-text-muted">{copy.pending}</p> : null}
      {mounted ? (
        <ReviewDialog productId={productId} existing={existing} open={open} onClose={() => setOpen(false)} locale={locale} />
      ) : null}
    </div>
  );
}

type Existing = Extract<ReviewerState, { status: "signed_in" }>["existing"];

function ReviewDialog({
  productId,
  existing,
  open,
  onClose,
  locale,
}: {
  productId: string;
  existing: Existing;
  open: boolean;
  onClose: () => void;
  locale: Locale;
}) {
  const copy = reviewsCopy(locale);
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [errors, setErrors] = useState<Partial<Record<ReviewField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function validate(): Partial<Record<ReviewField, string>> {
    const e: Partial<Record<ReviewField, string>> = {};
    if (rating < 1 || rating > 5) e.rating = copy.errors.rating;
    if (title.trim().length > REVIEW_TITLE_MAX) e.title = copy.errors.titleLong;
    const c = comment.trim();
    if (c.length < REVIEW_COMMENT_MIN) e.comment = copy.errors.commentShort;
    else if (c.length > REVIEW_COMMENT_MAX) e.comment = copy.errors.commentLong;
    return e;
  }

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setFormError(null);
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length > 0) {
      const first = (["rating", "title", "comment"] as const).find((f) => local[f]);
      ev.currentTarget.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ productId, rating, title, comment });
      if (res.ok) {
        setDone(res.message);
        router.refresh();
        return;
      }
      setErrors(res.fieldErrors ?? {});
      if (!res.fieldErrors || Object.keys(res.fieldErrors).length === 0) setFormError(res.message);
    });
  }

  const shown = hover || rating;
  const ratingErrorId = `${productId}-rating-error`;

  return (
    <Dialog open={open} onClose={onClose} title={copy.formTitle} closeLabel={copy.done}>
      {done ? (
        <div className="flex flex-col items-start gap-5 py-2" role="status">
          <CircleCheck className="size-8 text-success" strokeWidth={1.25} aria-hidden="true" />
          <p className="text-[0.9375rem] text-text-primary">{done}</p>
          <Button variant="secondary" onClick={onClose}>
            {copy.done}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pt-1">
          <fieldset aria-describedby={errors.rating ? ratingErrorId : undefined}>
            <legend className="mb-2 text-[0.8125rem] text-text-secondary">{copy.yourRating}</legend>
            <div className="flex items-center gap-3">
              <div className="flex" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-text-primary"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={rating === n}
                      onChange={() => {
                        setRating(n);
                        setErrors((e) => ({ ...e, rating: undefined }));
                      }}
                      data-field={n === 1 ? "rating" : undefined}
                      className="sr-only"
                    />
                    <span className="sr-only">
                      {copy.starLabel(n)} — {copy.stars[n - 1]}
                    </span>
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-6 text-text-primary">
                      <path
                        d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.1 4.1 13.3l.9-4.3-3.3-3 4.4-.5z"
                        fill={n <= shown ? "currentColor" : "transparent"}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </label>
                ))}
              </div>
              <span className={cn("text-[0.8125rem]", shown ? "text-text-primary" : "text-text-faint")} aria-hidden="true">
                {shown ? copy.stars[shown - 1] : ""}
              </span>
            </div>
            {errors.rating ? (
              <p id={ratingErrorId} role="alert" className="mt-1.5 text-[0.8125rem] text-destructive">
                {errors.rating}
              </p>
            ) : null}
          </fieldset>

          <Input
            label={copy.title}
            optional={copy.optional}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={REVIEW_TITLE_MAX}
            error={errors.title}
            data-field="title"
            autoComplete="off"
          />

          <div className="flex flex-col gap-1">
            <Textarea
              label={copy.comment}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={REVIEW_COMMENT_MAX}
              rows={5}
              error={errors.comment}
              hint={copy.commentHint}
              data-field="comment"
            />
            <p className="self-end text-[0.75rem] tabular-nums text-text-faint" aria-hidden="true">
              {comment.trim().length} / {REVIEW_COMMENT_MAX}
            </p>
          </div>

          {formError ? (
            <p role="alert" className="text-[0.8125rem] text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending}>
              {existing ? copy.update : copy.submit}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {copy.cancel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
