import { Package, ShoppingBag, Users, DollarSign } from "lucide-react";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page Header Skeleton ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-32"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-64"></div>
        </div>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-28"></div>
        </div>
      </div>

      {/* ── Stats Grid Skeleton ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24 animate-pulse"></div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"></div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20 animate-pulse"></div>
              <div className="h-6 bg-zinc-100 dark:bg-zinc-900 rounded-md w-14 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Orders Skeleton ──────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-32 animate-pulse"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-20 animate-pulse"></div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
              <tr>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16 animate-pulse"></div></th>
                <th className="px-6 py-4 flex justify-end"><div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-12 animate-pulse"></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-24"></div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
