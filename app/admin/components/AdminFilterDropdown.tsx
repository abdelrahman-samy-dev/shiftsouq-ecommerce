"use client";

/* ══════════════════════════════════════════════════════════════
   Filter select for list pages: sets one URL search param
   (default "status") and resets to page 1. A native <select>, so
   it is keyboard- and phone-friendly; `defaultLabel` is the
   "all" option and, unless `label` is given, its accessible name.
   ══════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export function AdminFilterDropdown({
  options,
  defaultLabel,
  className,
  param = "status",
  label,
}: {
  options: FilterOption[];
  defaultLabel: string;
  className?: string;
  param?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get(param) || "";
  const known = options.some((o) => o.value === current);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(param, value);
    else params.delete(param);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div className={cn("relative min-w-36 flex-1 sm:flex-none", className)}>
      <select
        aria-label={label ?? defaultLabel}
        value={known ? current : ""}
        disabled={isPending}
        onChange={(e) => handleSelect(e.target.value)}
        className={cn(
          "h-9 w-full min-w-36 cursor-pointer items-center sm:min-w-40 appearance-none rounded-sm border bg-surface-elevated ps-3 pe-9 text-[0.8125rem] text-text-primary outline-none transition-[border-color,box-shadow] pointer-coarse:h-11",
          "hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] disabled:opacity-60",
          known ? "border-text-primary" : "border-border",
        )}
      >
        <option value="">{defaultLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3.5 6l4.5 4.5L12.5 6" />
      </svg>
    </div>
  );
}
