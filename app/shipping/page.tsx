import type { Metadata } from "next";
import { Truck } from "lucide-react";
import type { Locale } from "@/lib/types";
import { getLocale, getLocaleAndDictionary } from "@/lib/i18n/server";
import { DEFAULT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, GOVERNORATE_SHIPPING } from "@/lib/checkout/shipping";
import { formatPrice } from "@/lib/utils";

/** Fees shown on this page come from the same table checkout charges. */
const CAIRO_GIZA_FEE = Math.min(GOVERNORATE_SHIPPING.cairo, GOVERNORATE_SHIPPING.giza);

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.shipping.title, description: dict.meta.shipping.description };
}

const LAST_UPDATED = "2026-05-01";

function getContent(locale: Locale) {
  if (locale === "ar") {
    return {
      title: "سياسة الشحن والتوصيل",
      lastUpdated: "آخر تحديث",
      sections: [
        {
          heading: "1. مناطق التوصيل",
          body: `• نقدم خدمات الشحن والتوصيل حاليًا إلى جميع محافظات جمهورية مصر العربية.\n• بالنسبة للطلبات الدولية، يرجى التواصل مع خدمة العملاء لترتيب الشحن.`,
        },
        {
          heading: "2. أوقات التوصيل",
          body: `• **القاهرة والجيزة والإسكندرية**: التوصيل خلال 2 إلى 3 أيام عمل.\n• **باقي المحافظات**: التوصيل خلال 3 إلى 5 أيام عمل.\n• يتم شحن الطلبات من السبت إلى الخميس، باستثناء أيام الجمعة والعطلات الرسمية.\n• أوقات التوصيل المذكورة هي تقديرية وقد تتأثر بظروف خارجة عن إرادتنا.`,
        },
        {
          heading: "3. رسوم الشحن",
          body: `• تُحسب رسوم الشحن حسب محافظة التوصيل وتظهر قبل تأكيد الطلب.\n• **القاهرة والجيزة**: ${formatPrice(CAIRO_GIZA_FEE, locale)}.\n• **باقي المحافظات**: ${formatPrice(DEFAULT_SHIPPING_FEE, locale)}.\n• **الشحن مجاني** للطلبات التي تبلغ قيمتها ${formatPrice(FREE_SHIPPING_THRESHOLD, locale)} أو أكثر، ويُطبَّق تلقائيًا عند الدفع.`,
        },
        {
          heading: "4. تتبع الطلب",
          body: `• بمجرد شحن طلبك، ستتلقى رسالة تأكيد بالبريد الإلكتروني تحتوي على رقم التتبع وتفاصيل شركة الشحن.\n• يمكنك استخدام هذا الرقم لتتبع حالة الشحنة عبر موقعنا أو موقع شركة الشحن.`,
        },
        {
          heading: "5. التسليم المفقود أو المتأخر",
          body: `• إذا لم يتم تسليم طلبك خلال الإطار الزمني المقدر، يرجى الاتصال بخدمة العملاء وسنقوم بالتحقيق في الأمر فورًا.\n• في حالة الإرجاع بسبب عدم التواجد للاستلام أو تقديم عنوان خاطئ، قد يتم تحميلك رسوم إعادة الشحن.`,
        },
        {
          heading: "6. التواصل معنا",
          body: `إذا كان لديك أي أسئلة بخصوص الشحن، يرجى التواصل معنا:\n\n• **البريد الإلكتروني**: support@shiftsouq.com\n• **صفحة التواصل**: /contact`,
        },
      ],
    };
  }

  return {
    title: "Shipping & Delivery",
    lastUpdated: "Last updated",
    sections: [
      {
        heading: "1. Delivery Coverage",
        body: `• We currently offer shipping and delivery services to all governorates within the Arab Republic of Egypt.\n• For international orders, please contact our customer service to arrange shipping.`,
      },
      {
        heading: "2. Delivery Times",
        body: `• **Cairo, Giza, and Alexandria**: Delivery within 2 to 3 business days.\n• **Other Governorates**: Delivery within 3 to 5 business days.\n• Orders are dispatched from Saturday to Thursday, excluding Fridays and public holidays.\n• The stated delivery times are estimates and may be affected by unforeseen circumstances.`,
      },
      {
        heading: "3. Shipping Fees",
        body: `• Shipping fees depend on the delivery governorate and are shown before you confirm your order.\n• **Cairo and Giza**: ${formatPrice(CAIRO_GIZA_FEE, locale)}.\n• **Other governorates**: ${formatPrice(DEFAULT_SHIPPING_FEE, locale)}.\n• **Free shipping** on orders of ${formatPrice(FREE_SHIPPING_THRESHOLD, locale)} or more, applied automatically at checkout.`,
      },
      {
        heading: "4. Order Tracking",
        body: `• Once your order has been dispatched, you will receive a confirmation email containing a tracking number and courier details.\n• You can use this number to track the status of your shipment via our website or the courier's site.`,
      },
      {
        heading: "5. Missed or Delayed Deliveries",
        body: `• If your order is not delivered within the estimated timeframe, please contact customer service, and we will investigate the matter immediately.\n• In the event of a return due to unavailability to receive the package or providing an incorrect address, you may be charged for reshipping.`,
      },
      {
        heading: "6. Contact Us",
        body: `If you have any questions regarding shipping, please contact us:\n\n• **Email**: support@shiftsouq.com\n• **Contact Page**: /contact`,
      },
    ],
  };
}

export default async function ShippingPage() {
  const locale = await getLocale();
  const content = getContent(locale);

  return (
    <div className="min-h-[70vh] mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: "var(--surface-elevated)" }}
        >
          <Truck size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {content.title}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          {content.lastUpdated}: {new Date(LAST_UPDATED).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Content Sections */}
      <div className="flex flex-col gap-8">
        {content.sections.map((section, idx) => (
          <section key={idx} className="card-elevated p-6 sm:p-8">
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {section.heading}
            </h2>
            <div
              className="text-sm leading-[1.85] whitespace-pre-line"
              style={{ color: "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{
                __html: section.body
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
                  .replace(/support@shiftsouq\.com/g, '<a href="mailto:support@shiftsouq.com" dir="ltr" class="underline">support@shiftsouq.com</a>')
                  .replace(/: \/contact/g, ': <a href="/contact" dir="ltr" class="underline">/contact</a>'),
              }}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
