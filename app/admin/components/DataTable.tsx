/* ══════════════════════════════════════════════════════════════
   DataTable — hairline table with a sticky header and sortable
   columns (server-safe: sorting is a link that changes the URL).
   ──────────────────────────────────────────────────────────────
   <DataTable
     caption="Customers"
     rows={customers}
     rowKey={(c) => c.id}
     sort={{ key: "joined", dir: "desc", href: (key, dir) => `?sort=${key}&dir=${dir}` }}
     columns={[
       { key: "name", header: "Customer", sortKey: "name", cell: (c) => <Link …/> },
       { key: "spent", header: "Total spent", align: "end", sortKey: "spent", cell: (c) => … },
       { key: "actions", header: <span className="sr-only">Actions</span>, align: "end", cell: (c) => <ActionMenu …/> },
     ]}
   />
   Columns can be hidden on small screens with `hideBelow`.
   On phones prefer a card list (see app/admin/orders/page.tsx).
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "start" | "end" | "center";
  /** Makes the header a sort link for this key. */
  sortKey?: string;
  /** First click direction for this column (default "desc" for numbers/dates feels natural). */
  firstDir?: SortDir;
  hideBelow?: "sm" | "md" | "lg" | "xl";
  className?: string;
  headerClassName?: string;
  /** Plain-text column name for the sort link's label (when `header` isn't a string). */
  label?: string;
}

export interface SortState {
  key: string;
  dir: SortDir;
  href: (key: string, dir: SortDir) => string;
  /** Text for the sort link label: "Sort by {column}". */
  sortLabel?: string;
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const ALIGN = { start: "text-start", end: "text-end", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  sort,
  className,
  rowClassName,
  dense = false,
}: {
  columns: Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Visually hidden caption (the table's accessible name). */
  caption?: string;
  sort?: SortState;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  dense?: boolean;
}) {
  return (
    <div className={cn("overflow-x-auto lg:overflow-x-visible", className)}>
      <table className="w-full border-collapse text-[0.8125rem]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort && col.sortKey && sort.key === col.sortKey;
              const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    "sticky top-0 z-[1] h-10 border-b border-border bg-surface-elevated px-3 font-medium whitespace-nowrap first:ps-4 last:pe-4 sm:first:ps-5 sm:last:pe-5",
                    "text-[0.6875rem] uppercase tracking-[0.08em] text-text-muted [&:lang(ar)]:normal-case [&:lang(ar)]:tracking-normal [&:lang(ar)]:text-[0.75rem]",
                    ALIGN[col.align ?? "start"],
                    col.hideBelow && HIDE[col.hideBelow],
                    col.headerClassName,
                  )}
                >
                  {sort && col.sortKey ? <SortLink col={col} sort={sort} /> : col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={cn("border-b border-border last:border-b-0 transition-colors hover:bg-surface/60", rowClassName?.(row))}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3 align-middle first:ps-4 last:pe-4 sm:first:ps-5 sm:last:pe-5",
                    dense ? "py-2" : "py-3",
                    ALIGN[col.align ?? "start"],
                    col.hideBelow && HIDE[col.hideBelow],
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortLink<T>({ col, sort }: { col: Column<T>; sort: SortState }) {
  const active = sort.key === col.sortKey;
  const next: SortDir = active ? (sort.dir === "asc" ? "desc" : "asc") : (col.firstDir ?? "desc");
  const name = col.label ?? (typeof col.header === "string" ? col.header : col.key);
  return (
    <Link
      href={sort.href(col.sortKey!, next)}
      scroll={false}
      aria-label={sort.sortLabel ? sort.sortLabel.replace("{column}", name) : undefined}
      className={cn(
        "group inline-flex items-center gap-1 hover:text-text-primary",
        col.align === "end" && "flex-row-reverse",
        active && "text-text-primary",
      )}
    >
      <span>{col.header}</span>
      <svg aria-hidden="true" viewBox="0 0 12 12" className={cn("size-3", active ? "opacity-100" : "opacity-0 group-hover:opacity-50")} fill="none" stroke="currentColor" strokeWidth="1.4">
        {active && sort.dir === "asc" ? <path d="M3 7.5 6 4.5l3 3" /> : <path d="M3 4.5 6 7.5l3-3" />}
      </svg>
    </Link>
  );
}
