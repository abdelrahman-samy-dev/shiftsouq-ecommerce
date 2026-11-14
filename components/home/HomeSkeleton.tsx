import { Skeleton } from "@/components/ds/Display";

/* Loading state for the home page: hero, category tiles and a product row in their final sizes. */
export default function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <div className="-mt-[var(--header-height)] h-[max(34rem,min(92svh,60rem))] bg-surface-inset" />
      <div className="container-x py-16 md:py-24">
        <div className="mb-8 flex flex-col gap-2 md:mb-10">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="container-x pb-16">
        <div className="mb-8 flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 md:grid-cols-3 md:gap-x-4 xl:grid-cols-4 xl:gap-x-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={i >= 2 ? "hidden md:flex md:flex-col md:gap-3" : "flex flex-col gap-3"}>
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
