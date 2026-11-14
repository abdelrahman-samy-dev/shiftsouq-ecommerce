"use client";

/* ══════════════════════════════════════════════════════════════
   SizeGuideDrawer — measurement table for the product's size
   system (components/product/size-guide.ts), in the ds Drawer.
   The product's own sizes are highlighted.
   ══════════════════════════════════════════════════════════════ */

import { Drawer } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { SizeSystem } from "./pdp-logic";
import { relevantRows, rowMatches, sizeTable } from "./size-guide";
import { pdpCopy } from "./pdp-copy";

interface SizeGuideDrawerProps {
  open: boolean;
  onClose: () => void;
  system: SizeSystem;
  productSizes: string[];
  locale: Locale;
}

export default function SizeGuideDrawer({ open, onClose, system, productSizes, locale }: SizeGuideDrawerProps) {
  const copy = pdpCopy(locale);
  const table = sizeTable(system);
  if (!table) return null;
  const rows = relevantRows(table, system, productSizes);
  const anyMatch = rows.some((r) => rowMatches(r.size, productSizes));

  return (
    <Drawer open={open} onClose={onClose} title={copy.sizeGuide} closeLabel={copy.close}>
      <div className="flex flex-col gap-8 px-5 py-6">
        <div className="flex flex-col gap-1.5">
          <h3 className="t-h3">{table.title[locale]}</h3>
          <p className="text-[0.8125rem] text-text-muted">{copy.sizeGuideNote}</p>
        </div>

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[20rem] border-collapse text-[0.8125rem] tabular-nums">
            <thead>
              <tr className="border-b border-text-primary">
                {table.columns.map((c, i) => (
                  <th key={i} scope="col" className="py-2.5 pe-3 text-start font-medium text-text-primary last:pe-0">
                    {c[locale]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = rowMatches(r.size, productSizes);
                return (
                  <tr key={r.size} className={cn("border-b border-border", mine && "bg-surface")}>
                    <th scope="row" className={cn("py-2.5 ps-2 pe-3 text-start font-medium", mine ? "text-text-primary" : "text-text-secondary")}>
                      {r.size}
                    </th>
                    {r.values.map((v, i) => (
                      <td key={i} className="py-2.5 pe-3 text-text-secondary last:pe-0">
                        <span dir="ltr">{v}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {anyMatch ? <p className="mt-3 text-[0.75rem] text-text-muted">{copy.sizeGuideHighlight}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-text-primary">{copy.howToMeasure}</h3>
          <ul className="flex flex-col gap-2 text-[0.8125rem] leading-relaxed text-text-secondary">
            {table.howTo.map((h, i) => (
              <li key={i}>{h[locale]}</li>
            ))}
          </ul>
        </div>
      </div>
    </Drawer>
  );
}
