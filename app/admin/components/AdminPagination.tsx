"use client";

/* Previous / next pagination for list pages (keeps the other URL params). */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams, usePathname } from "next/navigation";
import { fill, getAdminText } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";
import { adminButton } from "./buttons";

export function AdminPagination({
  currentPage,
  totalPages,
  locale = "en",
  className,
}: {
  currentPage: number;
  totalPages: number;
  locale?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = getAdminText(locale).pagination;
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const href = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (n <= 1) params.delete("page");
    else params.set("page", String(n));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label={locale === "ar" ? "التنقل بين الصفحات" : "Pagination"} className={cn("flex items-center justify-end gap-2 px-4 py-3 sm:px-5", className)}>
      <span className="me-auto text-[0.8125rem] tabular-nums text-text-muted sm:me-2">{fill(text.page, { page, total: totalPages })}</span>
      <Link
        href={href(page - 1)}
        aria-label={text.prev}
        aria-disabled={page <= 1 || undefined}
        tabIndex={page <= 1 ? -1 : undefined}
        scroll={false}
        className={adminButton("outline", "icon", page <= 1 ? disabled : undefined)}
      >
        <Prev aria-hidden="true" strokeWidth={1.75} />
      </Link>
      <Link
        href={href(page + 1)}
        aria-label={text.next}
        aria-disabled={page >= totalPages || undefined}
        tabIndex={page >= totalPages ? -1 : undefined}
        scroll={false}
        className={adminButton("outline", "icon", page >= totalPages ? disabled : undefined)}
      >
        <Next aria-hidden="true" strokeWidth={1.75} />
      </Link>
    </nav>
  );
}
