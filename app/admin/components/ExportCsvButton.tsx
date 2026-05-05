"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

export function ExportCsvButton({ data: initialData, filename, label, className, fetchData }: { data?: any[]; filename: string; label: string; className?: string; fetchData?: () => Promise<any[]> }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dataToExport = initialData || [];
      if (fetchData) {
        dataToExport = await fetchData();
      }

      if (!dataToExport || dataToExport.length === 0) return;

      // Extract headers from the first object
      const headers = Object.keys(dataToExport[0]);
      
      // Convert data to CSV string
      const csvRows = [];
      csvRows.push(headers.join(","));
      
      for (const row of dataToExport) {
        const values = headers.map(header => {
          const val = row[header];
          const stringVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val || '');
          // Escape quotes and wrap in quotes to handle commas within fields
          return `"${stringVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
      }

      const csvContent = csvRows.join("\n");
      // Prepend UTF-8 BOM (\uFEFF) so Excel correctly recognizes Arabic characters
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting || (!initialData?.length && !fetchData)}
      className={`px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${className || ""}`}
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {isExporting ? "Exporting..." : label}
    </button>
  );
}
