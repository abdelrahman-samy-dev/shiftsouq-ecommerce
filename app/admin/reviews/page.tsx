/* ══════════════════════════════════════════════════════════════
   Admin reviews — /admin/reviews
   Pending / approved / rejected. Approve, reject or delete; the
   product rating follows approved reviews (database trigger).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, ExternalLink, MessageSquareQuote, Trash2, X } from "lucide-react";
import { Rating } from "@/components/ds";
import { clampPage, getReviews, isReviewStatus } from "@/lib/dal/admin";
import { deleteReview, setReviewStatus } from "@/lib/actions/admin-ops";
import { formatDate, getAdminText } from "@/lib/admin/i18n";
import { adminImage } from "@/lib/admin/images";
import type { ReviewStatus } from "@/lib/admin/types";
import { getLocale } from "@/lib/i18n/server";
import { ActionButton } from "../components/ActionButton";
import { AdminPagination } from "../components/AdminPagination";
import { AdminEmptyState, PageHeader, Panel, TabsNav, Tag } from "../components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.shell.nav.reviews };
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getAdminText(locale);
  const R = t.reviews;
  const view: ReviewStatus = isReviewStatus(sp.view) ? sp.view : "pending";
  const page = clampPage(sp.page);
  const { reviews, counts, totalPages } = await getReviews({ status: view, page, pageSize: 20 });

  const tabs = (["pending", "approved", "rejected"] as const).map((s) => ({
    href: s === "pending" ? "/admin/reviews" : `/admin/reviews?view=${s}`,
    label: R.tabs[s],
    count: counts[s],
    current: s === view,
  }));

  return (
    <>
      <PageHeader title={R.title} description={R.description} />
      <TabsNav label={R.title} tabs={tabs} className="mb-4" />

      <Panel padded={false}>
        {reviews.length === 0 ? (
          <AdminEmptyState
            icon={<MessageSquareQuote />}
            title={view === "pending" ? R.emptyPending : R.emptyOther}
            body={view === "pending" ? R.emptyPendingBody : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((r) => {
              const name = r.product ? (locale === "ar" ? r.product.nameAr : r.product.nameEn) : R.productGone;
              const img = adminImage(r.product?.imageUrl);
              return (
                <li key={r.id} className="grid grid-cols-1 gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] lg:gap-6">
                  {/* product */}
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-[2px] bg-surface">
                      {img ? <Image src={img.src} unoptimized={img.unoptimized} alt="" fill sizes="48px" className="object-cover" /> : null}
                    </span>
                    <div className="min-w-0">
                      {r.product ? (
                        <Link href={`/admin/products/${r.product.id}`} className="line-clamp-2 text-[0.8125rem] text-text-primary hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <p className="text-[0.8125rem] text-text-muted">{name}</p>
                      )}
                      {r.product ? (
                        <a
                          href={`/product/${r.product.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="mt-1 inline-flex items-center gap-1 text-[0.75rem] text-text-muted hover:text-text-primary"
                        >
                          {R.viewProduct}
                          <ExternalLink aria-hidden="true" className="size-3" strokeWidth={1.75} />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* review */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Rating value={r.rating} locale={locale} />
                      {r.isVerified ? <Tag tone="success">{R.verified}</Tag> : null}
                    </div>
                    {r.title ? <p className="mt-2 text-[0.875rem] font-medium text-text-primary">{r.title}</p> : null}
                    {r.comment ? (
                      <p className="mt-1 whitespace-pre-line break-words text-[0.8125rem] leading-relaxed text-text-secondary">{r.comment}</p>
                    ) : null}
                    <p className="mt-2 text-[0.75rem] text-text-muted">
                      {r.author ? (
                        <Link href={`/admin/customers/${r.author.id}`} className="hover:text-text-primary hover:underline">
                          {r.author.name || R.anonymous}
                        </Link>
                      ) : (
                        R.anonymous
                      )}
                      {" · "}
                      {formatDate(r.createdAt, locale)}
                    </p>
                  </div>

                  {/* actions */}
                  <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
                    {r.status !== "approved" ? (
                      <ActionButton
                        variant="primary"
                        icon={<Check aria-hidden="true" strokeWidth={1.75} />}
                        action={setReviewStatus.bind(null, r.id, "approved")}
                        success={R.approved}
                        errors={R.error}
                      >
                        {R.approve}
                      </ActionButton>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <ActionButton
                        icon={<X aria-hidden="true" strokeWidth={1.75} />}
                        action={setReviewStatus.bind(null, r.id, "rejected")}
                        success={R.rejected}
                        errors={R.error}
                      >
                        {R.reject}
                      </ActionButton>
                    ) : null}
                    <ActionButton
                      variant="danger"
                      icon={<Trash2 aria-hidden="true" strokeWidth={1.75} />}
                      action={deleteReview.bind(null, r.id)}
                      success={R.deleted}
                      errors={R.error}
                      confirm={{ title: R.deleteTitle, body: R.deleteBody, confirmLabel: R.delete, cancelLabel: t.common.cancel }}
                    >
                      {R.delete}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {totalPages > 1 ? (
          <div className="border-t border-border">
            <AdminPagination currentPage={page} totalPages={totalPages} locale={locale} />
          </div>
        ) : null}
      </Panel>
    </>
  );
}
