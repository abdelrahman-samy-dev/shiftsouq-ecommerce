/* ══════════════════════════════════════════════════════════════
   Admin Products Management — /admin/products
   ──────────────────────────────────────────────────────────────
   Inventory table with search, status filter, stock per product,
   create / edit / delete. `?edit=<id>` opens that product's form
   (used by the dashboard's low-stock list).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { clampPage, getAdminCategories, getAllProducts } from "@/lib/dal/admin";
import { APP_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { ProductsClient } from "./ProductsClient";

export const metadata: Metadata = {
  title: `Products | ${APP_NAME} Admin`,
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; edit?: string }>;
}) {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const currentPage = clampPage(sp.page);
  const [{ products, totalPages, count }, categories] = await Promise.all([
    getAllProducts({ page: currentPage, pageSize: 10, search: sp.search, status: sp.status }),
    getAdminCategories(),
  ]);

  return (
    <ProductsClient
      key={sp.edit ?? "list"}
      products={products}
      categories={categories}
      count={count}
      totalPages={totalPages}
      currentPage={currentPage}
      dict={dict}
      locale={locale}
      editId={typeof sp.edit === "string" ? sp.edit : null}
    />
  );
}
