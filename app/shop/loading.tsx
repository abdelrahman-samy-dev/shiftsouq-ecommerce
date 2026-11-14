/* ══════════════════════════════════════════════════════════════
   Shop Page — Loading Skeleton
   Matches the new sidebar + grid layout architecture.
   Shown instantly while data is being fetched on the server.
   ══════════════════════════════════════════════════════════════ */

export default function ShopLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-12 skeleton-block rounded-md" />
          <div className="h-4 w-3 skeleton-block rounded-sm" />
          <div className="h-4 w-16 skeleton-block rounded-md" />
        </div>

        {/* ── Shop Layout ─────────────────────────────────── */}
        <div className="shop-layout">

          {/* ── Sidebar Skeleton ──────────────────────────── */}
          <div className="shop-sidebar">
            {/* Category section */}
            <div className="py-5">
              <div className="h-4 w-16 skeleton-block rounded mb-4" />
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`cat-${i}`}
                    className="h-8 skeleton-block rounded-md"
                    style={{ width: `${60 + ((i * 37) % 30)}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="divider" />
            {/* Price section */}
            <div className="py-5">
              <div className="h-4 w-12 skeleton-block rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 skeleton-block rounded-md" />
                <div className="h-10 flex-1 skeleton-block rounded-md" />
                <div className="h-10 w-12 skeleton-block rounded-md" />
              </div>
            </div>
            <div className="divider" />
            {/* Size section */}
            <div className="py-5">
              <div className="h-4 w-12 skeleton-block rounded mb-4" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`size-${i}`} className="w-10 h-10 skeleton-block rounded-md" />
                ))}
              </div>
            </div>
          </div>

          {/* ── Content Skeleton ──────────────────────────── */}
          <div className="shop-content">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-7 w-40 skeleton-block rounded-xl mb-1.5" />
                <div className="h-3 w-28 skeleton-block rounded" />
              </div>
              <div className="h-11 w-36 skeleton-block rounded-xl" />
            </div>

            <div className="divider mb-6" />

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
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
    </div>
  );
}
