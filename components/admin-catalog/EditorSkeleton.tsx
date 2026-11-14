import { Skeleton } from "@/components/ds";

/* Loading state for the full-page editors: sticky bar, section links, two-column sections. */
export function EditorSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="pb-24" aria-hidden="true">
      <div className="border-b border-border pt-4 pb-3">
        <Skeleton className="h-3.5 w-20" />
        <div className="mt-2 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-64 max-w-[60%]" />
          <Skeleton className="hidden h-9 w-28 md:block" />
        </div>
        <div className="mt-4 flex gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
      </div>
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="grid gap-6 border-b border-border py-8 md:py-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-12">
          <Skeleton className="h-6 w-32" />
          <div className="flex flex-col gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
