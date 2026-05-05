/* ══════════════════════════════════════════════════════════════
   Checkout Page — Loading Skeleton
   Shown instantly while checkout form and data load.
   ══════════════════════════════════════════════════════════════ */

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Title skeleton */}
        <div className="h-9 w-36 skeleton-block rounded-xl mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          {/* Left: Form fields */}
          <div className="space-y-6">
            {/* Contact section */}
            <div className="card-elevated p-6 rounded-xl space-y-4">
              <div className="h-6 w-24 skeleton-block rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-11 skeleton-block rounded-lg" />
                <div className="h-11 skeleton-block rounded-lg" />
              </div>
              <div className="h-11 skeleton-block rounded-lg" />
              <div className="h-11 skeleton-block rounded-lg" />
            </div>

            {/* Address section */}
            <div className="card-elevated p-6 rounded-xl space-y-4">
              <div className="h-6 w-28 skeleton-block rounded" />
              <div className="h-11 skeleton-block rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-11 skeleton-block rounded-lg" />
                <div className="h-11 skeleton-block rounded-lg" />
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="card-elevated p-6 rounded-xl h-fit space-y-4">
            <div className="h-6 w-32 skeleton-block rounded" />
            <div className="h-px skeleton-block" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-16 h-16 skeleton-block rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 skeleton-block rounded" />
                  <div className="h-3 w-1/3 skeleton-block rounded" />
                </div>
                <div className="h-5 w-16 skeleton-block rounded" />
              </div>
            ))}
            <div className="h-px skeleton-block" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-20 skeleton-block rounded" />
                <div className="h-4 w-16 skeleton-block rounded" />
              </div>
            ))}
            <div className="h-12 skeleton-block rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
