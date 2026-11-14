/* Order tracking copy — English and Modern Standard Arabic. */

const en = {
  title: "Track your order",
  intro: "Enter your order number and the email you used at checkout.",
  orderNumber: "Order number",
  orderPlaceholder: "SS-20261114-1A2B3C",
  orderHint: "You'll find it on your receipt.",
  email: "Email",
  submit: "Track order",
  notFound: "We couldn't find an order with these details. Check the order number and the email, then try again.",
  rateLimited: "Too many attempts. Please wait 15 minutes and try again.",
  invalid: "Enter your order number and a valid email address.",
  another: "Track another order",
  status: "Status",
  placed: "Placed on",
  items: "Items",
  deliveryTo: "Delivering to",
  payment: "Payment",
  total: "Total",
  subtotal: "Subtotal",
  discount: "Discount",
  delivery: "Delivery",
  free: "Free",
  qty: (n: number) => `Qty ${n}`,
  haveAccount: "Ordered with an account?",
  signIn: "Sign in to see all your orders",
  help: "Need help with an order?",
  contact: "Contact us",
} as const;

type Copy = { [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string ? (...args: A) => string : string };

const ar: Copy = {
  title: "تتبّع طلبك",
  intro: "أدخل رقم الطلب والبريد الإلكتروني الذي استخدمته عند إتمام الطلب.",
  orderNumber: "رقم الطلب",
  orderPlaceholder: "SS-20261114-1A2B3C",
  orderHint: "تجده في إيصال الطلب.",
  email: "البريد الإلكتروني",
  submit: "تتبّع الطلب",
  notFound: "لم نعثر على طلب بهذه البيانات. تحقّق من رقم الطلب والبريد الإلكتروني ثم أعد المحاولة.",
  rateLimited: "محاولات كثيرة. يرجى الانتظار 15 دقيقة ثم المحاولة مرة أخرى.",
  invalid: "أدخل رقم الطلب وبريدًا إلكترونيًا صحيحًا.",
  another: "تتبّع طلبًا آخر",
  status: "الحالة",
  placed: "تاريخ الطلب",
  items: "القطع",
  deliveryTo: "التوصيل إلى",
  payment: "الدفع",
  total: "الإجمالي",
  subtotal: "المجموع الفرعي",
  discount: "الخصم",
  delivery: "التوصيل",
  free: "مجاني",
  qty: (n) => `الكمية ${n}`,
  haveAccount: "طلبت من خلال حسابك؟",
  signIn: "سجّل الدخول لعرض جميع طلباتك",
  help: "تحتاج إلى مساعدة بخصوص طلب؟",
  contact: "تواصل معنا",
};

export function trackCopy(locale: string): Copy {
  return locale === "ar" ? ar : (en as Copy);
}
