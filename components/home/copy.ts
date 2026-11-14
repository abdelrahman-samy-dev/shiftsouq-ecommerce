/* Home page copy — English and Modern Standard Arabic. Numbers come from settings. */

import type { Locale } from "@/lib/types";

export function homeCopy(locale: Locale | string) {
  const ar = locale === "ar";
  return ar
    ? {
        shopNow: "تسوّق الآن",
        categoriesEyebrow: "الفئات",
        categoriesTitle: "تسوّق حسب الفئة",
        shopCategory: "تسوّق الآن",
        newEyebrow: "جديدنا",
        newTitle: "أحدث المنتجات",
        newAction: "تسوّق الجديد",
        bestEyebrow: "الأكثر طلبًا",
        bestTitle: "الأكثر مبيعًا",
        bestAction: "تسوّق الكل",
        collectionEyebrow: "مجموعة",
        collectionCta: "اكتشف المجموعة",
        pieces: (n: number) => (n === 1 ? "قطعة واحدة" : n === 2 ? "قطعتان" : n <= 10 ? `${n} قطع` : `${n} قطعة`),
        prev: "السابق",
        next: "التالي",
        valuesTitle: "لماذا تتسوّق معنا",
        freeDelivery: (amount: string) => `توصيل مجاني للطلبات من ${amount}`,
        delivery: "توصيل إلى جميع المحافظات",
        deliveryFrom: (amount: string) => `رسوم التوصيل تبدأ من ${amount}`,
        deliveryEta: (min: number, max: number) => `يصلك طلبك خلال ${min} إلى ${max} أيام عمل`,
        cod: "الدفع عند الاستلام",
        codBody: "ادفع نقدًا عند وصول طلبك إلى بابك",
        securePay: "دفع آمن",
        securePayBody: "بالبطاقات والمحافظ الإلكترونية",
        returns: (days: string) => `إرجاع سهل خلال ${days}`,
        returnsBody: "للقطع غير المستخدمة مع بطاقاتها الأصلية",
      }
    : {
        shopNow: "Shop now",
        categoriesEyebrow: "Categories",
        categoriesTitle: "Shop by category",
        shopCategory: "Shop now",
        newEyebrow: "Just in",
        newTitle: "New arrivals",
        newAction: "Shop new in",
        bestEyebrow: "Most loved",
        bestTitle: "Best sellers",
        bestAction: "Shop all",
        collectionEyebrow: "Collection",
        collectionCta: "Explore the collection",
        pieces: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`,
        prev: "Previous",
        next: "Next",
        valuesTitle: "Why shop with us",
        freeDelivery: (amount: string) => `Free delivery from ${amount}`,
        delivery: "Delivery across Egypt",
        deliveryFrom: (amount: string) => `Delivery from ${amount}`,
        deliveryEta: (min: number, max: number) => `Arrives in ${min}–${max} working days`,
        cod: "Cash on delivery",
        codBody: "Pay in cash when your order reaches your door",
        securePay: "Secure payment",
        securePayBody: "Cards and mobile wallets",
        returns: (days: string) => `Easy returns within ${days}`,
        returnsBody: "Unworn pieces with their original tags",
      };
}

export type HomeCopy = ReturnType<typeof homeCopy>;
