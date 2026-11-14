/* ══════════════════════════════════════════════════════════════
   ProductListing — toolbar + grid (or an empty state)
   ──────────────────────────────────────────────────────────────
   Server component shared by /shop, /category/[slug],
   /collections/[slug] and /search.
   The page awaits the cards before it renders (fast, and the
   first photos — the LCP — are in the first HTML), while the
   filter options stream into the toolbar behind a skeleton of
   the same size.
   ══════════════════════════════════════════════════════════════ */

import { Suspense } from "react";
import type { Locale } from "@/lib/types";
import { discoveryCopy } from "@/lib/search/copy";
import { activeFilterCount, clearFilters, listingHref, resultKey, type ListingState } from "@/lib/search/listing-params";
import { scopeToParam, type ListingFilters, type ListingPage, type ListingScope } from "@/lib/search/listing-server";
import { ListingProvider } from "./ListingProvider";
import { ListingToolbar } from "./ListingToolbar";
import { ProductGrid } from "./ProductGrid";
import { ListingEmpty, type PopularCategory } from "./ListingEmpty";
import { ToolbarSkeleton } from "./ListingSkeleton";

export async function ProductListing({
  listing,
  filters,
  scope,
  state,
  basePath,
  locale,
  popular,
}: {
  listing: ListingPage;
  filters: Promise<ListingFilters>;
  scope: ListingScope;
  state: ListingState;
  basePath: string;
  locale: Locale;
  popular: () => Promise<PopularCategory[]>;
}) {
  const { products, total } = listing;
  const filtered = activeFilterCount(state) > 0;
  const emptyKind = state.q && !filtered ? "search" : filtered ? "filtered" : "empty";

  return (
    <ListingProvider locale={locale} basePath={basePath} scope={scopeToParam(scope)}>
      <section id="listing-results" aria-label={discoveryCopy(locale).products} className="scroll-mt-[var(--header-height,64px)]">
        {total > 0 || filtered ? (
          <Suspense fallback={<ToolbarSkeleton />}>
            <StreamedToolbar filters={filters} total={total} />
          </Suspense>
        ) : null}
        <div className="container-x pt-8 pb-20 md:pt-10 md:pb-28">
          {products.length > 0 ? (
            <ProductGrid key={`${resultKey(state)}|${state.page}`} initialProducts={products} total={total} startPage={state.page} />
          ) : (
            <ListingEmpty
              locale={locale}
              kind={emptyKind}
              query={state.q}
              clearHref={listingHref(basePath, clearFilters(state))}
              popular={emptyKind === "filtered" ? [] : await popular()}
            />
          )}
        </div>
      </section>
    </ListingProvider>
  );
}

async function StreamedToolbar({ filters, total }: { filters: Promise<ListingFilters>; total: number }) {
  const { facets, categoryOptions } = await filters;
  return <ListingToolbar facets={facets} categoryOptions={categoryOptions} total={total} />;
}
