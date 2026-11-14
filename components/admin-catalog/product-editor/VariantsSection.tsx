"use client";

/* Sizes & colours: size system, size choices, colour list, colour × size generator and the variant table. */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, Select } from "@/components/ds";
import { findTakenSkus } from "@/lib/actions/admin-catalog";
import type { EditorState } from "@/lib/admin/catalog-editor";
import { newKey } from "@/lib/admin/catalog-editor";
import { stockState } from "@/lib/admin/catalog-utils";
import {
  buildMatrix,
  HEX_PATTERN,
  moveItem,
  SIZE_PRESETS,
  SIZE_SYSTEMS,
  skuBase,
  uniqueSku,
  type ColourOption,
  type SizeSystem,
  type VariantRow,
} from "@/lib/admin/catalog-variants";
import { fmt, formatCount, type CatalogText } from "@/lib/admin/i18n-catalog";
import { cn } from "@/lib/utils";

const cell = "h-10 w-full rounded-sm border border-border bg-surface-elevated px-2.5 text-[0.8125rem] text-text-primary outline-none hover:border-border-hover focus:border-text-primary aria-[invalid=true]:border-destructive";

export function VariantsSection({
  state,
  update,
  t,
  locale,
  productId,
  threshold,
}: {
  state: EditorState;
  update: (patch: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) => void;
  t: CatalogText;
  locale: string;
  productId: string | null;
  threshold: number;
}) {
  const tv = t.editor.variants;
  const ar = locale === "ar";
  const [generating, startGenerate] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const preset = SIZE_PRESETS[state.size_system];

  /* ── Matrix in sync with choices? ─────────────────────────── */
  const wantedCombos = new Set<string>();
  const colourNames = state.colours.filter((c) => c.name_en.trim()).map((c) => c.name_en.trim().toLowerCase());
  const sizes = state.size_system === "one_size" ? [] : state.sizes;
  for (const c of colourNames.length ? colourNames : [""]) for (const s of sizes.length ? sizes : [""]) wantedCombos.add(`${c}|${s.toLowerCase()}`);
  const haveCombos = new Set(state.variants.map((v) => `${(v.color_en ?? "").toLowerCase()}|${(v.size ?? "").toLowerCase()}`));
  const outOfSync = wantedCombos.size !== haveCombos.size || [...wantedCombos].some((k) => !haveCombos.has(k));

  /* ── Size system & sizes ──────────────────────────────────── */
  const setSystem = (system: SizeSystem) => {
    update({ size_system: system, sizes: system === "one_size" ? [] : [...SIZE_PRESETS[system]] });
  };
  const toggleSize = (size: string) =>
    update((s) => {
      const on = s.sizes.includes(size);
      const next = on ? s.sizes.filter((x) => x !== size) : [...s.sizes, size];
      return { sizes: SIZE_PRESETS[s.size_system].filter((x) => next.includes(x)) };
    });

  /* ── Colours ──────────────────────────────────────────────── */
  const addColour = () => update((s) => ({ colours: [...s.colours, { key: newKey("c"), name_en: "", name_ar: "", hex: "#000000" }] }));
  const removeColour = (key: string) => update((s) => ({ colours: s.colours.filter((c) => c.key !== key) }));
  /** Editing a colour renames it on its variants and photos straight away. */
  const editColour = (key: string, patch: Partial<ColourOption>) =>
    update((s) => {
      const old = s.colours.find((c) => c.key === key);
      if (!old) return {};
      const next = { ...old, ...patch };
      const same = (name: string | null) => !!name && !!old.name_en && name.toLowerCase() === old.name_en.toLowerCase();
      return {
        colours: s.colours.map((c) => (c.key === key ? next : c)),
        variants: s.variants.map((v) =>
          same(v.color_en) ? { ...v, color_en: next.name_en || v.color_en, color_ar: next.name_ar || v.color_ar, color_hex: next.hex || v.color_hex } : v,
        ),
        images: s.images.map((img) => (same(img.color_en) ? { ...img, color_en: next.name_en || img.color_en } : img)),
      };
    });

  /* ── Generate ─────────────────────────────────────────────── */
  const generate = () =>
    startGenerate(async () => {
      const colours = state.colours.filter((c) => c.name_en.trim());
      const base = skuBase(state.name_en || state.slug || "SKU");
      let result = buildMatrix({ base, colours, sizes, existing: state.variants, newKey: () => newKey("v") });
      // Avoid SKUs other products already use.
      const fresh = result.rows.filter((r) => !r.id).map((r) => r.sku);
      if (fresh.length) {
        const res = await findTakenSkus(fresh, productId);
        if (res.ok && res.taken.length) {
          const taken = new Set([...res.taken.map((s) => s.toUpperCase()), ...result.rows.map((r) => r.sku.toUpperCase())]);
          result = {
            ...result,
            rows: result.rows.map((r) => {
              if (r.id || !res.taken.some((x) => x.toUpperCase() === r.sku.toUpperCase())) return r;
              const sku = uniqueSku(r.sku, taken);
              taken.add(sku.toUpperCase());
              return { ...r, sku };
            }),
          };
        }
      }
      update({ variants: result.rows });
      const msg = [fmt(tv.generated, { added: result.added, removed: result.removed }), result.keptLocked ? fmt(tv.keptLocked, { count: result.keptLocked }) : null]
        .filter(Boolean)
        .join(" · ");
      setNote(msg);
      toast.success(msg);
    });

  /* ── Rows ─────────────────────────────────────────────────── */
  const editRow = (key: string, patch: Partial<VariantRow>) =>
    update((s) => ({ variants: s.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));
  const removeRow = (key: string) => update((s) => ({ variants: s.variants.filter((v) => v.key !== key) }));
  const moveRow = (index: number, to: number) => update((s) => ({ variants: moveItem(s.variants, index, to) }));

  const rowLabel = (v: VariantRow) => {
    const colour = ar ? v.color_ar || v.color_en : v.color_en;
    return [colour, v.size ?? (state.size_system === "one_size" ? tv.oneSize : null)].filter(Boolean).join(" · ") || tv.oneSize;
  };
  const total = state.variants.reduce((sum, v) => sum + (Number.isFinite(v.stock) ? v.stock : 0), 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Size system + sizes */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <Select label={tv.sizeSystem} value={state.size_system} onChange={(e) => setSystem(e.target.value as SizeSystem)}>
          {SIZE_SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {tv.systems[s]}
            </option>
          ))}
        </Select>
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-[0.8125rem] text-text-secondary">{tv.sizes}</legend>
          {preset.length ? (
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {preset.map((size) => {
                const on = state.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "h-10 min-w-12 rounded-sm border px-3 text-[0.8125rem] tabular-nums transition-colors",
                      on ? "border-text-primary bg-text-primary text-background" : "border-border text-text-secondary hover:border-text-primary",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="flex h-10 items-center text-sm text-text-muted">{tv.oneSize}</p>
          )}
          <p className="mt-1.5 text-[0.8125rem] text-text-muted">{tv.sizesHint}</p>
        </fieldset>
      </div>

      {/* Colours */}
      <fieldset className="min-w-0">
        <legend className="mb-1 text-[0.8125rem] text-text-secondary">{tv.colours}</legend>
        <p className="mb-3 text-[0.8125rem] text-text-muted">{tv.coloursHint}</p>
        {state.colours.length === 0 ? <p className="mb-3 border-y border-border py-3 text-sm text-text-muted">{tv.noColours}</p> : null}
        <ul className="flex flex-col gap-2">
          {state.colours.map((c, i) => {
            const hexOk = HEX_PATTERN.test(c.hex);
            return (
              <li key={c.key} className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-end gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem]">
                <label className="relative block size-11 cursor-pointer overflow-hidden rounded-full border border-border-hover" title={tv.colourHex}>
                  <span className="sr-only">
                    {tv.colourHex} {c.name_en || i + 1}
                  </span>
                  <span aria-hidden="true" className="absolute inset-1 rounded-full" style={{ background: hexOk ? c.hex : "transparent" }} />
                  <input type="color" value={hexOk ? c.hex : "#000000"} onChange={(e) => editColour(c.key, { hex: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                <input
                  aria-label={tv.colourNameEn}
                  placeholder={tv.colourNameEn}
                  value={c.name_en}
                  maxLength={50}
                  dir="ltr"
                  onChange={(e) => editColour(c.key, { name_en: e.target.value })}
                  className={cn(cell, "h-11 text-sm")}
                />
                <input
                  aria-label={tv.colourNameAr}
                  placeholder={tv.colourNameAr}
                  value={c.name_ar}
                  maxLength={50}
                  dir="rtl"
                  lang="ar"
                  aria-invalid={c.name_en && !c.name_ar ? true : undefined}
                  onChange={(e) => editColour(c.key, { name_ar: e.target.value })}
                  className={cn(cell, "col-start-2 h-11 text-sm sm:col-start-auto")}
                />
                <button
                  type="button"
                  aria-label={fmt(tv.removeColour, { name: c.name_en || String(i + 1) })}
                  onClick={() => removeColour(c.key)}
                  className="col-start-3 row-start-1 inline-flex size-11 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-destructive sm:col-start-auto sm:row-start-auto"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" size="sm" onClick={addColour} className="mt-3 border border-border">
          + {tv.addColour}
        </Button>
      </fieldset>

      {/* Generate */}
      <div className={cn("flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between", outOfSync ? "border-text-primary" : "border-border")}>
        <p className="text-[0.8125rem] text-text-muted">{note ?? tv.generateHint}</p>
        <Button size="sm" variant={outOfSync ? "primary" : "secondary"} onClick={generate} loading={generating} className="shrink-0">
          {tv.generate}
        </Button>
      </div>

      {/* Variant table */}
      {state.variants.length === 0 ? (
        <p className="text-sm text-text-muted">{tv.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[4.5rem_minmax(0,1.3fr)_minmax(0,1.3fr)_6rem_7.5rem_2.75rem] gap-2 border-b border-border pb-2 md:grid">
            {[tv.table.order, tv.table.variant, tv.table.sku, tv.table.stock, tv.table.price, ""].map((h, i) => (
              <span key={i} className="t-eyebrow">
                {h}
              </span>
            ))}
          </div>
          <ul className="flex flex-col">
            {state.variants.map((v, i) => {
              const s = stockState(v.stock, threshold);
              const label = rowLabel(v);
              return (
                <li
                  key={v.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border py-2.5 md:grid-cols-[4.5rem_minmax(0,1.3fr)_minmax(0,1.3fr)_6rem_7.5rem_2.75rem]"
                >
                  <div className="order-last col-span-2 flex items-center gap-1 md:order-none md:col-span-1">
                    <button
                      type="button"
                      aria-label={`${t.common.moveUp}: ${label}`}
                      disabled={i === 0}
                      onClick={() => moveRow(i, i - 1)}
                      className="inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-30"
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 10l4-4 4 4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={`${t.common.moveDown}: ${label}`}
                      disabled={i === state.variants.length - 1}
                      onClick={() => moveRow(i, i + 1)}
                      className="inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-30"
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {v.color_hex ? (
                      <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-border-hover" style={{ background: v.color_hex }} />
                    ) : null}
                    <span className="truncate text-sm text-text-primary">{label}</span>
                    {v.locked ? (
                      <span title={tv.locked} className="inline-flex h-5 shrink-0 items-center rounded-[2px] bg-warning-bg px-1.5 text-[0.6875rem] text-warning">
                        {tv.lockedShort}
                        <span className="sr-only">: {tv.locked}</span>
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={fmt(tv.remove, { name: label })}
                    title={v.locked ? tv.locked : undefined}
                    disabled={v.locked}
                    onClick={() => removeRow(v.key)}
                    className="inline-flex size-10 items-center justify-center justify-self-end rounded-sm text-text-muted hover:bg-surface hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 md:order-last"
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.25">
                      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                    </svg>
                  </button>
                  <div className="col-span-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 md:contents">
                    <input
                      aria-label={`${tv.table.sku}: ${label}`}
                      value={v.sku}
                      maxLength={64}
                      dir="ltr"
                      spellCheck={false}
                      onChange={(e) => editRow(v.key, { sku: e.target.value.toUpperCase().replace(/\s+/g, "-") })}
                      className={cn(cell, "text-[0.75rem] tracking-[0.02em] tabular-nums")}
                    />
                    <div className="relative">
                      <input
                        aria-label={`${tv.table.stock}: ${label}`}
                        inputMode="numeric"
                        value={Number.isFinite(v.stock) ? String(v.stock) : ""}
                        dir="ltr"
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
                          editRow(v.key, { stock: Math.min(1_000_000, Math.max(0, n)) });
                        }}
                        className={cn(cell, "pe-6 tabular-nums", s === "out" ? "text-destructive" : s === "low" ? "text-warning" : undefined)}
                      />
                      {s !== "in" ? (
                        <span aria-hidden="true" className={cn("absolute end-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full", s === "low" ? "bg-warning" : "bg-destructive")} />
                      ) : null}
                    </div>
                    <DecimalCell
                      label={`${tv.table.price}: ${label}`}
                      placeholder={tv.priceHint}
                      value={v.price_override}
                      onCommit={(n) => editRow(v.key, { price_override: n })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[0.8125rem] text-text-muted">
            <span className="tabular-nums">{fmt(tv.total, { count: formatCount(total, locale) })}</span>
            <span>{fmt(tv.lowAt, { count: threshold })}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Decimal input that keeps what the admin types ("12.") while committing numbers. */
function DecimalCell({ label, placeholder, value, onCommit }: { label: string; placeholder: string; value: number | null; onCommit: (n: number | null) => void }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    const parsed = text === "" ? null : Number(text);
    if (parsed !== value) setText(value == null ? "" : String(value));
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      dir="ltr"
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        setText(raw);
        if (raw === "") onCommit(null);
        else if (Number.isFinite(Number(raw))) onCommit(Number(raw));
      }}
      className={cn(cell, "tabular-nums placeholder:text-[0.6875rem]")}
    />
  );
}
