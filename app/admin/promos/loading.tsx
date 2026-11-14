import { Skeleton } from "@/components/ds";

/* Matches the promo codes list. */
export default function AdminPromosLoading() {
  return (
    <div className="pb-16" aria-hidden="true">
      <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-3">
            <Skeleton className="h-10 w-16" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="hidden h-3.5 w-20 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
