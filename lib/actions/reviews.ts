"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions — product reviews
   ──────────────────────────────────────────────────────────────
   submitReview: only a signed-in buyer whose order containing the
   product has been delivered may review it. The check runs here,
   on the server, with the buyer's own session; the review is then
   written with the service key (customers have no insert policy),
   marked as a verified purchase and left pending for moderation.
   One review per buyer per product: sending again edits it.

   loadMoreReviews: the next page of approved reviews.
   ══════════════════════════════════════════════════════════════ */

import { getLocale } from "@/lib/i18n/server";
import { getServiceClient, ServiceConfigError } from "@/lib/supabase/service";
import {
  REVIEWS_PAGE_SIZE,
  getApprovedReviews,
  getSignedInProfile,
  hasReceivedProduct,
  isActiveProduct,
  type PublicReview,
} from "@/lib/dal/product-page";
import { reviewsCopy } from "@/components/product/pdp-copy";
import { reviewerName } from "@/components/product/pdp-logic";
import { createReviewSchema, type ReviewActionResult, type ReviewField } from "@/components/product/review-schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitReview(input: {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}): Promise<ReviewActionResult> {
  const locale = await getLocale();
  const copy = reviewsCopy(locale);
  const e = copy.errors;

  /* 1. Validate */
  const parsed = createReviewSchema(e).safeParse(input ?? {});
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ReviewField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "rating" || field === "title" || field === "comment") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    const productIssue = parsed.error.issues.find((i) => i.path[0] === "productId");
    if (productIssue) return { ok: false, code: "product", message: e.product };
    return { ok: false, code: "invalid", message: Object.values(fieldErrors)[0] ?? e.server, fieldErrors };
  }
  const data = parsed.data;

  try {
    /* 2. Who is asking (session cookie, verified with the auth server) */
    const profile = await getSignedInProfile();
    if (!profile) return { ok: false, code: "auth", message: e.signIn };

    /* 3. The product must exist and be on sale */
    if (!(await isActiveProduct(data.productId))) return { ok: false, code: "product", message: e.product };

    /* 4. Only buyers who received it */
    if (!(await hasReceivedProduct(profile.profileId, data.productId))) {
      return { ok: false, code: "not_buyer", message: e.notBuyer };
    }

    /* 5. Write (one per buyer per product), verified, pending moderation */
    const db = getServiceClient();
    const fields = {
      rating: data.rating,
      title: data.title || null,
      comment: data.comment,
      author_name: reviewerName(profile.fullName),
      is_verified: true,
      status: "pending",
    };
    const { data: existing, error: findError } = await db
      .from("reviews")
      .select("id")
      .eq("user_id", profile.profileId)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (findError) throw findError;

    if (existing) {
      const { error } = await db.from("reviews").update(fields).eq("id", existing.id);
      if (error) throw error;
      return { ok: true, updated: true, message: copy.updated };
    }

    const { error } = await db
      .from("reviews")
      .insert({ ...fields, user_id: profile.profileId, product_id: data.productId });
    if (error) {
      // Two submissions at once: the unique (user, product) index keeps one.
      if (error.code === "23505") return { ok: true, updated: true, message: copy.updated };
      throw error;
    }
    return { ok: true, updated: false, message: copy.thanks };
  } catch (err) {
    if (err instanceof ServiceConfigError) console.error("[submitReview] configuration:", err.message);
    else console.error("[submitReview]", err instanceof Error ? err.message : err);
    return { ok: false, code: "server", message: e.server };
  }
}

/** Next page of approved reviews for the product page "Show more" button. */
export async function loadMoreReviews(
  productId: string,
  offset: number,
): Promise<{ reviews: PublicReview[]; total: number }> {
  if (typeof productId !== "string" || !UUID.test(productId)) return { reviews: [], total: 0 };
  const start = Number.isInteger(offset) && offset >= 0 && offset <= 10_000 ? offset : 0;
  return getApprovedReviews(productId, start, REVIEWS_PAGE_SIZE);
}
