"use client";

/* ══════════════════════════════════════════════════════════════
   ListingToolbar — sticky bar above the product grid
   ──────────────────────────────────────────────────────────────
   Filters button (opens the drawer), active filter chips with
   one-tap removal and "Clear all", sort, and the desktop grid
   density toggle (4-up or 2-up editorial). Everything writes
   to the URL; density uses history.replaceState (no reload).
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { discoveryCopy } from "@/lib/search/copy";
import { activeChips } from "@/lib/search/filter-labels";
import type { CategoryFacetNode, ListingFacets } from "@/lib/search/facets";
import {
  activeFilterCount,
  clearFilters,
  LISTING_SORTS,
  listingHref,
  sortLabel,
  updateListing,
  type ListingSort,
} from "@/lib/search/listing-params";
import { useListing } from "./ListingProvider";
import { FiltersDrawer } from "./FiltersDrawer";

export function ListingToolbar({
  facets,
  categoryOptions,
  total,
}: {
  facets: ListingFacets;
  categoryOptions: CategoryFacetNode[];
  total: number;
}) {
  const { locale, state, go, hrefFor, basePath, pending } = useListing();
  const copy = discoveryCopy(locale);
  const [open, setOpen] = useState(false);
  // A new drawer session per opening: its draft starts from the applied filters.
  const [session, setSession] = useState(0);
  const chips = activeChips(state, { categories: categoryOptions, colors: facets.colors }, locale);
  const count = activeFilterCount(state);
  const searching = Boolean(state.q);

  function setDensity(view: 2 | 4) {
    if (view === state.view) return;
    window.history.replaceState(null, "", listingHref(basePath, { ...state, view }));
  }

  const chipList = chips.length > 0 ? (
    <ul aria-label={copy.activeFilters} className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <a
            href={hrefFor(chip.next)}
            onClick={(e) => {
              e.preventDefault();
              go(chip.next);
            }}
            aria-label={copy.removeFilter(chip.label)}
            className="group inline-flex h-9 items-center gap-2 rounded-sm border border-border bg-surface-elevated ps-3 pe-2 text-[0.8125rem] text-text-primary transition-colors hover:border-text-primary"
          >
            {chip.swatch ? (
              <span aria-hidden="true" className="size-3 rounded-full ring-1 ring-border-hover" style={{ backgroundColor: chip.swatch }} />
            ) : null}
            <span className="tabular-nums">{chip.label}</span>
            <X aria-hidden="true" className="size-3.5 text-text-muted group-hover:text-text-primary" strokeWidth={1.75} />
          </a>
        </li>
      ))}
      <li className="shrink-0">
        <a
          href={hrefFor(clearFilters(state))}
          onClick={(e) => {
            e.preventDefault();
            go(clearFilters(state));
          }}
          className="inline-flex h-9 items-center px-2 text-[0.8125rem] text-text-secondary underline underline-offset-4 decoration-border-hover hover:text-text-primary hover:decoration-text-primary"
        >
          {copy.clearAll}
        </a>
      </li>
    </ul>
  ) : null;

  return (
    <div
      id="listing-toolbar"
      className="sticky top-[var(--header-height,64px)] z-30 border-y border-border bg-background"
    >
      <div className="container-x">
        <div className="flex h-14 items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={() => {
              setSession((s) => s + 1);
              setOpen(true);
            }}
            aria-haspopup="dialog"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm text-sm font-medium text-text-primary -ms-1 px-1 hover:text-text-secondary"
          >
            <SlidersHorizontal className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
            {copy.filters}
            {count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-text-primary px-1.5 text-[0.6875rem] font-medium tabular-nums text-background">
                {count}
              </span>
            ) : null}
          </button>

          <div className="hidden min-w-0 flex-1 md:block">{chipList}</div>
          <div className="flex-1 md:hidden" />

          <p className="sr-only" aria-live="polite">
            {pending ? copy.updating : copy.countLabel(total)}
          </p>

          <div className="flex shrink-0 items-center">
            <label htmlFor="listing-sort" className="sr-only md:not-sr-only md:me-2 md:text-[0.8125rem] md:text-text-muted">
              {copy.sortBy}
            </label>
            {/* The native select (best on phones) sits invisibly over a label sized to the chosen option. */}
            <span className="relative inline-flex h-11 items-center gap-2 rounded-sm px-1 text-sm font-medium text-text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-primary">
              <span aria-hidden="true">{sortLabel(state.sort, locale, searching)}</span>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3.5 6l4.5 4.5L12.5 6" />
              </svg>
              <select
                id="listing-sort"
                value={state.sort}
                onChange={(e) => go(updateListing(state, { sort: e.target.value as ListingSort }))}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              >
                {LISTING_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {sortLabel(sort, locale, searching)}
                  </option>
                ))}
              </select>
            </span>
          </div>

          <div role="group" aria-label={copy.gridView} className="hidden shrink-0 items-center gap-1 border-s border-border ps-4 xl:flex">
            <DensityButton active={state.view === 4} label={copy.fourPerRow} onClick={() => setDensity(4)} columns={4} />
            <DensityButton active={state.view === 2} label={copy.twoPerRow} onClick={() => setDensity(2)} columns={2} />
          </div>
        </div>
        {chipList ? <div className="-mt-1 pb-2 md:hidden">{chipList}</div> : null}
      </div>

      {session > 0 ? (
        <FiltersDrawer key={session} open={open} onClose={() => setOpen(false)} facets={facets} categoryOptions={categoryOptions} />
      ) : null}
    </div>
  );
}

function DensityButton({ active, label, onClick, columns }: { active: boolean; label: string; onClick: () => void; columns: 2 | 4 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-sm transition-colors",
        active ? "text-text-primary" : "text-text-faint hover:text-text-secondary",
      )}
    >
      <span aria-hidden="true" className={cn("grid gap-[3px]", columns === 4 ? "grid-cols-4" : "grid-cols-2")}>
        {Array.from({ length: columns === 4 ? 8 : 4 }).map((_, i) => (
          <span key={i} className={cn("block bg-current", columns === 4 ? "h-[7px] w-[3px]" : "h-[7px] w-[7px]")} />
        ))}
      </span>
    </button>
  );
}
