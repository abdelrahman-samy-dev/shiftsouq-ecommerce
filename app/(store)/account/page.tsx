/* ══════════════════════════════════════════════════════════════
   Account overview — /account
   Greeting, the latest order with its status, and quick links.
   Signed-in buyers only (proxy.ts + requireAccountUser).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, KeyRound, MapPin, Package, User } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { getAccountOverview } from "@/lib/dal/account";
import { ButtonLink } from "@/components/ds";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { formatOrderDate } from "@/components/orders/order-copy";
import { noticeTone, panelTitle } from "@/components/checkout/ui";
import { cn } from "@/lib/utils";
import { AccountShell } from "./_components/AccountShell";
import { OrderCard } from "./_components/OrderCard";
import { accountCopy } from "./_components/copy";
import { requireAccountUser } from "./_components/require-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = accountCopy(await getLocale());
  return { title: t.account, robots: { index: false, follow: false } };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const [locale, { password }] = await Promise.all([getLocale(), searchParams]);
  const lang = locale === "ar" ? "ar" : "en";
  const t = accountCopy(lang);
  await requireAccountUser("/account");
  const overview = (await getAccountOverview())!;

  const links = [
    { href: "/orders", icon: Package, label: t.orders, hint: t.ordersCount(overview.orderCount) },
    { href: "/account/addresses", icon: MapPin, label: t.addresses, hint: t.addressesCount(overview.addressCount) },
    { href: "/wishlist", icon: Heart, label: t.wishlist, hint: t.wishlistHint },
    { href: "/profile", icon: User, label: t.profile, hint: t.profileHint },
    { href: "/account/security", icon: KeyRound, label: t.security, hint: t.securityHint },
  ];

  return (
    <AccountShell
      locale={locale}
      user={overview}
      active="overview"
      intro={t.memberSince(formatOrderDate(overview.memberSince, lang))}
    >
      {password === "updated" ? (
        <p role="status" className={cn("mb-10 border px-4 py-3 text-sm rounded-sm", noticeTone.success)}>
          {t.passwordUpdated}
        </p>
      ) : null}

      <section aria-labelledby="latest-order">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-order" className={panelTitle}>
            {t.lastOrder}
          </h2>
          {overview.orderCount > 1 ? (
            <Link href="/orders" className="text-sm underline underline-offset-4 decoration-border-hover hover:decoration-text-primary">
              {t.allOrders}
            </Link>
          ) : null}
        </div>
        {overview.lastOrder ? (
          <div className="mt-6 flex flex-col gap-6">
            <OrderCard order={overview.lastOrder} lang={lang} />
            <OrderTimeline status={overview.lastOrder.status} createdAt={overview.lastOrder.createdAt} lang={lang} className="px-1" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-start gap-4 border border-dashed border-border-hover p-8 rounded-sm">
            <p className="text-[0.9375rem] text-text-primary">{t.noOrders}</p>
            <p className="text-sm text-text-secondary">{t.noOrdersBody}</p>
            <ButtonLink href="/shop" variant="secondary">
              {t.startShopping}
            </ButtonLink>
          </div>
        )}
      </section>

      <section aria-labelledby="quick-links" className="mt-16">
        <h2 id="quick-links" className={panelTitle}>
          {t.quickLinks}
        </h2>
        <ul className="mt-6 grid border-s border-t border-border sm:grid-cols-2 xl:grid-cols-3">
          {links.map(({ href, icon: Icon, label, hint }) => (
            <li key={href} className="border-b border-e border-border">
              <Link href={href} className="group flex h-full items-start gap-4 p-6 transition-colors hover:bg-surface">
                <Icon className="mt-0.5 size-5 shrink-0 text-text-secondary" strokeWidth={1.25} aria-hidden="true" />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-[0.9375rem] text-text-primary">{label}</span>
                  <span className="text-[0.8125rem] text-text-muted">{hint}</span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AccountShell>
  );
}
