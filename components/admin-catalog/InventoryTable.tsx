"use client";

/* Inventory: every variant with inline, keyboard-friendly stock editing and bulk "set stock". */

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Dialog, Input, Spinner } from "@/components/ds";
import { bulkSetStock, setVariantStock } from "@/lib/actions/admin-catalog";
import type { InventoryRow } from "@/lib/admin/catalog-types";
import { stockState } from "@/lib/admin/catalog-utils";
import { catalogError, fmt, getCatalogText } from "@/lib/admin/i18n-catalog";
import { cn } from "@/lib/utils";
import { checkboxClass, Thumb, tdClass, tdStack, thClass } from "./ui";

type RowState = { base: number; draft: string; saving: boolean; flash: "saved" | "error" | null };

export function InventoryTable({ rows, locale, threshold }: { rows: InventoryRow[]; locale: string; threshold: number }) {
  const t = getCatalogText(locale);
  const ti = t.inventory;
  const ar = locale === "ar";
  const router = useRouter();
  const [seenRows, setSeenRows] = useState(rows);
  const [state, setState] = useState<Record<string, RowState>>(() => init(rows));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, startBulk] = useTransition();
  const inputs = useRef<Map<string, HTMLInputElement>>(new Map());
  /** Values being saved right now, so Enter + blur never send the same edit twice. */
  const inFlight = useRef<Map<string, number>>(new Map());

  // New rows from the server (after a refresh or a filter change): start from them.
  if (rows !== seenRows) {
    setSeenRows(rows);
    setState(init(rows));
  }

  const patch = (id: string, p: Partial<RowState>) => setState((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  const focusRow = (index: number) => {
    const next = rows[index];
    if (!next) return;
    const el = inputs.current.get(next.id);
    el?.focus();
    el?.select();
  };

  const commit = async (row: InventoryRow, index: number, moveNext: boolean) => {
    const s = state[row.id];
    if (!s) return;
    const value = s.draft.trim() === "" ? NaN : Number(s.draft);
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      patch(row.id, { flash: "error" });
      toast.error(t.error.stock);
      return;
    }
    if (value === s.base || inFlight.current.get(row.id) === value) {
      if (moveNext) focusRow(index + 1);
      return;
    }
    inFlight.current.set(row.id, value);
    patch(row.id, { saving: true, flash: null });
    if (moveNext) focusRow(index + 1);
    const res = await setVariantStock({ id: row.id, stock: value, expected: s.base });
    inFlight.current.delete(row.id);
    if (res.ok) {
      patch(row.id, { base: res.stock, draft: String(res.stock), saving: false, flash: "saved" });
      setTimeout(() => patch(row.id, { flash: null }), 1600);
    } else if (res.error === "stock_changed" && "current" in res) {
      patch(row.id, { base: res.current, draft: String(res.current), saving: false, flash: "error" });
      toast.error(fmt(ti.changed, { count: res.current }));
    } else {
      patch(row.id, { saving: false, flash: "error" });
      toast.error(catalogError(t, res.error));
    }
  };

  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOn = !allOn && rows.some((r) => selected.has(r.id));
  const chosen = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyBulk = () =>
    startBulk(async () => {
      const res = await bulkSetStock({ ids: chosen, stock: bulkValue });
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      toast.success(fmt(ti.setStockDone, { count: res.count }));
      setBulkOpen(false);
      setBulkValue("");
      setSelected(new Set());
      router.refresh();
    });

  const name = (r: InventoryRow) => (ar ? r.product_name_ar || r.product_name_en : r.product_name_en);
  const colour = (r: InventoryRow) => (ar ? r.color_ar || r.color_en : r.color_en);

  return (
    <>
      <p className="pb-2 text-[0.75rem] text-text-muted">{ti.keyboardHint}</p>
      <table className="w-full border-collapse text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="border-y border-border">
            <th scope="col" className={cn(thClass, "w-10 pe-0")}>
              <input
                type="checkbox"
                aria-label={t.common.selectAll}
                className={checkboxClass}
                checked={allOn}
                ref={(el) => {
                  if (el) el.indeterminate = someOn;
                }}
                onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))}
              />
            </th>
            <th scope="col" className={thClass}>{ti.columns.product}</th>
            <th scope="col" className={thClass}>{ti.columns.colour}</th>
            <th scope="col" className={thClass}>{ti.columns.size}</th>
            <th scope="col" className={thClass}>{ti.columns.sku}</th>
            <th scope="col" className={cn(thClass, "w-44")}>{ti.columns.stock}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => {
            const s = state[r.id] ?? { base: r.stock, draft: String(r.stock), saving: false, flash: null };
            const draftNum = Number(s.draft);
            const live = Number.isFinite(draftNum) && s.draft !== "" ? draftNum : s.base;
            const st = stockState(live, threshold);
            const changed = s.draft !== String(s.base);
            const on = selected.has(r.id);
            const label = [name(r), colour(r), r.size].filter(Boolean).join(" · ");
            return (
              <tr
                key={r.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-2 md:table-row md:py-0",
                  on && "bg-surface",
                )}
              >
                <td className={cn(tdStack, "row-span-2 md:w-10 md:pe-0")}>
                  <input type="checkbox" aria-label={fmt(t.common.selectRow, { name: label })} className={checkboxClass} checked={on} onChange={() => toggle(r.id)} />
                </td>
                <td className={cn(tdStack, "py-1")}>
                  <Link href={`/admin/products/${r.product_id}`} className="group flex min-w-0 items-center gap-3">
                    <Thumb src={r.thumbnail_url} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-text-primary group-hover:underline group-hover:underline-offset-4">{name(r)}</span>
                      <span className="block text-[0.75rem] text-text-muted md:hidden">
                        {[colour(r), r.size, r.sku].filter(Boolean).join(" · ")}
                      </span>
                      {!r.product_active ? <span className="block text-[0.75rem] text-text-muted">{ti.hiddenProduct}</span> : null}
                    </span>
                  </Link>
                </td>
                <td className={cn(tdClass, "hidden md:table-cell")}>
                  {r.color_en ? (
                    <span className="inline-flex items-center gap-2 text-text-secondary">
                      {r.color_hex ? <span aria-hidden="true" className="size-3.5 rounded-full border border-border-hover" style={{ background: r.color_hex }} /> : null}
                      {colour(r)}
                    </span>
                  ) : (
                    <span className="text-text-faint">{t.common.none}</span>
                  )}
                </td>
                <td className={cn(tdClass, "hidden text-text-secondary tabular-nums md:table-cell")}>{r.size ?? <span className="text-text-faint">{t.common.none}</span>}</td>
                <td className={cn(tdClass, "hidden text-[0.8125rem] text-text-muted tabular-nums md:table-cell")} dir="ltr">
                  {r.sku}
                </td>
                <td className={cn(tdStack, "col-start-3 row-span-2 row-start-1")}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        if (el) inputs.current.set(r.id, el);
                        else inputs.current.delete(r.id);
                      }}
                      aria-label={fmt(ti.stockFor, { name: label })}
                      inputMode="numeric"
                      dir="ltr"
                      value={s.draft}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => patch(r.id, { draft: e.target.value.replace(/\D/g, "").slice(0, 7), flash: null })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commit(r, index, true);
                        } else if (e.key === "Escape") {
                          patch(r.id, { draft: String(s.base), flash: null });
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          focusRow(index + 1);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          focusRow(index - 1);
                        }
                      }}
                      onBlur={() => changed && void commit(r, index, false)}
                      className={cn(
                        "h-10 w-20 rounded-sm border bg-surface-elevated px-2.5 text-end text-sm tabular-nums outline-none transition-colors focus:border-text-primary",
                        s.flash === "error" ? "border-destructive" : s.flash === "saved" ? "border-success" : changed ? "border-text-primary" : "border-border hover:border-border-hover",
                        st === "out" ? "text-destructive" : st === "low" ? "text-warning" : "text-text-primary",
                      )}
                    />
                    <span className="w-4 text-[0.75rem] sm:w-20" aria-live="polite">
                      {s.saving ? (
                        <Spinner className="text-text-muted" />
                      ) : s.flash === "saved" ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3.5 8.5l3 3 6-7" /></svg>
                          <span className="sr-only sm:not-sr-only">{ti.saved}</span>
                        </span>
                      ) : st !== "in" ? (
                        <span className={cn("inline-flex items-center gap-2", st === "low" ? "text-warning" : "text-destructive")}>
                          <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", st === "low" ? "bg-warning" : "bg-destructive")} />
                          <span className="sr-only sm:not-sr-only">{st === "low" ? t.stock.low : t.stock.out}</span>
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {chosen.length > 0 ? (
        <div className="sticky bottom-4 z-20 mt-4 flex justify-center px-2">
          <div className="flex items-center gap-1 rounded-sm bg-text-primary py-1.5 ps-4 pe-1.5 text-background shadow-[var(--shadow-float)]">
            <span className="me-2 text-[0.8125rem] tabular-nums">{fmt(t.common.selected, { count: chosen.length })}</span>
            <button type="button" onClick={() => setBulkOpen(true)} className="h-9 rounded-sm px-3 text-[0.8125rem] hover:bg-background/15">
              {ti.setStock}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label={t.common.clear}
              className="ms-1 inline-flex size-9 items-center justify-center rounded-sm hover:bg-background/15"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={fmt(ti.setStockTitle, { count: chosen.length })}
        closeLabel={t.common.close}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={applyBulk} loading={bulkBusy} disabled={bulkValue === ""}>
              {ti.setStock}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (bulkValue !== "") applyBulk();
          }}
        >
          <Input
            label={ti.setStockLabel}
            inputMode="numeric"
            dir="ltr"
            autoFocus
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value.replace(/\D/g, "").slice(0, 7))}
          />
        </form>
      </Dialog>
    </>
  );
}

function init(rows: InventoryRow[]): Record<string, RowState> {
  return Object.fromEntries(rows.map((r) => [r.id, { base: r.stock, draft: String(r.stock), saving: false, flash: null }]));
}
