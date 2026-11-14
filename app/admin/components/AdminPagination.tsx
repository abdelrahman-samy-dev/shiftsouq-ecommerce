"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fill, getAdminText } from "@/lib/admin/i18n";

export function AdminPagination({
  currentPage,
  totalPages,
  locale = "en",
}: {
  currentPage: number;
  totalPages: number;
  locale?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = getAdminText(locale).pagination;
  const isRTL = locale === "ar";

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const btn =
    "p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div className="flex items-center gap-2 justify-center sm:justify-end p-4">
      <button
        type="button"
        aria-label={text.prev}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={btn}
      >
        {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mx-2">
        {fill(text.page, { page: Math.min(currentPage, totalPages), total: totalPages })}
      </span>
      <button
        type="button"
        aria-label={text.next}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={btn}
      >
        {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </div>
  );
}
