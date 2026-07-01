/* ══════════════════════════════════════════════════════════════
   Admin Orders Management — /admin/orders
   ──────────────────────────────────────────────────────────────
   Premium data table to view all customer orders with pagination,
   hover effects, and modern color-coded badges.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getAllOrders } from "@/lib/dal/admin";
import { getAllOrdersForExport } from "@/lib/actions/admin";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Download } from "lucide-react";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { AdminFilterDropdown } from "../components/AdminFilterDropdown";
import { AdminPagination } from "../components/AdminPagination";
import { OrderActionsDropdown } from "../components/OrderActionsDropdown";

export const metadata: Metadata = {
  title: `Orders | ${APP_NAME} Admin`,
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);
  const isRTL = locale === "ar";

  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;
  const pageSize = 10;
  const search = sp.search;
  const status = sp.status;
  
  const { orders, totalPages, count } = await getAllOrders({ page: currentPage, pageSize, search, status });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
            {dict.admin?.orders?.title || "Orders"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            {(dict.admin?.orders?.description || "Manage your store's orders ({count} total).").replace("{count}", count.toString())}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <AdminFilterDropdown 
            options={[
              { label: dict.admin?.orders?.pending || "Pending", value: "pending" },
              { label: dict.admin?.orders?.paid || "Paid", value: "paid" },
              { label: dict.admin?.orders?.shipped || "Shipped", value: "shipped" },
              { label: dict.admin?.orders?.delivered || "Delivered", value: "delivered" },
              { label: dict.admin?.orders?.cancelled || "Cancelled", value: "cancelled" }
            ]}
            defaultLabel={dict.admin?.orders?.allOrders || "All Statuses"}
          />
          <ExportCsvButton 
            data={orders} 
            fetchData={getAllOrdersForExport}
            filename="orders" 
            label={dict.admin?.orders?.exportCsv || "Export CSV"} 
          />
        </div>
      </div>

      {/* ── Filters & Search Bar ───────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-center gap-2">
         <AdminSearchInput placeholder={dict.admin?.orders?.searchPlaceholder || "Search orders by customer or ID..."} />
      </div>

      {/* ── Data Table ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm">
        {orders.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-5 ring-8 ring-zinc-50/50 dark:ring-zinc-800/20">
               <Search size={28} className="text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">{dict.admin?.orders?.noOrdersFound || "No orders found"}</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">{dict.admin?.orders?.noOrdersDesc || "Try adjusting your search or filters to find what you're looking for."}</p>
          </div>
        ) : (
          <div className="">
            <table className={`w-full min-w-[900px] text-sm ${isRTL ? 'text-right' : 'text-left'} whitespace-nowrap`}>
              <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                <tr>
                  <th className="px-6 py-4">{dict.admin?.orders?.orderId || "Order ID"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.customer || "Customer"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.date || "Date"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.status || "Status"}</th>
                  <th className="px-6 py-4">{dict.admin?.orders?.payment || "Payment"}</th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>{dict.admin?.orders?.total || "Total"}</th>
                  <th className="px-6 py-4 text-center">{dict.admin?.orders?.actions || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {orders.map((order) => {
                  // Status Badge Colors
                  let badgeClass = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm";
                  if (order.status === "delivered") badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm";
                  if (order.status === "processing") badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 backdrop-blur-sm";
                  if (order.status === "cancelled") badgeClass = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 backdrop-blur-sm";
                  if (order.status === "pending") badgeClass = "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 backdrop-blur-sm";

                  // Match translation status key or fallback
                  const statusKey = "status" + order.status.charAt(0).toUpperCase() + order.status.slice(1);
                  const displayStatus = dict.orders?.[statusKey as keyof typeof dict.orders] || order.status;

                  // Dynamic Avatar Colors
                  const avatarColors = [
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
                    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
                    "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
                    "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
                  ];
                  const initial = (order.user?.full_name?.[0] || order.shipping_name?.[0] || "G").toUpperCase();
                  const colorIndex = initial.charCodeAt(0) % avatarColors.length;
                  const avatarColorClass = avatarColors[colorIndex];

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                          {order.order_number || `#${order.id.split("-")[0]}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColorClass}`}>
                             {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">
                              {order.user?.full_name || order.shipping_name || dict.admin?.orders?.guestUser || "Guest User"}
                            </div>
                            <div className="text-zinc-500 text-xs mt-0.5">
                              {order.shipping_email || dict.admin?.orders?.noEmail || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                        {new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          order.payment_status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm" : 
                          order.payment_status === "failed" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 backdrop-blur-sm" : 
                          order.payment_status === "refunded" ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 backdrop-blur-sm" : 
                          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm"
                        }`}>
                          {order.payment_status || "unpaid"}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {Number(order.total || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-zinc-500 text-xs font-medium ${isRTL ? 'mr-1' : 'ml-1'}`}>
                          {dict.common?.currency || "EGP"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <OrderActionsDropdown
                          orderId={order.id}
                          currentStatus={order.status}
                          currentPaymentStatus={order.payment_status || "unpaid"}
                          locale={locale}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AdminPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  );
}
