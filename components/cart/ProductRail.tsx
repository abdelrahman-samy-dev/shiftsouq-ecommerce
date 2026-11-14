/* ══════════════════════════════════════════════════════════════
   ProductRail — "You may also like": a row of editorial product
   cards. Scroll-snap row on phones, four columns on desktop.
   Server component (the cards hydrate on their own).
   ══════════════════════════════════════════════════════════════ */

import ProductCard from "@/components/product/ProductCard";
import type { ListingProduct } from "@/lib/dal/products";
import { SectionHeader } from "@/components/ds";

interface ProductRailProps {
  title: string;
  products: ListingProduct[];
  locale: string;
  action?: { href: string; label: string };
}

export function ProductRail({ title, products, locale, action }: ProductRailProps) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="border-t border-border py-14 md:py-20">
      <div className="container-x">
        <SectionHeader title={title} action={action} />
        <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-x-3 overflow-x-auto px-5 md:-mx-8 md:gap-x-5 md:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {products.slice(0, 4).map((p) => (
            <li key={p.id} className="w-[44vw] shrink-0 snap-start md:w-[30vw] lg:w-auto">
              <ProductCard product={p} locale={locale} sizes="(max-width: 767px) 44vw, (max-width: 1023px) 30vw, 25vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
