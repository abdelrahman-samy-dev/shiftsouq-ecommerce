/* Placeholders with the exact geometry of what they stand for, so nothing shifts when content streams in. */

import { Skeleton } from "@/components/ds";

/** The sticky toolbar while filter options load. */
export function ToolbarSkeleton() {
  return (
    <div aria-hidden="true" className="border-y border-border bg-background">
      <div className="container-x flex h-14 items-center gap-5">
        <Skeleton className="h-4 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

/** A block of product cards. */
export function GridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <Skeleton className="mt-3 h-3.5 w-3/4" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
