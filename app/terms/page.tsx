/* ══════════════════════════════════════════════════════════════
   Terms & Conditions Page — /terms
   ──────────────────────────────────────────────────────────────
   Professional T&C with bilingual content (EN/AR).
   Required by Paymob for live environment activation.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import type { Locale } from "@/lib/types";
import { getLocale, getLocaleAndDictionary } from "@/lib/i18n/server";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.legal.terms.title, description: dict.legal.terms.description };
}

const LAST_UPDATED = "2025-05-01";

function getContent(locale: Locale) {
  if (locale === "ar") {
    return {
      title: "الشروط والأحكام",
      lastUpdated: "آخر تحديث",
      sections: [
        {
          heading: "1. القبول بالشروط",
          body: `باستخدامك لموقع شيفت سوق الإلكتروني أو أي من خدماتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الموقع. يحتفظ شيفت سوق بالحق في تعديل هذه الشروط في أي وقت، وستكون التعديلات سارية المفعول فور نشرها.`,
        },
        {
          heading: "2. الحسابات والتسجيل",
          body: `• يجب أن يكون عمرك 13 عامًا أو أكثر لإنشاء حساب.\n• أنت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول.\n• يجب أن تكون المعلومات المقدمة عند التسجيل دقيقة وحديثة.\n• يحق لنا تعليق أو إلغاء أي حساب ينتهك هذه الشروط.\n• يجب إخطارنا فورًا في حالة أي استخدام غير مصرح به لحسابك.`,
        },
        {
          heading: "3. المنتجات والأسعار",
          body: `• نبذل قصارى جهدنا لعرض صور ووصف دقيق للمنتجات، لكن قد تختلف الألوان قليلاً بسبب إعدادات الشاشة.\n• جميع الأسعار معروضة بالجنيه المصري (EGP) وتشمل ضريبة القيمة المضافة حيث ينطبق ذلك.\n• نحتفظ بالحق في تعديل الأسعار في أي وقت دون إشعار مسبق. الأسعار المؤكدة في طلبك لن تتغير.\n• توفر المنتجات يخضع للمخزون المتاح، ونحتفظ بالحق في رفض أو إلغاء الطلبات في حالة نفاد المخزون.`,
        },
        {
          heading: "4. الطلبات والدفع",
          body: `• عند تقديم طلب، فإنك تقدم عرضًا للشراء يخضع لقبولنا.\n• نقبل الدفع عبر بطاقات الائتمان/الخصم والمحافظ الإلكترونية عبر بوابة Paymob الآمنة.\n• يتم تأكيد الطلب فقط بعد نجاح عملية الدفع والتحقق منها.\n• نحتفظ بالحق في رفض أو إلغاء أي طلب لأسباب تشمل: عدم توفر المنتج، أخطاء في الأسعار، أو نشاط احتيالي مشتبه به.\n• ستتلقى تأكيدًا بالبريد الإلكتروني عند معالجة طلبك بنجاح.`,
        },
        {
          heading: "5. الشحن والتوصيل",
          body: `• أوقات التوصيل المذكورة هي تقديرية وليست مضمونة.\n• التوصيل متاح حاليًا داخل مصر.\n• أنت مسؤول عن تقديم عنوان شحن دقيق وكامل.\n• في حالة عدم التسليم بسبب عنوان خاطئ أو عدم تواجد المستلم، قد يتم فرض رسوم شحن إضافية.\n• يتم حساب رسوم الشحن عند إتمام الطلب بناءً على الوجهة ووزن الطرد.`,
        },
        {
          heading: "6. الملكية الفكرية",
          body: `• جميع المحتويات على هذا الموقع — بما في ذلك النصوص والصور والشعارات والتصاميم — هي ملكية فكرية لـ شيفت سوق أو مرخصيها.\n• يُحظر نسخ أو إعادة إنتاج أو توزيع أي محتوى من الموقع دون إذن كتابي مسبق.\n• العلامات التجارية والشعارات المعروضة هي ملك لأصحابها المعنيين.`,
        },
        {
          heading: "7. حدود المسؤولية",
          body: `• يُقدم الموقع والخدمات "كما هي" دون أي ضمانات صريحة أو ضمنية.\n• لا نتحمل المسؤولية عن أي أضرار غير مباشرة أو عرضية ناتجة عن استخدام الموقع.\n• لا نضمن أن الموقع سيكون متاحًا دون انقطاع أو خاليًا من الأخطاء.\n• مسؤوليتنا القصوى تقتصر على قيمة المنتج المشترى.`,
        },
        {
          heading: "8. القانون المعمول به",
          body: `تخضع هذه الشروط والأحكام لقوانين جمهورية مصر العربية وتُفسر وفقًا لها. أي نزاع ينشأ عن هذه الشروط يخضع للاختصاص القضائي الحصري للمحاكم المصرية.`,
        },
        {
          heading: "9. اتصل بنا",
          body: `لأي استفسارات بخصوص هذه الشروط والأحكام:\n\n• **البريد الإلكتروني**: support@shiftsouq.com\n• **صفحة التواصل**: /contact`,
        },
      ],
    };
  }

  return {
    title: "Terms & Conditions",
    lastUpdated: "Last updated",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: `By accessing or using the ${APP_NAME} website or any of our services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use the site. ${APP_NAME} reserves the right to modify these terms at any time, and modifications will be effective immediately upon posting.`,
      },
      {
        heading: "2. Accounts & Registration",
        body: `• You must be 13 years or older to create an account.\n• You are responsible for maintaining the confidentiality of your login credentials.\n• Information provided during registration must be accurate and up to date.\n• We reserve the right to suspend or terminate any account that violates these terms.\n• You must notify us immediately of any unauthorized use of your account.`,
      },
      {
        heading: "3. Products & Pricing",
        body: `• We make every effort to display accurate product images and descriptions, but colors may vary slightly due to screen settings.\n• All prices are displayed in Egyptian Pounds (EGP) and include VAT where applicable.\n• We reserve the right to modify prices at any time without prior notice. Prices confirmed in your order will not change.\n• Product availability is subject to stock, and we reserve the right to refuse or cancel orders if items are out of stock.`,
      },
      {
        heading: "4. Orders & Payment",
        body: `• When you place an order, you are making an offer to purchase that is subject to our acceptance.\n• We accept payment via credit/debit cards and mobile wallets through the secure Paymob payment gateway.\n• Orders are confirmed only after successful payment processing and verification.\n• We reserve the right to refuse or cancel any order for reasons including: product unavailability, pricing errors, or suspected fraudulent activity.\n• You will receive an email confirmation once your order has been successfully processed.`,
      },
      {
        heading: "5. Shipping & Delivery",
        body: `• Delivery times mentioned are estimated and not guaranteed.\n• Delivery is currently available within Egypt.\n• You are responsible for providing an accurate and complete shipping address.\n• If delivery fails due to an incorrect address or recipient unavailability, additional shipping charges may apply.\n• Shipping costs are calculated at checkout based on destination and parcel weight.`,
      },
      {
        heading: "6. Intellectual Property",
        body: `• All content on this website — including text, images, logos, and designs — is the intellectual property of ${APP_NAME} or its licensors.\n• Copying, reproducing, or distributing any website content without prior written permission is prohibited.\n• Trademarks and logos displayed are the property of their respective owners.`,
      },
      {
        heading: "7. Limitation of Liability",
        body: `• The website and services are provided "as is" without any express or implied warranties.\n• We are not liable for any indirect or incidental damages resulting from the use of the website.\n• We do not guarantee that the website will be available without interruption or free of errors.\n• Our maximum liability is limited to the value of the purchased product.`,
      },
      {
        heading: "8. Governing Law",
        body: `These Terms and Conditions are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any dispute arising from these terms is subject to the exclusive jurisdiction of the Egyptian courts.`,
      },
      {
        heading: "9. Contact Us",
        body: `For any questions regarding these Terms and Conditions:\n\n• **Email**: support@shiftsouq.com\n• **Contact Page**: /contact`,
      },
    ],
  };
}

export default async function TermsPage() {
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
          <ScrollText size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
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
