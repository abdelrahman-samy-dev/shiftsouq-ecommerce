/* ══════════════════════════════════════════════════════════════
   Admin Dashboard Overview — /admin
   ──────────────────────────────────────────────────────────────
   Premium dashboard overview with beautifully styled grid cards
   and a modern recent orders table.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { DollarSign, ShoppingBag, Package, Users, ArrowUpRight, TrendingUp } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { ExportCsvButton } from "./components/ExportCsvButton";
import { getAdminDashboardStats } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: `Dashboard | ${APP_NAME} Admin`,
};

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);
  const isRTL = locale === "ar";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
            {dict.admin?.overview?.title || "Overview"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            {dict.admin?.overview?.description || "Here's what's happening with your store today."}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <ExportCsvButton 
             data={stats.recentOrders} 
             filename="recent-orders" 
             label={dict.admin?.overview?.exportData || "Export Data"} 
           />
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Revenue */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{dict.admin?.stats?.totalRevenue || "Total Revenue"}</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <DollarSign size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                <span className={`text-xl font-medium text-zinc-400 ${isRTL ? 'ml-1' : 'mr-1'}`}>
                  {dict.common?.currency || "EGP"}
                </span>
                {stats.totalRevenue.toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
              <TrendingUp size={12} />
              +12.5%
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{dict.admin?.stats?.totalOrders || "Total Orders"}</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {stats.totalOrders}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
              <TrendingUp size={12} />
              +8.2%
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{dict.admin?.stats?.totalProducts || "Total Products"}</h3>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Package size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {stats.totalProducts}
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{dict.admin?.stats?.totalCustomers || "Registered Users"}</h3>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {stats.totalUsers}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
              <TrendingUp size={12} />
              +2.4%
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{dict.admin?.recentOrders || "Recent Orders"}</h2>
          <Link 
            href="/admin/orders" 
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            {dict.admin?.viewAllOrders || "View all"} <ArrowUpRight size={14} className={isRTL ? "-scale-x-100" : ""} />
          </Link>
        </div>
        
        {stats.recentOrders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-5 ring-8 ring-zinc-50/50 dark:ring-zinc-800/20">
               <ShoppingBag size={28} className="text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">{dict.admin?.overview?.noOrdersYet || "No orders yet"}</h3>
            <p className="text-zinc-500 text-sm">{dict.admin?.overview?.noOrdersYetDesc || "When customers place orders, they will appear here."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${isRTL ? 'text-right' : 'text-left'} whitespace-nowrap`}>
              <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                <tr>
                  <th className="px-6 py-4">{dict.admin?.orders?.orderId || "Order ID"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.customer || "Customer"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.date || "Date"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.status || "Status"}</th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>{dict.admin?.orders?.total || "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {stats.recentOrders.map((order) => {
                  let badgeClass = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm";
                  if (order.status === "delivered") badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm";
                  if (order.status === "processing") badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 backdrop-blur-sm";
                  if (order.status === "cancelled") badgeClass = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 backdrop-blur-sm";
                  if (order.status === "pending") badgeClass = "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 backdrop-blur-sm";

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {order.order_number || `#${order.id.split("-")[0]}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {order.user?.full_name || order.shipping_name || "Guest User"}
                        </div>
                        <div className="text-zinc-500 text-xs mt-0.5">
                          {order.shipping_email || dict.admin?.orders?.noEmail || "No email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                        {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          {dict.orders?.[("status" + order.status.charAt(0).toUpperCase() + order.status.slice(1)) as keyof typeof dict.orders] || order.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'} font-bold text-zinc-900 dark:text-white`}>
                        <span className={`font-medium text-zinc-500 text-xs ${isRTL ? 'ml-1' : 'mr-1'}`}>{dict.common?.currency || "EGP"}</span>
                        {Number(order.total || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
