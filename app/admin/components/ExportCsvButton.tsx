"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds";
import { toCsv } from "@/lib/admin/csv";
import { getAdminText } from "@/lib/admin/i18n";
import { adminButton } from "./buttons";

type Row = Record<string, unknown>;

/**
 * Downloads rows as CSV. `fetchData` (a server action, possibly bound to the
 * current filters) is preferred; `data` is used when no fetcher is given.
 * Cells are escaped against spreadsheet formula injection (lib/admin/csv.ts).
 */
export function ExportCsvButton({
  data: initialData,
  filename,
  label,
  className,
  fetchData,
  locale = "en",
}: {
  data?: Row[];
  filename: string;
  label: string;
  className?: string;
  fetchData?: () => Promise<Row[]>;
  locale?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const text = getAdminText(locale).csv;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = fetchData ? await fetchData() : initialData || [];
      if (!rows.length) {
        toast.info(text.empty);
        return;
      }
      // UTF-8 BOM so Excel shows Arabic text correctly.
      const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Export failed", error);
      toast.error(text.failed);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || (!initialData?.length && !fetchData)}
      aria-busy={isExporting || undefined}
      className={adminButton("outline", "sm", className)}
    >
      {isExporting ? <Spinner /> : <Download aria-hidden="true" strokeWidth={1.75} />}
      {isExporting ? text.exporting : label}
    </button>
  );
}
