/* ══════════════════════════════════════════════════════════════
   Wishlist Page — Loading Skeleton
   Shown instantly while wishlist products are being fetched.
   ══════════════════════════════════════════════════════════════ */

export default function WishlistLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Title skeleton */}
        <div className="h-9 w-40 skeleton-block rounded-xl mb-8" />

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-elevated flex flex-col">
              <div className="aspect-[4/5] skeleton-block rounded-none" />
              <div className="p-4 flex flex-col flex-grow gap-3">
                <div className="h-5 w-20 skeleton-block rounded" />
                <div className="h-4 w-full skeleton-block rounded" />
                <div className="h-4 w-2/3 skeleton-block rounded" />
                <div className="mt-auto pt-2 flex gap-2">
                  <div className="w-11 h-11 skeleton-block rounded-xl" />
                  <div className="flex-1 h-11 skeleton-block rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
