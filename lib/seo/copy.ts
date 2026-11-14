/* ══════════════════════════════════════════════════════════════
   SEO copy — titles and descriptions per language
   ──────────────────────────────────────────────────────────────
   Arabic is Modern Standard Arabic. Keep descriptions under
   ~160 characters so search results don't cut them off.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";
import { brand } from "@/lib/brand/config";

const EN = brand.name.en;
const AR = brand.name.ar;

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
    siteName: EN,
    tagline: "Modern menswear: clothing, shoes and accessories in Egypt",
    homeTitle: `${EN} — Modern Menswear, Shoes & Accessories in Egypt`,
    homeDescription:
      `Modern menswear from ${EN}: clothing, shoes and accessories. Prices in EGP, cash on delivery and delivery across Egypt.`,
    shopTitle: "Shop All Products",
    shopDescription:
      `Browse every piece at ${EN}: menswear clothing, shoes and accessories, priced in EGP and delivered across Egypt.`,
    newArrivalsTitle: "New Arrivals",
    searchTitle: (q) => `Search results for “${q}”`,
    categoryDescription: (name) =>
      `Shop ${name} at ${EN}. Prices in EGP, cash on delivery and delivery across Egypt.`,
    productDescription: (name, price) =>
      `Buy ${name} for ${price} at ${EN}. Cash on delivery and delivery across Egypt.`,
    pageSuffix: (page) => `Page ${page}`,
    home: "Home",
    shop: "Shop",
  },
  ar: {
    siteName: AR,
    tagline: "أزياء رجالية عصرية: ملابس وأحذية وإكسسوارات في مصر",
    homeTitle: `${AR} — أزياء رجالية عصرية: ملابس وأحذية وإكسسوارات في مصر`,
    homeDescription:
      `أزياء رجالية عصرية من ${AR}: ملابس وأحذية وإكسسوارات بأسعار بالجنيه المصري، مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.`,
    shopTitle: "جميع المنتجات",
    shopDescription:
      `تصفّح جميع منتجات ${AR} من الملابس والأحذية والإكسسوارات الرجالية، بأسعار بالجنيه المصري مع التوصيل إلى جميع أنحاء مصر.`,
    newArrivalsTitle: "وصل حديثاً",
    searchTitle: (q) => `نتائج البحث عن «${q}»`,
    categoryDescription: (name) =>
      `تسوّق ${name} من ${AR}، بأسعار بالجنيه المصري مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.`,
    productDescription: (name, price) =>
      `اشترِ ${name} بسعر ${price} من ${AR}، مع الدفع عند الاستلام والتوصيل إلى جميع أنحاء مصر.`,
    pageSuffix: (page) => `الصفحة ${page}`,
    home: "الرئيسية",
    shop: "المتجر",
  },
};
