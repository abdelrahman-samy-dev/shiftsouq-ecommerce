export default function HomeLoading() {
  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-zinc-50 dark:bg-[#000000]">
      {/* ── Hero Slider Skeleton ────────────────────────────── */}
      <div className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] bg-zinc-200 dark:bg-zinc-900 animate-pulse overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 lg:p-24 z-20 flex flex-col gap-4">
          <div className="h-12 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl w-3/4 max-w-2xl" />
          <div className="h-6 sm:h-8 bg-white/20 backdrop-blur-sm rounded-lg w-1/2 max-w-xl" />
          <div className="h-12 bg-white/30 backdrop-blur-md rounded-full w-40 mt-4" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col gap-16">
        {/* ── Category Section Skeleton ─────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-48 animate-pulse" />
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-24 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="h-64 sm:h-72 w-full bg-zinc-200 dark:bg-zinc-900 rounded-2xl animate-pulse" 
              />
            ))}
          </div>
        </section>

        {/* ── Products Section Skeleton ─────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-40 animate-pulse" />
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-24 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-200 dark:border-zinc-800/80 overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/5] bg-zinc-200 dark:bg-zinc-900" />
                <div className="p-4 flex flex-col flex-grow gap-3">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  <div className="mt-auto pt-2 flex gap-2">
                    <div className="w-11 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    <div className="flex-1 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
