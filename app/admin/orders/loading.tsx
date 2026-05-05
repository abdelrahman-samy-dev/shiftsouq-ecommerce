export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Page Header Skeleton ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-32"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-64"></div>
        </div>
        
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        </div>
      </div>

      {/* ── Filters & Search Bar Skeleton ───────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-center gap-2 animate-pulse">
         <div className="relative w-full sm:w-96">
            <div className="h-10 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl w-full"></div>
         </div>
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-8 w-20 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg"></div>
            <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg"></div>
            <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg"></div>
         </div>
      </div>

      {/* ── Data Table Skeleton ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
              <tr>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4 flex justify-end"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-12 animate-pulse"></div></th>
                <th className="px-6 py-4 text-center"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mx-auto animate-pulse"></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-24"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20"></div>
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
