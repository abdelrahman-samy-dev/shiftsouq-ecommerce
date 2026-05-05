/* ══════════════════════════════════════════════════════════════
   Product Details Page — Loading Skeleton
   Shown instantly while product data is being fetched.
   ══════════════════════════════════════════════════════════════ */

export default function ProductLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-12 skeleton-block rounded-md" />
          <div className="h-4 w-3 skeleton-block rounded-sm" />
          <div className="h-4 w-20 skeleton-block rounded-md" />
          <div className="h-4 w-3 skeleton-block rounded-sm" />
          <div className="h-4 w-32 skeleton-block rounded-md" />
        </div>

        {/* Main PDP Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">

          {/* Left: Gallery skeleton */}
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="aspect-square skeleton-block rounded-2xl" />
            {/* Thumbnails */}
            <div className="flex gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[72px] h-[72px] skeleton-block rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>

          {/* Right: Info skeleton */}
          <div className="flex flex-col gap-5 animate-pulse">
            {/* Badges */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 skeleton-block rounded-lg" />
              <div className="h-6 w-12 skeleton-block rounded-lg" />
            </div>

            {/* Brand */}
            <div className="h-3 w-20 skeleton-block rounded" />

            {/* Title */}
            <div className="h-8 w-3/4 skeleton-block rounded-xl" />

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-4 h-4 skeleton-block rounded-sm" />
                ))}
              </div>
              <div className="h-4 w-8 skeleton-block rounded" />
              <div className="h-4 w-20 skeleton-block rounded" />
            </div>

            {/* Divider */}
            <div className="h-px skeleton-block" />

            {/* Price */}
            <div className="h-10 w-32 skeleton-block rounded-xl" />
            <div className="h-4 w-48 skeleton-block rounded" />

            {/* Color swatches */}
            <div className="flex flex-col gap-2.5">
              <div className="h-4 w-16 skeleton-block rounded" />
              <div className="flex gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-9 h-9 skeleton-block rounded-full" />
                ))}
              </div>
            </div>

            {/* Size buttons */}
            <div className="flex flex-col gap-2.5">
              <div className="h-4 w-14 skeleton-block rounded" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-14 h-10 skeleton-block rounded-xl" />
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 mt-2">
              <div className="w-[120px] h-12 skeleton-block rounded-xl" />
              <div className="flex-1 h-12 skeleton-block rounded-xl" />
              <div className="w-12 h-12 skeleton-block rounded-xl" />
            </div>
          </div>
        </div>

        {/* Related products skeleton */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-40 skeleton-block rounded-xl" />
            <div className="h-5 w-24 skeleton-block rounded-md" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-elevated flex flex-col animate-pulse">
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
    </div>
  );
}
