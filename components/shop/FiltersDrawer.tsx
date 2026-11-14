"use client";

/* ══════════════════════════════════════════════════════════════
   FiltersDrawer — all filters in one drawer (end side)
   ──────────────────────────────────────────────────────────────
   Works on a draft: every change refreshes the option counts
   and the "Show N products" total from /api/search/facets
   (debounced, previous request aborted), and nothing changes
   on the page until the buyer applies. Options with no products
   are disabled; sizes are grouped by size system.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button, Drawer, Input } from "@/components/ds";
import { cn, formatPrice } from "@/lib/utils";
import { discoveryCopy } from "@/lib/search/copy";
import { priceRangeLabel } from "@/lib/search/filter-labels";
import { pricePresets, type CategoryFacetNode, type ListingFacets } from "@/lib/search/facets";
import {
  activeFilterCount,
  clearFilters,
  listingSearchParams,
  toggleValue,
  updateListing,
  type ListingState,
} from "@/lib/search/listing-params";
import { groupSizeOptions, sizeLabel, sizeToken, SIZE_GROUP_LABELS } from "@/lib/search/sizes";
import { useListing } from "./ListingProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  facets: ListingFacets;
  categoryOptions: CategoryFacetNode[];
}

/**
 * Mount with a new `key` on every opening so the draft starts
 * from the filters currently applied.
 */
export function FiltersDrawer({ open, onClose, facets: appliedFacets, categoryOptions: appliedCategories }: Props) {
  const { locale, state, scope, go } = useListing();
  const copy = discoveryCopy(locale);
  const [draft, setDraft] = useState<ListingState>(state);
  const [live, setLive] = useState({ facets: appliedFacets, categoryOptions: appliedCategories });
  const [loading, setLoading] = useState(false);
  const firstRun = useRef(true);

  // Live counts for the draft.
  const draftKey = listingSearchParams({ ...draft, page: 1, view: 4, sort: "relevance" }).toString();
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(draftKey);
        params.set("scope", scope);
        const res = await fetch(`/api/search/facets?${params.toString()}`, { signal: controller.signal });
        if (res.ok) setLive(await res.json());
      } catch {
        /* aborted or offline: keep the last counts */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draftKey, scope]);

  const { facets, categoryOptions } = live;
  const set = (patch: Partial<ListingState>) => setDraft((d) => updateListing(d, patch));

  function apply() {
    onClose();
    go(updateListing(state, { ...filtersOf(draft) }));
  }

  const sizeGroups = groupSizeOptions(facets.sizes);
  const presets = pricePresets(facets.price.values);
  const selectedCount = activeFilterCount(draft);

  const footer = (
    <div className="flex gap-3">
      <Button variant="secondary" className="flex-1" disabled={selectedCount === 0} onClick={() => setDraft((d) => clearFilters(d))}>
        {copy.clear}
      </Button>
      <Button className="flex-[2]" onClick={apply} disabled={!loading && facets.total === 0}>
        <span aria-live="polite" className="tabular-nums">
          {loading ? copy.updating : copy.show(facets.total)}
        </span>
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={copy.filters}
      closeLabel={locale === "ar" ? "إغلاق" : "Close"}
      footer={footer}
      className="md:max-w-[420px]"
    >
      <div className="px-5" aria-busy={loading}>
        {categoryOptions.length > 0 ? (
          <Section title={copy.category} selected={draft.categories.length} open>
            <ul className="flex flex-col">
              {categoryOptions.map((node) => (
                <CategoryRow key={node.id} node={node} depth={0} draft={draft} onToggle={(slug) => set({ categories: toggleValue(draft.categories, slug) })} />
              ))}
            </ul>
          </Section>
        ) : null}

        {sizeGroups.length > 0 ? (
          <Section title={copy.size} selected={draft.sizes.length} open>
            <div className="flex flex-col gap-5">
              {sizeGroups.map(({ group, options }) => (
                <fieldset key={group}>
                  <legend className="mb-2.5 text-[0.8125rem] text-text-muted">{SIZE_GROUP_LABELS[group][locale]}</legend>
                  <div className="flex flex-wrap gap-2">
                    {options.map((o) => {
                      const token = sizeToken(group, o.value);
                      const selected = draft.sizes.some((s) => s.toLowerCase() === token.toLowerCase() || s.toLowerCase() === o.value.toLowerCase());
                      const disabled = o.count === 0 && !selected;
                      return (
                        <button
                          key={token}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() =>
                            set({
                              sizes: selected
                                ? draft.sizes.filter((s) => s.toLowerCase() !== token.toLowerCase() && s.toLowerCase() !== o.value.toLowerCase())
                                : [...draft.sizes, token],
                            })
                          }
                          aria-label={`${sizeLabel(o.value, locale)} (${copy.countLabel(o.count)})`}
                          className={cn(
                            "inline-flex h-11 min-w-12 items-center justify-center gap-1.5 rounded-sm border px-3 text-sm tabular-nums transition-colors",
                            selected
                              ? "border-text-primary bg-text-primary text-background"
                              : "border-border text-text-primary hover:border-text-primary",
                            disabled && "cursor-not-allowed border-border text-text-faint line-through hover:border-border",
                          )}
                        >
                          {sizeLabel(o.value, locale)}
                          <span aria-hidden="true" className={cn("text-[0.6875rem]", selected ? "text-background/70" : "text-text-muted")}>
                            {o.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </Section>
        ) : null}

        {facets.colors.length > 0 ? (
          <Section title={copy.colour} selected={draft.colors.length} open>
            <ul className="grid grid-cols-2 gap-x-4">
              {facets.colors.map((c) => {
                const selected = draft.colors.some((v) => v.toLowerCase() === c.name_en.toLowerCase());
                const disabled = c.count === 0 && !selected;
                const name = locale === "ar" ? c.name_ar : c.name_en;
                return (
                  <li key={c.name_en}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() =>
                        set({
                          colors: selected
                            ? draft.colors.filter((v) => v.toLowerCase() !== c.name_en.toLowerCase())
                            : [...draft.colors, c.name_en],
                        })
                      }
                      className="flex h-11 w-full items-center gap-3 text-start text-sm text-text-primary disabled:cursor-not-allowed disabled:text-text-faint"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative inline-flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-black/10 dark:ring-white/15",
                          selected && "outline outline-2 outline-offset-2 outline-text-primary",
                          disabled && "opacity-40",
                        )}
                        style={{ backgroundColor: c.hex ?? "var(--surface-inset)" }}
                      />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <span className="text-[0.8125rem] tabular-nums text-text-muted">{c.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        {facets.price.max !== null ? (
          <Section title={copy.price} selected={draft.min !== null || draft.max !== null ? 1 : 0} open>
            <PriceFields
              key={`${draft.min}-${draft.max}`}
              min={draft.min}
              max={draft.max}
              bounds={{ min: facets.price.min ?? 0, max: facets.price.max }}
              onChange={(min, max) => set({ min, max })}
            />
            {presets.length > 0 ? (
              <ul className="mt-4 flex flex-col">
                {presets.map((p) => {
                  const selected = draft.min === p.min && draft.max === p.max;
                  return (
                    <li key={`${p.min}-${p.max}`}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => set(selected ? { min: null, max: null } : { min: p.min, max: p.max })}
                        className="flex h-11 w-full items-center gap-3 text-start text-sm text-text-primary"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                            selected ? "border-text-primary" : "border-border-hover",
                          )}
                        >
                          {selected ? <span className="size-2 rounded-full bg-text-primary" /> : null}
                        </span>
                        <span className="flex-1 tabular-nums">{priceRangeLabel(p.min, p.max, locale)}</span>
                        <span className="text-[0.8125rem] tabular-nums text-text-muted">{p.count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Section>
        ) : null}

        <Section title={copy.availability} selected={(draft.inStock ? 1 : 0) + (draft.onSale ? 1 : 0) + (draft.isNew ? 1 : 0)} open last>
          <ul className="flex flex-col">
            <ToggleRow label={copy.inStockOnly} count={facets.inStock} checked={draft.inStock} onChange={(v) => set({ inStock: v })} />
            <ToggleRow label={copy.onSale} count={facets.onSale} checked={draft.onSale} onChange={(v) => set({ onSale: v })} />
            {draft.isNew || state.isNew ? (
              <ToggleRow label={copy.newOnly} count={null} checked={draft.isNew} onChange={(v) => set({ isNew: v })} />
            ) : null}
          </ul>
        </Section>
      </div>
    </Drawer>
  );
}

/** Only the filter fields of a state (search text, sort and view stay as they are). */
function filtersOf(s: ListingState): Partial<ListingState> {
  return {
    categories: s.categories,
    sizes: s.sizes,
    colors: s.colors,
    min: s.min,
    max: s.max,
    inStock: s.inStock,
    onSale: s.onSale,
    isNew: s.isNew,
  };
}

function Section({
  title,
  selected,
  open,
  last,
  children,
}: {
  title: string;
  selected: number;
  open?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className={cn("group border-border py-1", !last && "border-b")}>
      <summary className="flex h-14 cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-text-primary [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {selected > 0 ? <span className="ms-2 text-text-muted tabular-nums">· {selected}</span> : null}
        </span>
        <span aria-hidden="true" className="relative size-3 shrink-0">
          <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
          <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-200 group-open:scale-y-0" />
        </span>
      </summary>
      <div className="pb-6 pt-1">{children}</div>
    </details>
  );
}

function CheckboxMark({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[2px] border transition-colors",
        checked ? "border-text-primary bg-text-primary text-background" : "border-border-hover bg-surface-elevated",
        disabled && "opacity-40",
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
    </span>
  );
}

function CategoryRow({
  node,
  depth,
  draft,
  onToggle,
}: {
  node: CategoryFacetNode;
  depth: number;
  draft: ListingState;
  onToggle: (slug: string) => void;
}) {
  const { locale } = useListing();
  const checked = draft.categories.includes(node.slug);
  const disabled = node.count === 0 && !checked;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onToggle(node.slug)}
        className={cn(
          "flex h-11 w-full items-center gap-3 text-start text-sm text-text-primary disabled:cursor-not-allowed disabled:text-text-faint",
          depth > 0 && "ps-7",
        )}
      >
        <CheckboxMark checked={checked} disabled={disabled} />
        <span className="min-w-0 flex-1 truncate">{locale === "ar" ? node.name_ar : node.name_en}</span>
        <span className="text-[0.8125rem] tabular-nums text-text-muted">{node.count}</span>
      </button>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} depth={depth + 1} draft={draft} onToggle={onToggle} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ToggleRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number | null;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const disabled = count === 0 && !checked;
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-full items-center gap-3 text-start text-sm text-text-primary disabled:cursor-not-allowed disabled:text-text-faint"
      >
        <CheckboxMark checked={checked} disabled={disabled} />
        <span className="flex-1">{label}</span>
        {count !== null ? <span className="text-[0.8125rem] tabular-nums text-text-muted">{count}</span> : null}
      </button>
    </li>
  );
}

/** Min / max inputs; a value is applied to the draft on blur or Enter. */
function PriceFields({
  min,
  max,
  bounds,
  onChange,
}: {
  min: number | null;
  max: number | null;
  bounds: { min: number; max: number };
  onChange: (min: number | null, max: number | null) => void;
}) {
  const { locale } = useListing();
  const copy = discoveryCopy(locale);
  const id = useId();
  const [lo, setLo] = useState(min === null ? "" : String(min));
  const [hi, setHi] = useState(max === null ? "" : String(max));

  function commit() {
    const a = lo.trim() === "" ? null : Math.max(0, Number(lo));
    const b = hi.trim() === "" ? null : Math.max(0, Number(hi));
    const validA = a !== null && Number.isFinite(a) ? a : null;
    const validB = b !== null && Number.isFinite(b) ? b : null;
    if (validA !== null && validB !== null && validA > validB) onChange(validB, validA);
    else if (validA !== min || validB !== max) onChange(validA, validB);
  }

  const currency = locale === "ar" ? "ج.م" : "EGP";
  return (
    <div
      className="grid grid-cols-2 gap-3"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    >
      <Input
        id={`${id}-min`}
        label={`${copy.priceFrom} (${currency})`}
        inputMode="numeric"
        type="number"
        min={0}
        step={1}
        placeholder={formatPrice(Math.floor(bounds.min), locale)}
        value={lo}
        onChange={(e) => setLo(e.target.value)}
        onBlur={commit}
        className="tabular-nums"
      />
      <Input
        id={`${id}-max`}
        label={`${copy.priceTo} (${currency})`}
        inputMode="numeric"
        type="number"
        min={0}
        step={1}
        placeholder={formatPrice(Math.ceil(bounds.max), locale)}
        value={hi}
        onChange={(e) => setHi(e.target.value)}
        onBlur={commit}
        className="tabular-nums"
      />
    </div>
  );
}
