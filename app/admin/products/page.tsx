/* ══════════════════════════════════════════════════════════════
   Admin Products Management — /admin/products
   ──────────────────────────────────────────────────────────────
   Premium data table to view all inventory with pagination,
   hover effects, and modern color-coded badges.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getAllProducts } from "@/lib/dal/admin";
import { APP_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { createServerClient } from "@/lib/supabase/server";
import { ProductsClient } from "./ProductsClient";

export const metadata: Metadata = {
  title: `Products | ${APP_NAME} Admin`,
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;
  const pageSize = 10;
  const search = sp.search;
  const status = sp.status;
  
  const { products, totalPages, count } = await getAllProducts({ page: currentPage, pageSize, search, status });

  const supabase = await createServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_en, name_ar")
    .order("name_en");

  return (
    <ProductsClient 
      products={products}
      categories={categories || []}
      count={count}
      totalPages={totalPages}
      currentPage={currentPage}
      dict={dict}
      locale={locale}
    />
  );
}

