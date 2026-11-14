"use client";

/* Products list with row selection and bulk actions (activate, set to draft, delete-or-hide). */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Price } from "@/components/ds";
import { bulkUpdateProducts } from "@/lib/actions/admin-catalog";
import type { CatalogProductRow } from "@/lib/admin/catalog-types";
import { productStockState } from "@/lib/admin/catalog-utils";
import { catalogError, fmt, formatCount, formatShortDate, getCatalogText } from "@/lib/admin/i18n-catalog";
import { productPrice } from "@/lib/seo/pricing";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./controls";
import { StatusLabel, StockFigure, Thumb, tdClass, thClass } from "./ui";

const checkboxClass =
  "size-[18px] cursor-pointer appearance-none rounded-[2px] border border-border-hover bg-surface-elevated align-middle transition-colors checked:border-text-primary checked:bg-text-primary " +
  "bg-center bg-no-repeat checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23f6f4ef%22 stroke-width=%222%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')] " +
  "dark:checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23121110%22 stroke-width=%222%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')] " +
  "indeterminate:border-text-primary indeterminate:bg-text-primary";

export function ProductsTable({ rows, locale, threshold }: { rows: CatalogProductRow[]; locale: string; threshold: number }) {
  const t = getCatalogText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, startTransition] = useTransition();

  // Drop selections that are no longer on the page (after filtering or paging).
  const ids = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const chosen = [...selected].filter((id) => ids.has(id));
  const allOn = chosen.length > 0 && chosen.length === rows.length;
  const someOn = chosen.length > 0 && !allOn;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)));

  const run = (op: "activate" | "deactivate" | "delete") =>
    startTransition(async () => {
      const res = await bulkUpdateProducts({ ids: chosen, op });
      setConfirmDelete(false);
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      setSelected(new Set());
      if (op === "delete") toast.success(fmt(t.products.bulk.deleted, { deleted: res.deleted, hidden: res.hidden }));
      else toast.success(fmt(t.products.bulk.done, { count: res.changed }));
      router.refresh();
    });

  const name = (r: CatalogProductRow) => (ar ? r.name_ar || r.name_en : r.name_en);
  const other = (r: CatalogProductRow) => (ar ? r.name_en : r.name_ar);
  const category = (r: CatalogProductRow) => (ar ? r.category_name_ar : r.category_name_en) ?? t.products.noCategory;

  const stockCell = (r: CatalogProductRow) => {
    const state = productStockState(r.total_stock, r.min_stock, r.variant_count, threshold);
    return (
      <div className="flex flex-col gap-0.5">
        <StockFigure value={formatCount(r.total_stock, locale)} state={state} label={state === "low" ? t.stock.low : state === "out" ? t.stock.out : undefined} />
        <span className="text-[0.75rem] text-text-muted">
          {r.variant_count === 1 ? t.stock.variantsOne : r.variant_count ? fmt(t.stock.variants, { count: r.variant_count }) : t.stock.noVariants}
        </span>
      </div>
    );
  };

  const priceCell = (r: CatalogProductRow) => {
    const now = productPrice(r);
    return <Price amount={now} compareAt={now < r.base_price ? r.base_price : null} locale={locale} size="sm" />;
  };

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={cn(thClass, "w-10 pe-0")}>
                <input
                  type="checkbox"
                  aria-label={t.common.selectAll}
                  className={checkboxClass}
                  checked={allOn}
                  ref={(el) => {
                    if (el) el.indeterminate = someOn;
                  }}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col" className={thClass}>
                {t.products.columns.product}
              </th>
              <th scope="col" className={cn(thClass, "hidden lg:table-cell")}>
                {t.products.columns.category}
              </th>
              <th scope="col" className={thClass}>
                {t.products.columns.price}
              </th>
              <th scope="col" className={thClass}>
                {t.products.columns.stock}
              </th>
              <th scope="col" className={thClass}>
                {t.products.columns.status}
              </th>
              <th scope="col" className={cn(thClass, "hidden xl:table-cell text-end")}>
                {t.products.columns.updated}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = selected.has(r.id);
              return (
                <tr key={r.id} className={cn("border-b border-border transition-colors hover:bg-surface/60", on && "bg-surface")}>
                  <td className={cn(tdClass, "w-10 pe-0")}>
                    <input
                      type="checkbox"
                      aria-label={fmt(t.common.selectRow, { name: name(r) })}
                      className={checkboxClass}
                      checked={on}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className={tdClass}>
                    <Link href={`/admin/products/${r.id}`} className="group flex min-w-0 items-center gap-3">
                      <Thumb src={r.thumbnail_url} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text-primary group-hover:underline group-hover:underline-offset-4">
                          {name(r)}
                        </span>
                        <span className="block truncate text-[0.75rem] text-text-muted">
                          <bdi>{other(r)}</bdi>
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(tdClass, "hidden text-text-secondary lg:table-cell")}>{category(r)}</td>
                  <td className={tdClass}>{priceCell(r)}</td>
                  <td className={tdClass}>{stockCell(r)}</td>
                  <td className={tdClass}>
                    <StatusLabel active={r.is_active} label={r.is_active ? t.status.active : t.status.draft} />
                    {r.is_featured || r.is_new ? (
                      <span className="mt-0.5 block text-[0.75rem] text-text-muted">
                        {[r.is_featured ? t.status.featured : null, r.is_new ? t.status.new : null].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(tdClass, "hidden whitespace-nowrap text-end text-[0.8125rem] text-text-muted tabular-nums xl:table-cell")}>
                    {formatShortDate(r.updated_at, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: stacked rows */}
      <ul className="md:hidden">
        <li className="flex items-center gap-3 border-b border-border py-2">
          <input
            type="checkbox"
            aria-label={t.common.selectAll}
            className={checkboxClass}
            checked={allOn}
            ref={(el) => {
              if (el) el.indeterminate = someOn;
            }}
            onChange={toggleAll}
          />
          <span className="t-eyebrow">{t.common.selectAll}</span>
        </li>
        {rows.map((r) => {
          const on = selected.has(r.id);
          const state = productStockState(r.total_stock, r.min_stock, r.variant_count, threshold);
          return (
            <li key={r.id} className={cn("flex items-start gap-3 border-b border-border py-3", on && "bg-surface")}>
              <label className="flex h-11 w-6 shrink-0 items-start pt-3">
                <input
                  type="checkbox"
                  aria-label={fmt(t.common.selectRow, { name: name(r) })}
                  className={checkboxClass}
                  checked={on}
                  onChange={() => toggle(r.id)}
                />
              </label>
              <Link href={`/admin/products/${r.id}`} className="flex min-w-0 flex-1 gap-3">
                <Thumb src={r.thumbnail_url} size={48} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-text-primary">{name(r)}</span>
                  <span className="truncate text-[0.75rem] text-text-muted">{category(r)}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
                    {priceCell(r)}
                    <StockFigure
                      value={state === "in" ? fmt(t.stock.units, { count: formatCount(r.total_stock, locale) }) : formatCount(r.total_stock, locale)}
                      state={state}
                      label={state === "low" ? t.stock.low : state === "out" ? t.stock.out : undefined}
                    />
                  </span>
                </span>
                <StatusLabel active={r.is_active} label={r.is_active ? t.status.active : t.status.draft} className="shrink-0 pt-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bulk actions */}
      {chosen.length > 0 ? (
        <div className="sticky bottom-4 z-20 mt-4 flex justify-center px-2">
          <div
            role="region"
            aria-label={t.common.actions}
            className="flex max-w-full flex-wrap items-center gap-1 rounded-sm bg-text-primary py-1.5 ps-4 pe-1.5 text-background shadow-[var(--shadow-float)]"
          >
            <span className="me-2 text-[0.8125rem] tabular-nums">{fmt(t.common.selected, { count: chosen.length })}</span>
            <button type="button" disabled={busy} onClick={() => run("activate")} className="h-9 rounded-sm px-3 text-[0.8125rem] hover:bg-background/15 disabled:opacity-50">
              {t.products.bulk.activate}
            </button>
            <button type="button" disabled={busy} onClick={() => run("deactivate")} className="h-9 rounded-sm px-3 text-[0.8125rem] hover:bg-background/15 disabled:opacity-50">
              {t.products.bulk.deactivate}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="h-9 rounded-sm px-3 text-[0.8125rem] text-[color-mix(in_oklab,var(--destructive)_55%,var(--background))] hover:bg-background/15 disabled:opacity-50"
            >
              {t.products.bulk.delete}
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

      <ConfirmDialog
        open={confirmDelete}
        title={fmt(t.products.bulk.deleteTitle, { count: chosen.length })}
        body={t.products.bulk.deleteBody}
        confirmLabel={t.products.bulk.deleteConfirm}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        destructive
        busy={busy}
        onConfirm={() => run("delete")}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
