"use client";

/* ══════════════════════════════════════════════════════════════
   ProductGrid — listing grid with "Load more"
   ──────────────────────────────────────────────────────────────
   • 2 columns on phones, 3 from 768px, 4 from 1280px; the
     desktop density toggle switches to 2-up editorial.
   • "Load more" is a real link to ?page=N+1 (crawlers follow it);
     with JavaScript it appends the next page in place and moves
     the URL to that page with history.replaceState.
   • Numbered page links underneath for crawlers and keyboard users.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { cn } from "@/lib/utils";
import type { GridProduct } from "@/lib/search/card";
import { discoveryCopy } from "@/lib/search/copy";
import { LISTING_PAGE_SIZE, listingSearchParams, pageWindow, type ListingState } from "@/lib/search/listing-params";
import { useListing } from "./ListingProvider";

const SIZES_FOUR = "(min-width: 1600px) 400px, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";
const SIZES_TWO = "(min-width: 1600px) 800px, 50vw";

export function ProductGrid({
  initialProducts,
  total,
  startPage,
}: {
  initialProducts: GridProduct[];
  total: number;
  startPage: number;
}) {
  const { locale, state, scope, hrefFor, pending } = useListing();
  const copy = discoveryCopy(locale);
  const [products, setProducts] = useState(initialProducts);
  const [lastPage, setLastPage] = useState(startPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));
  const shownUpTo = Math.min(total, (startPage - 1) * LISTING_PAGE_SIZE + products.length);
  const hasMore = lastPage < pageCount;
  const at = (page: number): ListingState => ({ ...state, page });

  async function loadMore() {
    if (loading) return;
    const next = lastPage + 1;
    setLoading(true);
    setError(false);
    try {
      const params = listingSearchParams(at(next));
      params.set("scope", scope);
      const res = await fetch(`/api/search/products?${params.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { products: GridProduct[] };
      setProducts((list) => {
        const seen = new Set(list.map((p) => p.id));
        return [...list, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setLastPage(next);
      window.history.replaceState(null, "", hrefFor(at(next)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const two = state.view === 2;

  return (
    <div>
      {startPage > 1 ? (
        <div className="mb-8 flex justify-center">
          <a
            href={hrefFor(at(startPage - 1))}
            className="text-[0.8125rem] text-text-secondary underline underline-offset-4 decoration-border-hover hover:text-text-primary hover:decoration-text-primary"
          >
            {copy.showPrevious}
          </a>
        </div>
      ) : null}

      <h2 className="sr-only">{copy.products}</h2>
      <ul
        aria-busy={pending || loading}
        className={cn(
          "grid grid-cols-2 gap-x-3 gap-y-8 transition-opacity duration-200 md:gap-x-4 md:gap-y-12",
          two ? "xl:gap-x-6 xl:gap-y-16" : "md:grid-cols-3 xl:grid-cols-4 xl:gap-x-5",
          pending && "opacity-50",
        )}
      >
        {products.map((product, index) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              locale={locale}
              sizes={two ? SIZES_TWO : SIZES_FOUR}
              priority={startPage === 1 && index < 2}
            />
          </li>
        ))}
      </ul>

      <div className="mt-14 flex flex-col items-center gap-5 md:mt-20">
        <p className="text-[0.8125rem] tabular-nums text-text-muted">{copy.seen(shownUpTo, total)}</p>
        <div aria-hidden="true" className="h-px w-48 bg-border">
          <div className="h-px bg-text-primary transition-[width] duration-500" style={{ width: `${Math.round((shownUpTo / Math.max(total, 1)) * 100)}%` }} />
        </div>
        {hasMore ? (
          <a
            href={hrefFor(at(lastPage + 1))}
            onClick={(e) => {
              e.preventDefault();
              void loadMore();
            }}
            aria-disabled={loading || undefined}
            className="inline-flex h-12 min-w-48 items-center justify-center rounded-sm border border-text-primary px-8 text-sm font-medium text-text-primary transition-colors hover:bg-text-primary hover:text-background"
          >
            {loading ? copy.loading : copy.loadMore}
          </a>
        ) : null}
        {error ? (
          <p role="alert" className="text-[0.8125rem] text-destructive">
            {copy.loadError}
          </p>
        ) : null}

        {pageCount > 1 ? (
          <nav aria-label={copy.pages} className="mt-2">
            <ol className="flex flex-wrap items-center justify-center gap-1 text-[0.8125rem] tabular-nums">
              {pageWindow(lastPage, pageCount).map((p, i) =>
                p === null ? (
                  <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-text-faint">
                    …
                  </li>
                ) : (
                  <li key={p}>
                    <a
                      href={hrefFor(at(p))}
                      aria-label={copy.page(p)}
                      aria-current={p === lastPage ? "page" : undefined}
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-sm transition-colors",
                        p === lastPage ? "text-text-primary underline underline-offset-4" : "text-text-muted hover:text-text-primary",
                      )}
                    >
                      {p}
                    </a>
                  </li>
                ),
              )}
            </ol>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
