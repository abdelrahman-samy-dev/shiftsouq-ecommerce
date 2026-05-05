"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, PackageOpen, Eye, Edit, Trash2 } from "lucide-react";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { AdminFilterDropdown } from "../components/AdminFilterDropdown";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { AdminPagination } from "../components/AdminPagination";
import { ProductModal } from "../components/ProductModal";
import { DeleteProductDialog } from "../components/DeleteProductDialog";
import { getAllProductsForExport } from "@/lib/actions/admin";

export function ProductsClient({
  products,
  categories,
  count,
  totalPages,
  currentPage,
  dict,
  locale,
}: {
  products: any[];
  categories: any[];
  count: number;
  totalPages: number;
  currentPage: number;
  dict: any;
  locale: string;
}) {
  const isRTL = locale === "ar";
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const openAddModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const openDeleteDialog = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ── Page Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
              {dict.admin?.products?.title || "Products"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
              {(dict.admin?.products?.description || "Manage your store inventory ({count} total).").replace("{count}", count.toString())}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <AdminFilterDropdown 
              options={[
                { label: dict.admin?.products?.active || "Active", value: "active" },
                { label: dict.admin?.products?.draft || "Draft", value: "draft" }
              ]}
              defaultLabel={dict.admin?.products?.allProducts || "All Products"}
              className="w-full sm:w-auto"
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ExportCsvButton 
                data={products} 
                fetchData={getAllProductsForExport}
                filename="products" 
                label={dict.admin?.products?.exportCsv || "Export CSV"} 
                className="flex-1 sm:flex-none justify-center"
              />
              <button 
                onClick={openAddModal}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-b from-zinc-800 to-zinc-950 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-black rounded-lg text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:from-zinc-700 hover:to-zinc-900 dark:hover:from-white dark:hover:to-zinc-200 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} strokeWidth={3} className="shrink-0" />
                <span className="truncate">{dict.admin?.products?.addProduct || "Add Product"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Bar ───────────────────────────── */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-center gap-2">
           <AdminSearchInput placeholder={dict.admin?.products?.searchPlaceholder || "Search products by name..."} />
        </div>

        {/* ── Data Table ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
          {products.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-5 ring-8 ring-zinc-50/50 dark:ring-zinc-800/20">
               <PackageOpen size={28} className="text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">{dict.admin?.products?.noProductsFound || "No products found"}</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">{dict.admin?.products?.noProductsDesc || "Get started by adding your first product to the inventory."}</p>
            <button 
              onClick={openAddModal}
              className="mt-6 px-4 py-2 bg-gradient-to-b from-zinc-800 to-zinc-950 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-black rounded-lg text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:from-zinc-700 hover:to-zinc-900 dark:hover:from-white dark:hover:to-zinc-200 transition-all inline-flex items-center gap-2"
            >
                <Plus size={16} />
                {dict.admin?.products?.addProduct || "Add Product"}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${isRTL ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                  <tr>
                    <th className="px-6 py-4">{dict.admin?.products?.productName || "Product Name"}</th>
                    <th className="px-6 py-4">{dict.admin?.products?.category || "Category"}</th>
                    <th className="px-6 py-4">{dict.admin?.products?.price || "Price"}</th>
                    <th className="px-6 py-4">{dict.admin?.products?.status || "Status"}</th>
                    <th className="px-6 py-4 text-center">{dict.admin?.products?.actions || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                             {(product.product_images?.find((img: any) => img.is_primary)?.url || product.product_images?.[0]?.url) ? (
                                <Image 
                                  src={product.product_images.find((img: any) => img.is_primary)?.url || product.product_images[0].url} 
                                  alt={product.name_en}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                             ) : (
                               <PackageOpen size={18} className="text-zinc-400" />
                             )}
                           </div>
                           <div>
                              <div className="font-bold text-zinc-900 dark:text-white">
                                {locale === 'ar' ? product.name_ar : product.name_en}
                              </div>
                              <div className={`text-zinc-500 text-[11px] font-medium mt-0.5`} dir={locale === 'ar' ? 'ltr' : 'rtl'}>
                                {locale === 'ar' ? product.name_en : product.name_ar}
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {(locale === 'ar' ? product.category?.name_ar : product.category?.name_en) || dict.admin?.products?.uncategorized || "Uncategorized"}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {dict.common?.currency || "EGP"} {Number(product.base_price).toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {product.sale_price && (
                          <div className="text-xs font-semibold text-rose-500 line-through opacity-80 mt-0.5">
                            {dict.common?.currency || "EGP"} {Number(product.sale_price).toLocaleString(locale === 'ar' ? 'ar-EG' : undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {product.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm">
                              {dict.admin?.products?.active || "Active"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm">
                              {dict.admin?.products?.draft || "Draft"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            href={`/product/${product.slug}`}
                            target="_blank"
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title={dict.admin?.products?.preview || "Preview"}
                          >
                            <Eye size={18} />
                          </Link>
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title={dict.admin?.products?.edit || "Edit"}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => openDeleteDialog(product)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title={dict.admin?.products?.delete || "Delete"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AdminPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>

      {/* Modals (Outside of the animated/transform container) */}
      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        categories={categories}
        dict={dict}
        locale={locale}
      />
      
      <DeleteProductDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        product={selectedProduct}
        dict={dict}
      />
    </>
  );
}
