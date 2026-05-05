/* ══════════════════════════════════════════════════════════════
   Cart Page — Loading Skeleton
   Shown instantly while cart data is being hydrated.
   ══════════════════════════════════════════════════════════════ */

export default function CartLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Title skeleton */}
        <div className="h-9 w-32 skeleton-block rounded-xl mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          {/* Left: Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 card-elevated rounded-xl">
                <div className="w-24 h-24 skeleton-block rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 skeleton-block rounded" />
                  <div className="h-4 w-1/3 skeleton-block rounded" />
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-24 h-9 skeleton-block rounded-lg" />
                    <div className="w-16 h-5 skeleton-block rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Order summary */}
          <div className="card-elevated p-6 rounded-xl h-fit space-y-4">
            <div className="h-6 w-36 skeleton-block rounded" />
            <div className="h-px skeleton-block" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-20 skeleton-block rounded" />
                <div className="h-4 w-16 skeleton-block rounded" />
              </div>
            ))}
            <div className="h-px skeleton-block" />
            <div className="h-12 skeleton-block rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
