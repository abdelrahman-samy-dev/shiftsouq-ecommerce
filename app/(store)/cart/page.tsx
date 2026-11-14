/* ══════════════════════════════════════════════════════════════
   Bag — /cart
   The bag itself lives in the browser (CartPageContent re-checks
   it with the server). This server page adds the store's delivery
   rates for the estimate, category links for an empty bag, and a
   "You may also like" rail of new arrivals.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { getProducts } from "@/lib/dal/products";
import { getNavCategories } from "@/lib/dal/categories";
import { getZoneEtas } from "@/lib/dal/orders";
import { ButtonLink } from "@/components/ds";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { ProductRail } from "@/components/cart/ProductRail";
import { cartCopy } from "@/components/cart/copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = cartCopy(await getLocale());
  return { title: t.title, robots: { index: false, follow: true } };
}

export default async function CartPage() {
  const [locale, settings, newest, categories, etaByZone] = await Promise.all([
    getLocale(),
    getStoreSettings(),
    getProducts({ sortBy: "newest" }, { page: 1, pageSize: 8 }),
    getNavCategories(),
    getZoneEtas(),
  ]);
  const t = cartCopy(locale);
  const ar = locale === "ar";

  const emptyExtras = (
    <div className="mt-6 flex w-full flex-col items-center gap-6">
      {categories.length ? (
        <nav aria-label={t.emptyCategories} className="flex flex-col items-center gap-3">
          <p className="t-eyebrow">{t.emptyCategories}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="inline-flex h-11 items-center border border-border px-5 text-sm text-text-primary transition-colors hover:border-text-primary rounded-sm"
                >
                  {ar ? c.name_ar : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <ButtonLink href="/shop?sort=newest" size="lg">
        {t.shopNew}
      </ButtonLink>
    </div>
  );

  return (
    <>
      <CartPageContent locale={locale} rates={settings.shipping} etaByZone={etaByZone} emptyExtras={emptyExtras} />
      <ProductRail title={t.alsoLike} products={newest.products} locale={locale} action={{ href: "/shop?sort=newest", label: t.viewAll }} />
    </>
  );
}
