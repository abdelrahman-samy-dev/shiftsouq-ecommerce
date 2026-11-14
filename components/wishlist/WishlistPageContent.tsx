"use client";

/* ══════════════════════════════════════════════════════════════
   Wishlist — saved pieces as editorial product cards
   ──────────────────────────────────────────────────────────────
   The saved ids live in this browser; product data comes from the
   server (current prices and stock). Under each card: "Move to
   bag" (one option: straight into the bag; several: pick the size
   on the product page) and "Remove".
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ProductCard from "@/components/product/ProductCard";
import { ButtonLink, Skeleton } from "@/components/ds";
import { useHydrated } from "@/components/shared/useHydrated";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { useCartUi } from "@/lib/store/useCartUi";
import { fetchWishlistProducts } from "@/lib/actions/wishlist";
import { priceSummary, unitPrice } from "@/lib/seo/pricing";
import type { ListingProduct } from "@/lib/dal/products";

const COPY = {
  en: {
    count: (n: number) => (n === 1 ? "1 piece" : `${n} pieces`),
    moveToBag: "Move to bag",
    chooseSize: "Choose size",
    soldOut: "Sold out",
    remove: "Remove",
    removeItem: (name: string) => `Remove ${name} from your wishlist`,
    moved: "Moved to your bag",
    emptyTitle: "Your wishlist is empty",
    emptyBody: "Tap the heart on any piece to save it here for later.",
    browse: "Browse the shop",
    unavailableNote: "Some saved pieces are no longer available and were hidden.",
    loading: "Loading your wishlist",
  },
  ar: {
    count: (n: number) => (n === 1 ? "قطعة واحدة" : n === 2 ? "قطعتان" : n <= 10 ? `${n} قطع` : `${n} قطعة`),
    moveToBag: "نقل إلى الحقيبة",
    chooseSize: "اختر المقاس",
    soldOut: "نفدت الكمية",
    remove: "إزالة",
    removeItem: (name: string) => `إزالة ${name} من المفضلة`,
    moved: "نُقلت القطعة إلى الحقيبة",
    emptyTitle: "قائمة المفضلة فارغة",
    emptyBody: "اضغط على رمز القلب في أي قطعة لحفظها هنا لوقت لاحق.",
    browse: "تصفّح المتجر",
    unavailableNote: "بعض القطع المحفوظة لم تعد متاحة فأخفيناها.",
    loading: "جارٍ تحميل المفضلة",
  },
};

export function WishlistPageContent({ locale, showTitle }: { locale: string; showTitle: boolean }) {
  const lang = locale === "ar" ? "ar" : "en";
  const t = COPY[lang];
  const mounted = useHydrated();
  const productIds = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartUi((s) => s.openCart);

  const idsKey = productIds.join(",");
  const [fetched, setFetched] = useState<{ key: string; products: ListingProduct[] }>({ key: "", products: [] });
  const loading = mounted && idsKey !== "" && fetched.key !== idsKey;

  useEffect(() => {
    if (!mounted || idsKey === "") return;
    let cancelled = false;
    fetchWishlistProducts(idsKey.split(","))
      .then((data) => !cancelled && setFetched({ key: idsKey, products: data as ListingProduct[] }))
      .catch(() => !cancelled && setFetched({ key: idsKey, products: [] }));
    return () => {
      cancelled = true;
    };
  }, [mounted, idsKey]);

  if (!mounted || loading) {
    return (
      <div aria-busy="true" aria-label={t.loading} className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const products = idsKey === "" ? [] : fetched.products.filter((p) => productIds.includes(p.id));

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-dashed border-border-hover p-8 rounded-sm">
        <p className="text-[0.9375rem] text-text-primary">{t.emptyTitle}</p>
        <p className="text-sm text-text-secondary">{t.emptyBody}</p>
        <ButtonLink href="/shop" variant="secondary" className="mt-2">
          {t.browse}
        </ButtonLink>
      </div>
    );
  }

  function moveToBag(p: ListingProduct) {
    const v = p.variants[0];
    if (!v) return;
    addItem({
      productId: p.id,
      variantId: v.id,
      name_en: p.name_en,
      name_ar: p.name_ar,
      slug: p.slug,
      image: p.primary_image?.url ?? "",
      size: v.size,
      color_en: v.color_en,
      color_ar: v.color_ar,
      color_hex: v.color_hex,
      price: unitPrice(p, v),
      quantity: 1,
    });
    toggleWishlist(p.id);
    toast.success(t.moved);
    openCart();
  }

  const hidden = productIds.length - products.length;
  const action = "min-h-10 text-[0.8125rem] underline-offset-4 hover:underline";

  return (
    <div className="flex flex-col gap-6">
      {showTitle ? null : <p className="text-sm text-text-muted">{t.count(products.length)}</p>}
      {hidden > 0 ? <p className="text-[0.8125rem] text-text-muted">{t.unavailableNote}</p> : null}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5">
        {products.map((p) => {
          const name = lang === "ar" ? p.name_ar : p.name_en;
          const summary = priceSummary(p, p.variants);
          const inStock = summary.purchasable && summary.inStock;
          const single = p.variants.length === 1;
          return (
            <li key={p.id} className="flex flex-col gap-2">
              <ProductCard product={p} locale={locale} sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw" />
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                {!inStock ? (
                  <span className="text-[0.8125rem] text-text-muted">{t.soldOut}</span>
                ) : single ? (
                  <button type="button" onClick={() => moveToBag(p)} className={`${action} font-medium text-text-primary`}>
                    {t.moveToBag}
                  </button>
                ) : (
                  <Link href={`/product/${p.slug}`} className={`${action} font-medium text-text-primary`}>
                    {t.chooseSize}
                  </Link>
                )}
                <button type="button" onClick={() => toggleWishlist(p.id)} className={`${action} text-text-muted hover:text-text-primary`} aria-label={t.removeItem(name)}>
                  {t.remove}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
