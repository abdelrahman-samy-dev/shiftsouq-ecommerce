/* Wishlist — shown while the page loads (title + card grid). */

import { Skeleton } from "@/components/ds";

export default function WishlistLoading() {
  return (
    <div className="container-x pb-24 pt-8 md:pt-12" aria-busy="true">
      <Skeleton className="h-12 w-48" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
