import { Skeleton } from "@/components/ds";

/* Matches the products list: header, toolbar, rows. */
export default function AdminProductsLoading() {
  return (
    <div className="pb-16" aria-hidden="true">
      <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex flex-col gap-3 py-4 lg:flex-row">
        <Skeleton className="h-10 w-full lg:max-w-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="border-t border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-3 py-3">
            <Skeleton className="h-[45px] w-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="hidden h-3.5 w-16 md:block" />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
