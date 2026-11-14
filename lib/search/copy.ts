/* ══════════════════════════════════════════════════════════════
   Discovery copy — listings, filters and search (en / ar)
   ──────────────────────────────────────────────────────────────
   Arabic is Modern Standard Arabic. Numbers use Western digits
   in both languages, like prices.
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function arPlural(n: number, forms: { zero: string; one: string; two: string; few: string; many: string; other: string }) {
  const rule = new Intl.PluralRules("ar").select(n) as keyof typeof forms;
  return (forms[rule] ?? forms.other).replace("{n}", fmt(n));
}

export const DISCOVERY_COPY = {
  en: {
    home: "Home",
    shop: "Shop",
    allProducts: "All products",
    newArrivals: "New arrivals",
    collections: "Collections",
    collection: "Collection",
    search: "Search",
    resultsFor: (q: string) => `Results for “${q}”`,
    productCount: (n: number) => (n === 1 ? "1 product" : `${fmt(n)} products`),
    pieces: (n: number) => (n === 1 ? "1 piece" : `${fmt(n)} pieces`),
    subcategories: "Subcategories",
    all: "All",
    // toolbar
    filters: "Filters",
    sortBy: "Sort by",
    clearAll: "Clear all",
    removeFilter: (label: string) => `Remove filter: ${label}`,
    activeFilters: "Active filters",
    gridView: "Grid density",
    twoPerRow: "Two per row",
    fourPerRow: "Four per row",
    // drawer
    category: "Category",
    size: "Size",
    colour: "Colour",
    price: "Price",
    availability: "Availability",
    inStockOnly: "In stock only",
    onSale: "On sale",
    newOnly: "New arrivals",
    priceFrom: "Min",
    priceTo: "Max",
    priceUnder: (v: string) => `Under ${v}`,
    priceOver: (v: string) => `${v} and above`,
    priceRange: (a: string, b: string) => `${a} – ${b}`,
    priceApply: "Apply price",
    show: (n: number) => (n === 0 ? "No products" : n === 1 ? "Show 1 product" : `Show ${fmt(n)} products`),
    clear: "Clear",
    updating: "Updating…",
    countLabel: (n: number) => (n === 1 ? "1 product" : `${fmt(n)} products`),
    // grid
    loadMore: "Load more",
    loading: "Loading…",
    seen: (a: number, total: number) => `Showing ${fmt(a)} of ${fmt(total)}`,
    showPrevious: "Show previous products",
    pages: "Pages",
    page: (n: number) => `Page ${n}`,
    previousPage: "Previous page",
    nextPage: "Next page",
    products: "Products",
    loadError: "Couldn't load more products. Try again.",
    // empty
    noResultsTitle: (q: string) => `Nothing found for “${q}”`,
    noResultsBody: "Check the spelling, try fewer words or a more general term.",
    noMatchTitle: "Nothing matches these filters",
    noMatchBody: "Remove a filter or clear them all to see more.",
    emptyTitle: "Nothing here yet",
    emptyBody: "New pieces are on the way. Meanwhile, take a look around the shop.",
    popularCategories: "Popular categories",
    browseAll: "Browse all products",
    // search panel
    searchPlaceholder: "Search products and categories",
    searchLabel: "Search the store",
    recentSearches: "Recent searches",
    clearRecent: "Clear",
    trending: "Best sellers",
    categories: "Categories",
    viewAll: (n: number) => (n === 1 ? "See the result" : `See all ${fmt(n)} results`),
    noMatches: (q: string) => `No products match “${q}”`,
    searching: "Searching…",
    closeSearch: "Close search",
    submitSearch: "Search",
    clearSearch: "Clear",
    inCategory: (name: string) => `in ${name}`,
    from: "From",
    // collections
    collectionsIntro: "Edits put together around a mood, a season or a way of dressing.",
    collectionsEmptyTitle: "No collections yet",
    collectionsEmptyBody: "Collections will appear here once they are published.",
    explore: "Explore",
  },
  ar: {
    home: "الرئيسية",
    shop: "المتجر",
    allProducts: "جميع المنتجات",
    newArrivals: "وصل حديثًا",
    collections: "التشكيلات",
    collection: "تشكيلة",
    search: "البحث",
    resultsFor: (q: string) => `نتائج البحث عن «${q}»`,
    productCount: (n: number) =>
      arPlural(n, { zero: "لا توجد منتجات", one: "منتج واحد", two: "منتجان", few: "{n} منتجات", many: "{n} منتجًا", other: "{n} منتج" }),
    pieces: (n: number) =>
      arPlural(n, { zero: "لا توجد قطع", one: "قطعة واحدة", two: "قطعتان", few: "{n} قطع", many: "{n} قطعة", other: "{n} قطعة" }),
    subcategories: "الفئات الفرعية",
    all: "الكل",
    filters: "التصفية",
    sortBy: "الترتيب حسب",
    clearAll: "مسح الكل",
    removeFilter: (label: string) => `إزالة عامل التصفية: ${label}`,
    activeFilters: "عوامل التصفية المختارة",
    gridView: "كثافة العرض",
    twoPerRow: "منتجان في كل صف",
    fourPerRow: "أربعة منتجات في كل صف",
    category: "الفئة",
    size: "المقاس",
    colour: "اللون",
    price: "السعر",
    availability: "التوفر",
    inStockOnly: "المتوفر فقط",
    onSale: "المنتجات المخفّضة",
    newOnly: "وصل حديثًا",
    priceFrom: "من",
    priceTo: "إلى",
    priceUnder: (v: string) => `أقل من ${v}`,
    priceOver: (v: string) => `${v} فأكثر`,
    priceRange: (a: string, b: string) => `${a} – ${b}`,
    priceApply: "تطبيق السعر",
    show: (n: number) =>
      n === 0
        ? "لا توجد منتجات"
        : `عرض ${arPlural(n, { zero: "", one: "منتج واحد", two: "منتجين", few: "{n} منتجات", many: "{n} منتجًا", other: "{n} منتج" })}`,
    clear: "مسح",
    updating: "جارٍ التحديث…",
    countLabel: (n: number) =>
      arPlural(n, { zero: "لا توجد منتجات", one: "منتج واحد", two: "منتجان", few: "{n} منتجات", many: "{n} منتجًا", other: "{n} منتج" }),
    loadMore: "عرض المزيد",
    loading: "جارٍ التحميل…",
    seen: (a: number, total: number) => `تُعرض ${fmt(a)} من ${fmt(total)}`,
    showPrevious: "عرض المنتجات السابقة",
    pages: "الصفحات",
    page: (n: number) => `الصفحة ${n}`,
    previousPage: "الصفحة السابقة",
    nextPage: "الصفحة التالية",
    products: "المنتجات",
    loadError: "تعذّر تحميل المزيد من المنتجات. حاول مرة أخرى.",
    noResultsTitle: (q: string) => `لم نعثر على نتائج لـ«${q}»`,
    noResultsBody: "تأكد من الإملاء، أو جرّب كلمات أقل أو كلمة أعم.",
    noMatchTitle: "لا توجد منتجات تطابق عوامل التصفية",
    noMatchBody: "أزل أحد عوامل التصفية أو امسحها كلها لعرض المزيد.",
    emptyTitle: "لا توجد منتجات هنا بعد",
    emptyBody: "منتجات جديدة في الطريق، وإلى ذلك الحين تصفّح بقية المتجر.",
    popularCategories: "فئات رائجة",
    browseAll: "تصفّح جميع المنتجات",
    searchPlaceholder: "ابحث عن منتج أو فئة",
    searchLabel: "البحث في المتجر",
    recentSearches: "عمليات البحث الأخيرة",
    clearRecent: "مسح",
    trending: "الأكثر مبيعًا",
    categories: "الفئات",
    viewAll: (n: number) => (n === 1 ? "عرض النتيجة" : `عرض كل النتائج (${fmt(n)})`),
    noMatches: (q: string) => `لا توجد منتجات تطابق «${q}»`,
    searching: "جارٍ البحث…",
    closeSearch: "إغلاق البحث",
    submitSearch: "بحث",
    clearSearch: "مسح",
    inCategory: (name: string) => `في ${name}`,
    from: "من",
    collectionsIntro: "مختارات منسّقة حول مزاج أو موسم أو أسلوب في اللباس.",
    collectionsEmptyTitle: "لا توجد تشكيلات بعد",
    collectionsEmptyBody: "ستظهر التشكيلات هنا فور نشرها.",
    explore: "استكشف",
  },
} satisfies Record<Locale, Record<string, unknown>>;

export type DiscoveryCopy = (typeof DISCOVERY_COPY)["en"];

export function discoveryCopy(locale: Locale): DiscoveryCopy {
  return DISCOVERY_COPY[locale] as DiscoveryCopy;
}
