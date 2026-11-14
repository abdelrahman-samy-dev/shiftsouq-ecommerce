/* ══════════════════════════════════════════════════════════════
   Pagination — Smart Algorithmic Pagination
   
   Displays a compact pagination bar using ellipsis-based windowing.
   For 100 pages at page 47: [‹] 1 2 … 46 47 48 … 99 100 [›]
   
   All state is driven by URL searchParams for SSR + link sharing.
   ══════════════════════════════════════════════════════════════ */

"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

/* ── Types ──────────────────────────────────────────────────── */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Current search params to preserve filters across page navigations */
  searchParams: Record<string, string>;
  /** Base path for pagination links (default: /shop) */
  basePath?: string;
  /** Number of sibling pages to show around current page */
  siblingCount?: number;
}

type PaginationItem = { type: "page"; value: number } | { type: "ellipsis"; key: string };

/* ── Pagination Algorithm ──────────────────────────────────── */

function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): PaginationItem[] {
  // Total page numbers we'd ideally show (first + last + current + 2*siblings + 2 ellipsis slots)
  const totalSlots = siblingCount * 2 + 5;

  // Case 1: If total pages fit within the slot budget — show all pages
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: "page" as const,
      value: i + 1,
    }));
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  const items: PaginationItem[] = [];

  // Case 2: No left ellipsis, show right ellipsis
  if (!showLeftEllipsis && showRightEllipsis) {
    // Show first (3 + 2*siblingCount) pages
    const leftRange = 3 + 2 * siblingCount;
    for (let i = 1; i <= leftRange; i++) {
      items.push({ type: "page", value: i });
    }
    items.push({ type: "ellipsis", key: "right" });
    items.push({ type: "page", value: totalPages });
    return items;
  }

  // Case 3: Show left ellipsis, no right ellipsis
  if (showLeftEllipsis && !showRightEllipsis) {
    items.push({ type: "page", value: 1 });
    items.push({ type: "ellipsis", key: "left" });
    const rightRange = 3 + 2 * siblingCount;
    for (let i = totalPages - rightRange + 1; i <= totalPages; i++) {
      items.push({ type: "page", value: i });
    }
    return items;
  }

  // Case 4: Show both ellipses
  items.push({ type: "page", value: 1 });
  items.push({ type: "ellipsis", key: "left" });
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    items.push({ type: "page", value: i });
  }
  items.push({ type: "ellipsis", key: "right" });
  items.push({ type: "page", value: totalPages });

  return items;
}

/* ── Component ─────────────────────────────────────────────── */

export default function Pagination({
  currentPage,
  totalPages,
  searchParams,
  basePath = "/shop",
  siblingCount = 1,
}: PaginationProps) {
  const isAr = useLocale() === "ar";

  const items = useMemo(
    () => generatePaginationRange(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount]
  );

  if (totalPages <= 1) return null;

  const buildHref = (page: number): string => {
    const params = new URLSearchParams();
    // Preserve all existing search params except 'page'
    for (const [key, value] of Object.entries(searchParams)) {
      if (key !== "page" && value) {
        params.set(key, value);
      }
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const prevLabel = isAr ? "الصفحة السابقة" : "Previous page";
  const nextLabel = isAr ? "الصفحة التالية" : "Next page";

  return (
    <nav
      className="flex items-center justify-center gap-1.5 sm:gap-2 mt-12 animate-fade-in"
      aria-label={isAr ? "التنقل بين الصفحات" : "Pagination"}
    >
      {/* ── Previous Button ──────────────────────────── */}
      {hasPrev ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="pagination-btn"
          aria-label={prevLabel}
        >
          <ChevronLeft size={16} strokeWidth={2} className="rtl:rotate-180" />
        </Link>
      ) : (
        <span className="pagination-btn pagination-btn-disabled" aria-disabled="true" aria-label={prevLabel}>
          <ChevronLeft size={16} strokeWidth={2} className="rtl:rotate-180" />
        </span>
      )}

      {/* ── Page Numbers ─────────────────────────────── */}
      {items.map((item) => {
        if (item.type === "ellipsis") {
          return (
            <span
              key={`ellipsis-${item.key}`}
              className="pagination-ellipsis"
              aria-hidden="true"
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </span>
          );
        }

        const isActive = item.value === currentPage;
        return (
          <Link
            key={item.value}
            href={buildHref(item.value)}
            className={`pagination-btn ${isActive ? "pagination-btn-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={isAr ? `الصفحة ${item.value}` : `Page ${item.value}`}
          >
            {item.value}
          </Link>
        );
      })}

      {/* ── Next Button ──────────────────────────────── */}
      {hasNext ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="pagination-btn"
          aria-label={nextLabel}
        >
          <ChevronRight size={16} strokeWidth={2} className="rtl:rotate-180" />
        </Link>
      ) : (
        <span className="pagination-btn pagination-btn-disabled" aria-disabled="true" aria-label={nextLabel}>
          <ChevronRight size={16} strokeWidth={2} className="rtl:rotate-180" />
        </span>
      )}
    </nav>
  );
}
