"use client";

/* From / to date filter for list pages: writes ?from=YYYY-MM-DD&to=YYYY-MM-DD (store time). */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useId, useTransition } from "react";
import { cn } from "@/lib/utils";

const dateClass =
  "h-9 rounded-sm border border-border bg-surface-elevated px-2.5 text-[0.8125rem] text-text-primary outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] pointer-coarse:h-11 [color-scheme:light] dark:[color-scheme:dark]";

export function DateRangeFilter({ fromLabel, toLabel, className }: { fromLabel: string; toLabel: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const update = (key: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return (
    <div className={cn("flex items-center gap-2", pending && "opacity-70", className)}>
      <label htmlFor={`${id}-from`} className="text-[0.8125rem] text-text-muted">
        {fromLabel}
      </label>
      <input id={`${id}-from`} type="date" value={from} max={to || undefined} onChange={(e) => update("from", e.target.value)} className={dateClass} />
      <label htmlFor={`${id}-to`} className="text-[0.8125rem] text-text-muted">
        {toLabel}
      </label>
      <input id={`${id}-to`} type="date" value={to} min={from || undefined} onChange={(e) => update("to", e.target.value)} className={dateClass} />
    </div>
  );
}
