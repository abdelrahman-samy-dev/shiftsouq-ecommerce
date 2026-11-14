/* Loading placeholders shaped like the real admin pages (no layout shift when content arrives). */

import { Skeleton } from "@/components/ds";

export function PageHeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      {actions ? <Skeleton className="h-9 w-32" /> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-[4px] border border-border bg-surface-elevated" aria-hidden="true">
      <div className="flex h-10 items-center gap-6 border-b border-border px-5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-[61px] items-center gap-6 border-b border-border px-5 last:border-b-0">
          <div className="w-40 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: columns - 2 }, (_, i) => (
            <Skeleton key={i} className="hidden h-3.5 w-20 md:block" />
          ))}
          <Skeleton className="ms-auto h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row" aria-hidden="true">
      <Skeleton className="h-9 w-full sm:w-80" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
