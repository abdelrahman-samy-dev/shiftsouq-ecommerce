"use client";

/* Search box for a list page: writes ?search= to the URL (debounced) and resets to page 1. */

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Spinner } from "@/components/ds";
import { useLocale } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";

export function AdminSearchInput({ placeholder, className, param = "search" }: { placeholder: string; className?: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(searchParams.get(param) || "");

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get(param) || "";
      if (searchTerm.trim() === currentSearch) return; // avoid redundant navigations
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm.trim()) params.set(param, searchTerm.trim());
      else params.delete(param);
      params.delete("page"); // back to page 1 on a new search
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, pathname, router, searchParams, param]);

  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={searchTerm}
        maxLength={80}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9 w-full rounded-sm border border-border bg-surface-elevated ps-9 pe-9 text-[0.8125rem] text-text-primary placeholder:text-text-faint outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] pointer-coarse:h-11 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center">
        {isPending ? (
          <Spinner className="me-1 text-text-muted" />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            aria-label={locale === "ar" ? "مسح البحث" : "Clear search"}
            className="grid size-6 place-items-center rounded-[2px] text-text-muted hover:bg-surface hover:text-text-primary"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
