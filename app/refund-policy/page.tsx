/* ══════════════════════════════════════════════════════════════
   Return & Refund Policy Page — /refund-policy
   ──────────────────────────────────────────────────────────────
   Professional refund policy with bilingual content (EN/AR).
   Required by Paymob for live environment activation.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RotateCcw } from "lucide-react";
import type { Locale } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Return & Refund Policy | ${APP_NAME}`,
  description:
    "Learn about ShiftSouq's return and refund policies. Easy returns within 14 days for eligible items.",
};

const LAST_UPDATED = "2025-05-01";

function getContent(locale: Locale) {
  if (locale === "ar") {
    return {
      title: "سياسة الاسترجاع والاسترداد",
      lastUpdated: "آخر تحديث",
      sections: [
        {
          heading: "1. سياسة الاسترجاع",
          body: `في ${APP_NAME}، نريدك أن تكون راضيًا تمامًا عن مشترياتك. إذا لم تكن راضيًا عن أي منتج، يمكنك طلب الاسترجاع خلال **14 يومًا** من تاريخ استلام الطلب، بشرط استيفاء الشروط الموضحة أدناه.`,
        },
        {
          heading: "2. شروط الاسترجاع",
          body: `لقبول طلب الاسترجاع، يجب أن يستوفي المنتج الشروط التالية:\n\n• أن يكون في حالته الأصلية غير مستخدم وغير ملبوس.\n• أن يكون مع جميع العلامات والبطاقات الأصلية مرفقة.\n• أن يكون في عبوته الأصلية.\n• أن يتم تقديم طلب الاسترجاع خلال 14 يومًا من الاستلام.\n• أن يكون مصحوبًا بإثبات الشراء (رقم الطلب أو إيصال الدفع).`,
        },
        {
          heading: "3. المنتجات غير القابلة للاسترجاع",
          body: `لا يمكن استرجاع المنتجات التالية:\n\n• الملابس الداخلية والجوارب (لأسباب صحية).\n• المنتجات المخصصة أو المصنوعة حسب الطلب.\n• العطور ومستحضرات التجميل المفتوحة أو المستخدمة.\n• المنتجات التي تم تخفيض سعرها بأكثر من 50% (عروض التصفية).\n• بطاقات الهدايا.`,
        },
        {
          heading: "4. كيفية تقديم طلب الاسترجاع",
          body: `لتقديم طلب استرجاع، اتبع الخطوات التالية:\n\n**1.** تواصل معنا عبر صفحة "اتصل بنا" أو أرسل بريدًا إلكترونيًا إلى support@shiftsouq.com مع ذكر رقم الطلب وسبب الاسترجاع.\n**2.** سيقوم فريقنا بمراجعة طلبك والرد خلال 24-48 ساعة عمل.\n**3.** عند الموافقة، ستتلقى تعليمات الشحن لإعادة المنتج.\n**4.** بعد استلام المنتج والتحقق من حالته، ستتم معالجة الاسترداد.`,
        },
        {
          heading: "5. الاسترداد المالي",
          body: `• يتم الاسترداد بنفس طريقة الدفع الأصلية.\n• مدة معالجة الاسترداد: **5-14 يوم عمل** بعد استلام المنتج المرتجع.\n• رسوم الشحن الأصلية غير قابلة للاسترداد إلا في حالة وجود عيب في المنتج أو خطأ من جانبنا.\n• في حالة الدفع ببطاقة الائتمان، قد يستغرق ظهور المبلغ في كشف حسابك دورة فوترة إضافية.`,
        },
        {
          heading: "6. الاستبدال",
          body: `• يمكن استبدال المنتجات بمقاس أو لون مختلف (حسب التوافر).\n• يتم معالجة طلبات الاستبدال خلال 3-5 أيام عمل.\n• إذا كان المنتج البديل بسعر أعلى، سيتم تحصيل الفرق.\n• إذا كان بسعر أقل، سيتم رد الفرق إليك.`,
        },
        {
          heading: "7. المنتجات التالفة أو المعيبة",
          body: `إذا استلمت منتجًا تالفًا أو معيبًا:\n\n• تواصل معنا خلال **48 ساعة** من الاستلام مع صور توضح العيب.\n• سنقوم بترتيب الاستبدال أو الاسترداد الكامل بما في ذلك رسوم الشحن.\n• لن تتحمل أي تكاليف شحن إضافية للمنتجات التالفة أو المعيبة.`,
        },
        {
          heading: "8. اتصل بنا",
          body: `لأي استفسارات حول الاسترجاع والاسترداد:\n\n• **البريد الإلكتروني**: support@shiftsouq.com\n• **صفحة التواصل**: /contact\n• **ساعات العمل**: الأحد - الخميس، 10:00 ص - 8:00 م`,
        },
      ],
    };
  }

  return {
    title: "Return & Refund Policy",
    lastUpdated: "Last updated",
    sections: [
      {
        heading: "1. Return Policy",
        body: `At ${APP_NAME}, we want you to be completely satisfied with your purchases. If you are not satisfied with any product, you can request a return within **14 days** of receiving your order, provided the conditions outlined below are met.`,
      },
      {
        heading: "2. Return Conditions",
        body: `For a return request to be accepted, the product must meet the following conditions:\n\n• Must be in its original, unworn, and unused condition.\n• Must have all original tags and labels attached.\n• Must be in its original packaging.\n• Return request must be submitted within 14 days of receipt.\n• Must be accompanied by proof of purchase (order number or payment receipt).`,
      },
      {
        heading: "3. Non-Returnable Items",
        body: `The following products cannot be returned:\n\n• Underwear and socks (for hygiene reasons).\n• Custom or made-to-order products.\n• Opened or used perfumes and cosmetics.\n• Products discounted by more than 50% (clearance items).\n• Gift cards.`,
      },
      {
        heading: "4. How to Request a Return",
        body: `To submit a return request, follow these steps:\n\n**1.** Contact us through our "Contact Us" page or email support@shiftsouq.com with your order number and reason for return.\n**2.** Our team will review your request and respond within 24-48 business hours.\n**3.** Upon approval, you will receive shipping instructions to return the product.\n**4.** After receiving the product and verifying its condition, the refund will be processed.`,
      },
      {
        heading: "5. Refund Processing",
        body: `• Refunds are issued to the original payment method.\n• Refund processing time: **5-14 business days** after receiving the returned product.\n• Original shipping fees are non-refundable unless the product was defective or the error was on our part.\n• For credit card payments, the refund may take an additional billing cycle to appear on your statement.`,
      },
      {
        heading: "6. Exchanges",
        body: `• Products can be exchanged for a different size or color (subject to availability).\n• Exchange requests are processed within 3-5 business days.\n• If the replacement product is of a higher price, the difference will be charged.\n• If the replacement is of a lower price, the difference will be refunded.`,
      },
      {
        heading: "7. Damaged or Defective Products",
        body: `If you receive a damaged or defective product:\n\n• Contact us within **48 hours** of receipt with photos showing the defect.\n• We will arrange a replacement or full refund including shipping costs.\n• You will not bear any additional shipping costs for damaged or defective products.`,
      },
      {
        heading: "8. Contact Us",
        body: `For any questions about returns and refunds:\n\n• **Email**: support@shiftsouq.com\n• **Contact Page**: /contact\n• **Business Hours**: Sunday - Thursday, 10:00 AM - 8:00 PM`,
      },
    ],
  };
}

export default async function RefundPolicyPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const content = getContent(locale);

  return (
    <div className="min-h-[70vh] mx-auto max-w-4xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: "var(--surface-elevated)" }}
        >
          <RotateCcw size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
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
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>'),
              }}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
