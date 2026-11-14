/* Placeholders for the streamed parts of the product page — same boxes as the final layout. */

import { Skeleton } from "@/components/ds";

export function ReviewsSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-20" aria-hidden="true">
      <div className="flex flex-col gap-8">
        <div className="flex items-end gap-4">
          <Skeleton className="h-14 w-20" />
          <div className="flex flex-col gap-2 pb-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-2 w-full" />
          ))}
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="flex flex-col border-t border-border">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 border-b border-border py-7">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-full max-w-prose" />
            <Skeleton className="h-3.5 w-2/3 max-w-prose" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RailSkeleton() {
  return (
    <section className="py-14 md:py-20" aria-hidden="true">
      <div className="container-x mb-6 md:mb-8">
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="mx-auto flex max-w-[var(--container-max)] gap-3 overflow-hidden px-[var(--gutter)] md:gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-[44%] shrink-0 flex-col gap-3 sm:w-[30%] lg:w-[calc((100%-3rem)/4)]">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
