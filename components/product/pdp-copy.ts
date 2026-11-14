/* ══════════════════════════════════════════════════════════════
   Product page copy — English and Modern Standard Arabic
   ──────────────────────────────────────────────────────────────
   Numbers use Western digits in both languages. Arabic counted
   nouns follow the number rules (1, 2, 3–10, 11+).
   ══════════════════════════════════════════════════════════════ */

import type { Locale } from "@/lib/types";

const num = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** Arabic counted noun: forms for 1, 2, 3–10 and 11+ (and 0 / 100s use the singular). */
function arCount(n: number, one: string, two: string, few: string, many: string, other = many): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${num(n)} ${few}`;
  if (mod100 >= 11 && mod100 <= 99) return `${num(n)} ${many}`;
  return `${num(n)} ${other}`;
}

function arDaysAfter(n: number): string {
  const mod100 = n % 100;
  return mod100 >= 3 && mod100 <= 10 ? "أيام" : "يومًا";
}

const en = {
  home: "Home",
  from: "From",
  colour: "Colour",
  sizeGuide: "Size guide",
  soldOut: "Sold out",
  soldOutShort: "sold out",
  selectSize: "Select a size",
  selectColour: "Select a colour",
  chooseColourFirst: "Please select a colour.",
  chooseSizeFirst: "Please select a size.",
  bagFull: "You already have all available pieces in your bag.",
  quantity: "Quantity",
  unavailable: "This combination isn’t available",
  onlyLeft: (n: number) => `Only ${num(n)} left`,
  inStock: "In stock",
  addToBag: "Add to bag",
  addedToBag: "Added to bag",
  viewBag: "View bag",
  addWishlist: "Add to wishlist",
  removeWishlist: "Remove from wishlist",
  deliverTo: "Deliver to",
  deliveryLine: (place: string, fee: string, min: number, max: number) =>
    `Delivery to ${place}: ${fee} · ${min}–${max} days`,
  freeDeliveryLine: (place: string, min: number, max: number) => `Free delivery to ${place} · ${min}–${max} days`,
  freeFrom: (amount: string) => `Free delivery on orders from ${amount}`,
  cod: "Cash on delivery available",
  freeReturns: (n: number) => `Free returns within ${num(n)} days`,
  description: "Description",
  details: "Details",
  care: "Care",
  deliveryReturns: "Delivery & returns",
  deliveryInfo: (min: number, max: number) => `Delivered in ${min}–${max} days to every governorate.`,
  deliveryFees: (fromFee: string, threshold: string | null) =>
    threshold ? `Delivery from ${fromFee}, free on orders from ${threshold}.` : `Delivery from ${fromFee}.`,
  codInfo: "Pay in cash when your order arrives, or pay online by card or wallet.",
  returnsInfo: (n: number) => `Return unworn items with their tags within ${num(n)} days of delivery.`,
  deliveryPage: "Delivery information",
  returnsPage: "Returns policy",
  reviewsCount: (n: number) => (n === 1 ? "1 review" : `${num(n)} reviews`),
  ratingOf: (v: string) => `${v} out of 5`,
  // Gallery
  productImages: "Product images",
  imageOf: (i: number, n: number) => `Image ${i} of ${n}`,
  enlarge: (i: number) => `Enlarge image ${i}`,
  prevImage: "Previous image",
  nextImage: "Next image",
  close: "Close",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  noImage: "No photo yet",
  // Size guide
  sizeGuideNote: "Body measurements. Fit can vary by style.",
  sizeGuideHighlight: "Sizes available for this item are highlighted.",
  howToMeasure: "How to measure",
  // Rails
  completeTheLook: "Complete the look",
  related: "You may also like",
  recentlyViewed: "Recently viewed",
  viewAll: "View all",
  previous: "Previous",
  next: "Next",
};

export type PdpCopy = typeof en;

const ar: PdpCopy = {
  home: "الرئيسية",
  from: "يبدأ من",
  colour: "اللون",
  sizeGuide: "دليل المقاسات",
  soldOut: "نفدت الكمية",
  soldOutShort: "نفد",
  selectSize: "اختر المقاس",
  selectColour: "اختر اللون",
  chooseColourFirst: "يرجى اختيار اللون.",
  chooseSizeFirst: "يرجى اختيار المقاس.",
  bagFull: "لديك بالفعل كل الكمية المتاحة من هذا المنتج في الحقيبة.",
  quantity: "الكمية",
  unavailable: "هذا الاختيار غير متوفر",
  onlyLeft: (n: number) => `لم يتبقَّ سوى ${arCount(n, "قطعة واحدة", "قطعتين", "قطع", "قطعة")}`,
  inStock: "متوفر",
  addToBag: "أضف إلى الحقيبة",
  addedToBag: "أُضيف إلى الحقيبة",
  viewBag: "عرض الحقيبة",
  addWishlist: "أضف إلى المفضلة",
  removeWishlist: "إزالة من المفضلة",
  deliverTo: "التوصيل إلى",
  deliveryLine: (place: string, fee: string, min: number, max: number) =>
    `التوصيل إلى ${place}: ${fee} · خلال ${min} إلى ${max} ${arDaysAfter(max)}`,
  freeDeliveryLine: (place: string, min: number, max: number) =>
    `توصيل مجاني إلى ${place} · خلال ${min} إلى ${max} ${arDaysAfter(max)}`,
  freeFrom: (amount: string) => `التوصيل مجاني للطلبات بقيمة ${amount} أو أكثر`,
  cod: "الدفع عند الاستلام متاح",
  freeReturns: (n: number) => `إرجاع مجاني خلال ${num(n)} ${arDaysAfter(n)}`,
  description: "الوصف",
  details: "التفاصيل",
  care: "العناية بالمنتج",
  deliveryReturns: "التوصيل والإرجاع",
  deliveryInfo: (min: number, max: number) => `التوصيل خلال ${min} إلى ${max} ${arDaysAfter(max)} إلى جميع المحافظات.`,
  deliveryFees: (fromFee: string, threshold: string | null) =>
    threshold
      ? `رسوم التوصيل تبدأ من ${fromFee}، والتوصيل مجاني للطلبات بقيمة ${threshold} أو أكثر.`
      : `رسوم التوصيل تبدأ من ${fromFee}.`,
  codInfo: "ادفع نقدًا عند استلام طلبك، أو ادفع إلكترونيًا بالبطاقة أو المحفظة.",
  returnsInfo: (n: number) =>
    `يمكنك إرجاع المنتجات غير المستخدمة بملصقاتها الأصلية خلال ${num(n)} ${arDaysAfter(n)} من الاستلام.`,
  deliveryPage: "معلومات التوصيل",
  returnsPage: "سياسة الإرجاع",
  reviewsCount: (n: number) => arCount(n, "تقييم واحد", "تقييمان", "تقييمات", "تقييمًا", "تقييم"),
  ratingOf: (v: string) => `${v} من 5`,
  productImages: "صور المنتج",
  imageOf: (i: number, n: number) => `الصورة ${i} من ${n}`,
  enlarge: (i: number) => `تكبير الصورة ${i}`,
  prevImage: "الصورة السابقة",
  nextImage: "الصورة التالية",
  close: "إغلاق",
  zoomIn: "تكبير",
  zoomOut: "تصغير",
  noImage: "لا توجد صورة بعد",
  sizeGuideNote: "قياسات الجسم بالسنتيمتر، وقد يختلف المقاس حسب التصميم.",
  sizeGuideHighlight: "المقاسات المتوفرة لهذا المنتج مميّزة في الجدول.",
  howToMeasure: "طريقة القياس",
  completeTheLook: "أكمل إطلالتك",
  related: "قد يعجبك أيضًا",
  recentlyViewed: "شاهدتها مؤخرًا",
  viewAll: "عرض الكل",
  previous: "السابق",
  next: "التالي",
};

export function pdpCopy(locale: Locale | string): PdpCopy {
  return locale === "ar" ? ar : en;
}

/* ── Reviews ─────────────────────────────────────────────────── */

const reviewsEn = {
  heading: "Reviews",
  basedOn: (n: number) => `Based on ${n === 1 ? "1 review" : `${num(n)} reviews`}`,
  starsRow: (stars: number, count: number) =>
    `${stars === 1 ? "1 star" : `${stars} stars`}: ${count === 1 ? "1 review" : `${num(count)} reviews`}`,
  none: "No reviews yet",
  noneBody: "Customers who receive this item can share what they think here.",
  write: "Write a review",
  edit: "Edit your review",
  signIn: "Sign in to write a review",
  onlyBuyers: "Only customers who have received this item can review it.",
  verified: "Verified purchase",
  showMore: "Show more reviews",
  pending: "Your review is waiting for moderation.",
  thanks: "Thanks — your review will appear after moderation.",
  updated: "Thanks — your updated review will appear after moderation.",
  formTitle: "Your review",
  yourRating: "Your rating",
  stars: ["Poor", "Fair", "Good", "Very good", "Excellent"],
  starLabel: (n: number) => (n === 1 ? "1 star" : `${n} stars`),
  title: "Title",
  optional: "optional",
  comment: "Your review",
  commentHint: "At least 10 characters.",
  submit: "Submit review",
  update: "Update review",
  cancel: "Cancel",
  done: "Close",
  errors: {
    rating: "Please choose a rating.",
    titleLong: "The title can be up to 120 characters.",
    commentShort: "Please write at least 10 characters.",
    commentLong: "Your review can be up to 2,000 characters.",
    signIn: "Please sign in to write a review.",
    notBuyer: "Only customers who have received this item can review it.",
    product: "This product is no longer available.",
    server: "We couldn’t save your review. Please try again.",
  },
  loadFailed: "Couldn’t load more reviews. Please try again.",
};

export type ReviewsCopy = typeof reviewsEn;

const reviewsAr: ReviewsCopy = {
  heading: "التقييمات",
  basedOn: (n: number) => `بناءً على ${arCount(n, "تقييم واحد", "تقييمين", "تقييمات", "تقييمًا", "تقييم")}`,
  starsRow: (stars: number, count: number) =>
    `${stars === 1 ? "نجمة واحدة" : stars === 2 ? "نجمتان" : `${stars} نجوم`}: ${arCount(count, "تقييم واحد", "تقييمان", "تقييمات", "تقييمًا", "تقييم")}`,
  none: "لا توجد تقييمات بعد",
  noneBody: "يمكن للعملاء الذين يستلمون هذا المنتج مشاركة آرائهم هنا.",
  write: "اكتب تقييمًا",
  edit: "عدّل تقييمك",
  signIn: "سجّل الدخول لكتابة تقييم",
  onlyBuyers: "يمكن فقط للعملاء الذين استلموا هذا المنتج تقييمه.",
  verified: "عملية شراء موثّقة",
  showMore: "عرض المزيد من التقييمات",
  pending: "تقييمك بانتظار المراجعة.",
  thanks: "شكرًا لك، سيظهر تقييمك بعد مراجعته.",
  updated: "شكرًا لك، سيظهر تقييمك المعدّل بعد مراجعته.",
  formTitle: "تقييمك",
  yourRating: "تقييمك للمنتج",
  stars: ["ضعيف", "مقبول", "جيد", "جيد جدًا", "ممتاز"],
  starLabel: (n: number) => (n === 1 ? "نجمة واحدة" : n === 2 ? "نجمتان" : `${n} نجوم`),
  title: "العنوان",
  optional: "اختياري",
  comment: "رأيك في المنتج",
  commentHint: "10 أحرف على الأقل.",
  submit: "أرسل التقييم",
  update: "حدّث التقييم",
  cancel: "إلغاء",
  done: "إغلاق",
  errors: {
    rating: "يرجى اختيار التقييم.",
    titleLong: "يمكن أن يصل العنوان إلى 120 حرفًا.",
    commentShort: "يرجى كتابة 10 أحرف على الأقل.",
    commentLong: "يمكن أن يصل التقييم إلى 2000 حرف.",
    signIn: "يرجى تسجيل الدخول لكتابة تقييم.",
    notBuyer: "يمكن فقط للعملاء الذين استلموا هذا المنتج تقييمه.",
    product: "هذا المنتج لم يعد متوفرًا.",
    server: "تعذّر حفظ تقييمك. يرجى المحاولة مرة أخرى.",
  },
  loadFailed: "تعذّر تحميل المزيد من التقييمات. يرجى المحاولة مرة أخرى.",
};

export function reviewsCopy(locale: Locale | string): ReviewsCopy {
  return locale === "ar" ? reviewsAr : reviewsEn;
}

/** Review dates: "12 Nov 2026" / "12 نوفمبر 2026", Western digits. */
export function formatReviewDate(iso: string, locale: Locale | string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Cairo",
  }).format(d);
}
