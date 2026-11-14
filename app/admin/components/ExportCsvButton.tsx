"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toCsv } from "@/lib/admin/csv";
import { getAdminText } from "@/lib/admin/i18n";

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
      className={`px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${className || ""}`}
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {isExporting ? text.exporting : label}
    </button>
  );
}
