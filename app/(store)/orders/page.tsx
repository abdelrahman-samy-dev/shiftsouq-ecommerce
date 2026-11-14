/* ══════════════════════════════════════════════════════════════
   My orders — /orders (account area)
   The signed-in buyer's own orders, newest first, ten per page.
   Unpaid card / wallet orders are flagged ("Complete payment" on
   the order page). The data layer scopes every query to the
   buyer's profile; proxy.ts + requireAccountUser guard the page.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getMyOrders } from "@/lib/dal/orders";
import Pagination from "@/components/shared/Pagination";
import { ButtonLink } from "@/components/ds";
import { AccountShell } from "@/app/(store)/account/_components/AccountShell";
import { OrderCard } from "@/app/(store)/account/_components/OrderCard";
import { accountCopy } from "@/app/(store)/account/_components/copy";
import { requireAccountUser } from "@/app/(store)/account/_components/require-user";

const PAGE_SIZE = 10;

export async function generateMetadata(): Promise<Metadata> {
  return { title: accountCopy(await getLocale()).ordersTitle, robots: { index: false, follow: false } };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const lang = locale === "ar" ? "ar" : "en";
  const t = accountCopy(lang);
  const pageParam = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const user = await requireAccountUser(page > 1 ? `/orders?page=${page}` : "/orders");
  const { orders, count } = await getMyOrders(page, PAGE_SIZE);
  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <AccountShell locale={locale} user={user} active="orders" title={t.ordersTitle} intro={count ? t.ordersCount(count) : undefined}>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-border-hover p-8 rounded-sm">
          <p className="text-[0.9375rem] text-text-primary">{t.noOrders}</p>
          <p className="text-sm text-text-secondary">{t.noOrdersBody}</p>
          <ButtonLink href="/shop" variant="secondary" className="mt-2">
            {t.startShopping}
          </ButtonLink>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {orders.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} lang={lang} />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="mt-10">
              <Pagination currentPage={page} totalPages={totalPages} searchParams={{}} basePath="/orders" />
            </div>
          ) : null}
        </>
      )}
    </AccountShell>
  );
}
