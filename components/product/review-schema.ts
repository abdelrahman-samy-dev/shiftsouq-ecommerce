/* ══════════════════════════════════════════════════════════════
   Review input — validated on the server (lib/actions/reviews.ts)
   ──────────────────────────────────────────────────────────────
   Limits match the database check (title ≤ 120, comment ≤ 2000).
   Messages are passed in so they come back in the page language.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import type { ReviewsCopy } from "./pdp-copy";

export const REVIEW_TITLE_MAX = 120;
export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 2000;

/** Collapses runs of spaces/tabs and trims, keeping line breaks (max two in a row). */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createReviewSchema(errors: ReviewsCopy["errors"]) {
  return z.object({
    productId: z.uuid({ message: errors.product }),
    rating: z.coerce
      .number({ message: errors.rating })
      .int({ message: errors.rating })
      .min(1, { message: errors.rating })
      .max(5, { message: errors.rating }),
    title: z.preprocess(cleanText, z.string().max(REVIEW_TITLE_MAX, { message: errors.titleLong })),
    comment: z.preprocess(
      cleanText,
      z
        .string()
        .min(REVIEW_COMMENT_MIN, { message: errors.commentShort })
        .max(REVIEW_COMMENT_MAX, { message: errors.commentLong }),
    ),
  });
}

export type ReviewInput = z.infer<ReturnType<typeof createReviewSchema>>;

export type ReviewField = "rating" | "title" | "comment";

export type ReviewActionResult =
  | { ok: true; message: string; updated: boolean }
  | {
      ok: false;
      code: "invalid" | "auth" | "not_buyer" | "product" | "server";
      message: string;
      fieldErrors?: Partial<Record<ReviewField, string>>;
    };
