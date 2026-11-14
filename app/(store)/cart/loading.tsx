/* Bag — shown while the page loads; same shape as the page. */

import { Skeleton } from "@/components/ds";

export default function CartLoading() {
  return (
    <div className="container-x pb-16 pt-8 md:pt-12" aria-busy="true">
      <Skeleton className="h-12 w-40" />
      <div className="mt-8 grid gap-x-16 gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-x-24">
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4 py-6 md:gap-6">
              <Skeleton className="h-[8.75rem] w-28 md:h-[11.25rem] md:w-36" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-auto h-11 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}
