/* ══════════════════════════════════════════════════════════════
   ListingEmpty — no results, nothing matching filters, or an
   empty category / collection. Always offers a way forward.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ButtonLink } from "@/components/ds/Button";
import { EmptyState } from "@/components/ds/Display";
import type { Locale } from "@/lib/types";
import { discoveryCopy } from "@/lib/search/copy";

export interface PopularCategory {
  slug: string;
  name_en: string;
  name_ar: string;
}

export function ListingEmpty({
  locale,
  kind,
  query,
  clearHref,
  popular,
}: {
  locale: Locale;
  kind: "search" | "filtered" | "empty";
  query?: string;
  clearHref?: string;
  popular: PopularCategory[];
}) {
  const copy = discoveryCopy(locale);
  const title =
    kind === "search" ? copy.noResultsTitle(query ?? "") : kind === "filtered" ? copy.noMatchTitle : copy.emptyTitle;
  const body = kind === "search" ? copy.noResultsBody : kind === "filtered" ? copy.noMatchBody : copy.emptyBody;

  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        title={title}
        body={body}
        className="pt-10 pb-8 md:pt-16"
        action={
          kind === "filtered" && clearHref ? (
            <ButtonLink href={clearHref} variant="primary">
              {copy.clearAll}
            </ButtonLink>
          ) : (
            <ButtonLink href="/shop" variant="secondary">
              {copy.browseAll}
            </ButtonLink>
          )
        }
      />
      {kind !== "filtered" && popular.length > 0 ? (
        <nav aria-labelledby="empty-popular" className="border-t border-border pt-8 text-center">
          <h3 id="empty-popular" className="t-eyebrow">
            {copy.popularCategories}
          </h3>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {popular.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${encodeURIComponent(c.slug)}`}
                  className="inline-flex h-10 items-center rounded-sm border border-border px-4 text-[0.8125rem] text-text-primary transition-colors hover:border-text-primary"
                >
                  {locale === "ar" ? c.name_ar : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
