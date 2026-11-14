/* ══════════════════════════════════════════════════════════════
   SEO copy — titles and descriptions per language
   ──────────────────────────────────────────────────────────────
   Arabic is Modern Standard Arabic. Keep descriptions under
   ~160 characters so search results don't cut them off.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

export interface SeoCopy {
  siteName: string;
  /** Short line used with the store name (home h1, OG image alt). */
  tagline: string;
  homeTitle: string;
  homeDescription: string;
  shopTitle: string;
  shopDescription: string;
  newArrivalsTitle: string;
  searchTitle: (query: string) => string;
  categoryDescription: (name: string) => string;
  productDescription: (name: string, price: string) => string;
  pageSuffix: (page: number) => string;
  home: string;
  shop: string;
}

export const SEO_COPY: Record<Locale, SeoCopy> = {
  en: {
    siteName: "ShiftSouq",
    tagline: "Menswear, kids fashion, sneakers and accessories in Egypt",
    homeTitle: "ShiftSouq — Menswear, Kids Fashion, Sneakers & Accessories in Egypt",
    homeDescription:
      "Shop menswear, kids fashion, sneakers and accessories at ShiftSouq. Prices in EGP, cash on delivery and delivery across Egypt.",
    shopTitle: "Shop All Products",
    shopDescription:
      "Browse every product at ShiftSouq — menswear, kids fashion, sneakers and accessories with prices in EGP and delivery across Egypt.",
    newArrivalsTitle: "New Arrivals",
    searchTitle: (q) => `Search results for “${q}”`,
    categoryDescription: (name) =>
      `Shop ${name} at ShiftSouq. Prices in EGP, cash on delivery and delivery across Egypt.`,
    productDescription: (name, price) =>
      `Buy ${name} for ${price} at ShiftSouq. Cash on delivery and delivery across Egypt.`,
    pageSuffix: (page) => `Page ${page}`,
    home: "Home",
    shop: "Shop",
  },
  ar: {
    siteName: "شيفت سوق",
    tagline: "أزياء رجالية وملابس أطفال وأحذية رياضية وإكسسوارات في مصر",
    homeTitle: "شيفت سوق — أزياء رجالية وملابس أطفال وأحذية رياضية وإكسسوارات في مصر",
    homeDescription:
      "تسوّق الأزياء الرجالية وملابس الأطفال والأحذية الرياضية والإكسسوارات من شيفت سوق، بأسعار بالجنيه المصري مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.",
    shopTitle: "جميع المنتجات",
    shopDescription:
      "تصفّح جميع منتجات شيفت سوق من الأزياء الرجالية وملابس الأطفال والأحذية الرياضية والإكسسوارات، بأسعار بالجنيه المصري مع التوصيل إلى جميع أنحاء مصر.",
    newArrivalsTitle: "وصل حديثاً",
    searchTitle: (q) => `نتائج البحث عن «${q}»`,
    categoryDescription: (name) =>
      `تسوّق ${name} من شيفت سوق، بأسعار بالجنيه المصري مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.`,
    productDescription: (name, price) =>
      `اشترِ ${name} بسعر ${price} من شيفت سوق، مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.`,
    pageSuffix: (page) => `الصفحة ${page}`,
    home: "الرئيسية",
    shop: "المتجر",
  },
};
