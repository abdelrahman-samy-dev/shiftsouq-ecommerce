/* ══════════════════════════════════════════════════════════════
   Admin — UI text (English + Modern Standard Arabic)
   ──────────────────────────────────────────────────────────────
   Text for the admin screens and for the error keys returned by
   the admin server actions. The shell and operations screens
   (overview, customers, reviews, newsletter, settings, team,
   activity) live in ./i18n-ops.ts and are merged in here, so
   getAdminText(locale) returns everything.
   ══════════════════════════════════════════════════════════════ */

import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { PaymentMethod } from "./orders";
import { brand } from "@/lib/brand/config";
import { opsAr, opsEn, type OpsText } from "./i18n-ops";

const en = {
  status: {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  } satisfies Record<OrderStatus, string>,
  payment: { unpaid: "Unpaid", paid: "Paid", failed: "Failed", refunded: "Refunded" } satisfies Record<PaymentStatus, string>,
  method: { cod: "Cash on delivery", card: "Card", wallet: "Mobile wallet" } satisfies Record<PaymentMethod, string>,
  methodShort: { cod: "COD", card: "Card", wallet: "Wallet" } satisfies Record<PaymentMethod, string>,
  methodUnknown: "Not recorded",
  action: {
    confirmed: "Confirm order",
    processing: "Start processing",
    shipped: "Mark as shipped",
    delivered: "Mark as delivered",
    cancelled: "Cancel order",
    refunded: "Record refund",
    cash: "Mark cash collected",
    view: "View details",
    actions: "Actions",
    none: "No actions available",
    orderStatus: "Order status",
    payment: "Payment",
    updated: "Order updated",
    cashUpdated: "Cash collection recorded",
  },
  confirm: {
    cancelledTitle: "Cancel this order?",
    cancelledBody: "The items go back into stock. This cannot be undone.",
    refundedTitle: "Record a refund?",
    refundedBodyOnline: "Refund the payment in the Paymob dashboard first — this only records it here. The items go back into stock.",
    refundedBodyCod: "Give the customer their cash back first — this only records it here. The items go back into stock.",
    keep: "Keep order",
    go: "Yes, continue",
  },
  orderError: {
    unauthorized: "Your admin session has ended. Sign in again.",
    not_found: "This order no longer exists.",
    changed: "This order was just updated by someone else (or by a payment). Refresh and try again.",
    save_failed: "Could not save the change. Try again.",
    invalid_status: "That status is not valid.",
    same_status: "The order already has this status.",
    final: "Cancelled and refunded orders cannot change.",
    not_next_step: "Orders move one step at a time: pending → confirmed → processing → shipped → delivered.",
    awaiting_online_payment: "This card / wallet order is not paid yet. It can only be cancelled until the payment arrives.",
    cancel_after_shipping: "Shipped orders cannot be cancelled. Record a refund when the items come back.",
    cancel_paid: "This order is paid. Record a refund instead of cancelling.",
    refund_unpaid: "Only paid orders can be refunded. Cancel it instead.",
    not_cod: "Only cash-on-delivery orders are paid in cash.",
    generic: "Something went wrong. Try again.",
  } as Record<string, string>,
  hint: {
    awaiting_online_payment: "Waiting for online payment",
  },
  filters: {
    allStatuses: "All statuses",
    allPayments: "All payments",
    allMethods: "All methods",
    clear: "Clear filters",
    search: "Search by order number, name, email or phone…",
    results: "{count} orders",
  },
  orders: {
    customer: "Customer",
    order: "Order",
    date: "Date",
    status: "Status",
    payment: "Payment",
    total: "Total",
    guest: "Guest",
    noEmail: "No email",
  },
  detail: {
    back: "All orders",
    placed: "Placed",
    updated: "Last updated",
    items: "Items",
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit price",
    lineTotal: "Total",
    sku: "SKU",
    subtotal: "Subtotal",
    discount: "Discount",
    promo: "Promo code",
    shipping: "Shipping",
    tax: "Tax",
    total: "Total",
    free: "Free",
    contact: "Customer",
    name: "Name",
    email: "Email",
    phone: "Phone",
    account: "Account",
    registered: "Registered customer",
    guestCheckout: "Guest checkout",
    address: "Delivery address",
    governorate: "Governorate",
    city: "City",
    street: "Address",
    country: "Country",
    notes: "Customer notes",
    paymentTitle: "Payment",
    method: "Method",
    paymentStatus: "Status",
    transaction: "Transaction ID",
    paymobOrder: "Paymob order",
    stock: "Stock",
    stockReleased: "Returned to stock",
    stockReserved: "Taken from stock",
    refund: "Refund",
    needsRefund: "Paid after the order was cancelled. Refund the customer through Paymob.",
    timeline: "Dates",
    actionsTitle: "Update order",
    notFound: "Order not found",
    notFoundBody: "It may have been deleted, or the link is wrong.",
    viewProduct: "View product",
    none: "—",
  },
  inbox: {
    title: "Messages",
    description: "Messages sent from the contact form ({count} in this view).",
    inbox: "Inbox",
    unread: "Unread",
    archived: "Archived",
    empty: "No messages here.",
    emptyArchived: "No archived messages.",
    pick: "Select a message to read it.",
    reply: "Reply by email",
    markRead: "Mark as read",
    markUnread: "Mark as unread",
    archive: "Archive",
    unarchive: "Move to inbox",
    from: "From",
    received: "Received",
    back: "Back to messages",
    invalidEmail: "This email address looks invalid, so no reply link is offered.",
    copy: "Copy address",
    copied: "Address copied",
    replySubject: "Re: {subject}",
    replyGreeting: "Hello {name},",
    archivedToast: "Message archived",
    restoredToast: "Message moved to the inbox",
    error: "Could not update the message. Try again.",
    newBadge: "New",
  },
  csv: { exporting: "Exporting…", empty: "Nothing to export.", failed: "Export failed. Try again." },
  pagination: { page: "Page {page} of {total}", prev: "Previous page", next: "Next page" },
};

type BaseText = typeof en;

const ar: BaseText = {
  status: {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغى",
    refunded: "مسترد",
  },
  payment: { unpaid: "غير مدفوع", paid: "مدفوع", failed: "فشل الدفع", refunded: "مسترد" },
  method: { cod: "الدفع عند الاستلام", card: "بطاقة", wallet: "محفظة إلكترونية" },
  methodShort: { cod: "عند الاستلام", card: "بطاقة", wallet: "محفظة" },
  methodUnknown: "غير مسجل",
  action: {
    confirmed: "تأكيد الطلب",
    processing: "بدء التجهيز",
    shipped: "تحديد كمشحون",
    delivered: "تحديد كمُسلَّم",
    cancelled: "إلغاء الطلب",
    refunded: "تسجيل استرداد",
    cash: "تأكيد تحصيل المبلغ",
    view: "عرض التفاصيل",
    actions: "إجراءات",
    none: "لا توجد إجراءات متاحة",
    orderStatus: "حالة الطلب",
    payment: "الدفع",
    updated: "تم تحديث الطلب",
    cashUpdated: "تم تسجيل تحصيل المبلغ",
  },
  confirm: {
    cancelledTitle: "هل تريد إلغاء هذا الطلب؟",
    cancelledBody: "ستعود المنتجات إلى المخزون. لا يمكن التراجع عن ذلك.",
    refundedTitle: "هل تريد تسجيل استرداد؟",
    refundedBodyOnline: "أعِد المبلغ من لوحة Paymob أولًا، فهذا الإجراء يسجّله هنا فقط. ستعود المنتجات إلى المخزون.",
    refundedBodyCod: "أعِد المبلغ النقدي إلى العميل أولًا، فهذا الإجراء يسجّله هنا فقط. ستعود المنتجات إلى المخزون.",
    keep: "الإبقاء على الطلب",
    go: "نعم، متابعة",
  },
  orderError: {
    unauthorized: "انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.",
    not_found: "هذا الطلب لم يعد موجودًا.",
    changed: "حُدِّث هذا الطلب للتو من مستخدم آخر أو عبر عملية دفع. حدّث الصفحة وحاول مرة أخرى.",
    save_failed: "تعذّر حفظ التغيير. حاول مرة أخرى.",
    invalid_status: "هذه الحالة غير صالحة.",
    same_status: "الطلب في هذه الحالة بالفعل.",
    final: "لا يمكن تغيير الطلبات الملغاة أو المستردة.",
    not_next_step: "ينتقل الطلب خطوة واحدة في كل مرة: قيد الانتظار ← مؤكد ← قيد التجهيز ← تم الشحن ← تم التسليم.",
    awaiting_online_payment: "طلب البطاقة أو المحفظة هذا لم يُدفع بعد، ولا يمكن إلا إلغاؤه حتى يصل الدفع.",
    cancel_after_shipping: "لا يمكن إلغاء طلب تم شحنه. سجّل استردادًا عند إرجاع المنتجات.",
    cancel_paid: "هذا الطلب مدفوع. سجّل استردادًا بدلًا من الإلغاء.",
    refund_unpaid: "لا يمكن استرداد إلا الطلبات المدفوعة. ألغِ الطلب بدلًا من ذلك.",
    not_cod: "لا يُحصَّل نقدًا إلا في طلبات الدفع عند الاستلام.",
    generic: "حدث خطأ ما. حاول مرة أخرى.",
  },
  hint: { awaiting_online_payment: "بانتظار الدفع الإلكتروني" },
  filters: {
    allStatuses: "كل الحالات",
    allPayments: "كل حالات الدفع",
    allMethods: "كل طرق الدفع",
    clear: "مسح عوامل التصفية",
    search: "ابحث برقم الطلب أو الاسم أو البريد أو الهاتف…",
    results: "{count} طلب",
  },
  orders: {
    customer: "العميل",
    order: "الطلب",
    date: "التاريخ",
    status: "الحالة",
    payment: "الدفع",
    total: "الإجمالي",
    guest: "زائر",
    noEmail: "لا يوجد بريد",
  },
  detail: {
    back: "كل الطلبات",
    placed: "تاريخ الطلب",
    updated: "آخر تحديث",
    items: "المنتجات",
    item: "المنتج",
    qty: "الكمية",
    unitPrice: "سعر الوحدة",
    lineTotal: "الإجمالي",
    sku: "رمز SKU",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    promo: "رمز الخصم",
    shipping: "الشحن",
    tax: "الضريبة",
    total: "الإجمالي",
    free: "مجاني",
    contact: "العميل",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    account: "الحساب",
    registered: "عميل مسجّل",
    guestCheckout: "شراء كزائر",
    address: "عنوان التوصيل",
    governorate: "المحافظة",
    city: "المدينة",
    street: "العنوان",
    country: "الدولة",
    notes: "ملاحظات العميل",
    paymentTitle: "الدفع",
    method: "الطريقة",
    paymentStatus: "الحالة",
    transaction: "رقم العملية",
    paymobOrder: "طلب Paymob",
    stock: "المخزون",
    stockReleased: "أُعيد إلى المخزون",
    stockReserved: "خُصم من المخزون",
    refund: "الاسترداد",
    needsRefund: "دُفع بعد إلغاء الطلب. أعد المبلغ إلى العميل عبر Paymob.",
    timeline: "التواريخ",
    actionsTitle: "تحديث الطلب",
    notFound: "الطلب غير موجود",
    notFoundBody: "ربما حُذف أو أن الرابط غير صحيح.",
    viewProduct: "عرض المنتج",
    none: "—",
  },
  inbox: {
    title: "الرسائل",
    description: "الرسائل المرسلة من نموذج التواصل ({count} في هذا العرض).",
    inbox: "الوارد",
    unread: "غير المقروءة",
    archived: "المؤرشفة",
    empty: "لا توجد رسائل هنا.",
    emptyArchived: "لا توجد رسائل مؤرشفة.",
    pick: "اختر رسالة لقراءتها.",
    reply: "الرد عبر البريد",
    markRead: "تحديد كمقروءة",
    markUnread: "تحديد كغير مقروءة",
    archive: "أرشفة",
    unarchive: "نقل إلى الوارد",
    from: "من",
    received: "تاريخ الاستلام",
    back: "العودة إلى الرسائل",
    invalidEmail: "يبدو أن عنوان البريد غير صالح، لذلك لا يتوفر رابط للرد.",
    copy: "نسخ العنوان",
    copied: "تم نسخ العنوان",
    replySubject: "رد: {subject}",
    replyGreeting: "مرحبًا {name}،",
    archivedToast: "تمت أرشفة الرسالة",
    restoredToast: "نُقلت الرسالة إلى الوارد",
    error: "تعذّر تحديث الرسالة. حاول مرة أخرى.",
    newBadge: "جديدة",
  },
  csv: { exporting: "جارٍ التصدير…", empty: "لا توجد بيانات للتصدير.", failed: "تعذّر التصدير. حاول مرة أخرى." },
  pagination: { page: "صفحة {page} من {total}", prev: "الصفحة السابقة", next: "الصفحة التالية" },
};

export type AdminText = BaseText & OpsText;

const EN: AdminText = { ...en, ...opsEn };
const AR: AdminText = { ...ar, ...opsAr };

export function getAdminText(locale: string): AdminText {
  return locale === "ar" ? AR : EN;
}

/** Replaces {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** Translated message for an error key, with a generic fallback. */
export function errorText(map: Record<string, string>, key: string | undefined): string {
  return (key && map[key]) || map.generic || "Something went wrong.";
}

/** Number/date locale: Arabic text with Western digits (as on the storefront), English (Egypt). */
export const numberLocale = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG");

/** Currency label of the store ("EGP" / "ج.م"). */
export const currencyLabel = (locale: string) => (locale === "ar" ? brand.currency.label.ar : brand.currency.label.en);

/** Whole-currency amount for KPIs and lists ("EGP 1,250" / "1,250 ج.م"). */
export function formatAmount(value: number, locale: string, decimals = 0): string {
  const n = value.toLocaleString(numberLocale(locale), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return locale === "ar" ? `${n} ${currencyLabel(locale)}` : `${currencyLabel(locale)} ${n}`;
}

/** Plain integer with grouping, Western digits in both languages. */
export const formatInt = (value: number, locale: string) => Math.round(value).toLocaleString(numberLocale(locale));

/** "+12%" / "−8%" with Western digits. */
export function formatPercent(fraction: number, locale: string): string {
  const pct = Math.abs(fraction * 100);
  const text = pct.toLocaleString(numberLocale(locale), { maximumFractionDigits: pct < 10 ? 1 : 0 });
  return `${text}%`;
}

export function formatMoney(value: number, locale: string, currency: string): string {
  const n = value.toLocaleString(numberLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return locale === "ar" ? `${n} ${currency}` : `${currency} ${n}`;
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(numberLocale(locale), {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(numberLocale(locale), {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
