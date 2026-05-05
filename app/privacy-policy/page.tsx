/* ══════════════════════════════════════════════════════════════
   Privacy Policy Page — /privacy-policy
   ──────────────────────────────────────────────────────────────
   Professional privacy policy with bilingual content (EN/AR).
   Required by Paymob for live environment activation.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Shield } from "lucide-react";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description:
    "Learn how ShiftSouq collects, uses, and protects your personal information. We are committed to safeguarding your privacy.",
};

/* ── Content ──────────────────────────────────────────────────── */

const LAST_UPDATED = "2025-05-01";

function getContent(locale: Locale) {
  if (locale === "ar") {
    return {
      title: "سياسة الخصوصية",
      lastUpdated: "آخر تحديث",
      sections: [
        {
          heading: "1. المقدمة",
          body: `مرحبًا بكم في ${APP_NAME}. نحن نلتزم بحماية خصوصيتكم وبياناتكم الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتكم عند استخدام موقعنا الإلكتروني وخدماتنا. باستخدامك لموقعنا، فإنك توافق على الممارسات الموضحة في هذه السياسة.`,
        },
        {
          heading: "2. المعلومات التي نجمعها",
          body: `نقوم بجمع أنواع مختلفة من المعلومات لتقديم خدمة أفضل لك:\n\n• **معلومات شخصية**: الاسم الكامل، البريد الإلكتروني، رقم الهاتف، وعنوان الشحن عند إنشاء حساب أو إتمام عملية شراء.\n• **معلومات الدفع**: نحن لا نخزن بيانات بطاقات الائتمان مباشرة. تتم معالجة جميع المدفوعات بشكل آمن عبر بوابة الدفع Paymob المعتمدة والمتوافقة مع معايير PCI DSS.\n• **بيانات الاستخدام**: نجمع معلومات حول كيفية تفاعلك مع موقعنا، بما في ذلك الصفحات التي تزورها، والمنتجات التي تتصفحها، ونوع الجهاز المستخدم.\n• **ملفات تعريف الارتباط**: نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتذكر تفضيلاتك.`,
        },
        {
          heading: "3. كيف نستخدم معلوماتك",
          body: `نستخدم المعلومات المجمعة للأغراض التالية:\n\n• معالجة وإتمام طلباتك وإدارة حسابك.\n• إرسال تأكيدات الطلب وتحديثات الشحن.\n• تحسين موقعنا ومنتجاتنا وخدماتنا.\n• التواصل معك بشأن العروض والتحديثات (يمكنك إلغاء الاشتراك في أي وقت).\n• منع الاحتيال وضمان أمان المعاملات.\n• الامتثال للمتطلبات القانونية والتنظيمية.`,
        },
        {
          heading: "4. حماية البيانات",
          body: `نتخذ إجراءات أمنية صارمة لحماية بياناتك:\n\n• تشفير SSL/TLS لجميع عمليات نقل البيانات.\n• تخزين آمن للبيانات على خوادم محمية.\n• وصول محدود للموظفين المصرح لهم فقط.\n• مراجعة أمنية دورية لأنظمتنا.\n• معالجة المدفوعات عبر بوابات دفع متوافقة مع PCI DSS.`,
        },
        {
          heading: "5. مشاركة البيانات مع أطراف ثالثة",
          body: `لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك بياناتك فقط مع:\n\n• **شركات الشحن**: لتوصيل طلباتك إلى عنوانك.\n• **بوابات الدفع**: لمعالجة مدفوعاتك بشكل آمن (Paymob).\n• **مزودي الخدمات**: الذين يساعدوننا في تشغيل موقعنا (الاستضافة، التحليلات).\n• **السلطات القانونية**: عند الضرورة للامتثال للقانون أو حماية حقوقنا.`,
        },
        {
          heading: "6. حقوقك",
          body: `لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:\n\n• **حق الوصول**: يمكنك طلب نسخة من بياناتك الشخصية.\n• **حق التصحيح**: يمكنك تحديث أو تصحيح بياناتك عبر صفحة الملف الشخصي.\n• **حق الحذف**: يمكنك طلب حذف حسابك وبياناتك.\n• **حق الاعتراض**: يمكنك إلغاء الاشتراك في الرسائل التسويقية.\n\nللممارسة أي من هذه الحقوق، تواصل معنا عبر صفحة اتصل بنا.`,
        },
        {
          heading: "7. تحديثات السياسة",
          body: `قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار على الموقع. ننصحك بمراجعة هذه السياسة بشكل دوري.`,
        },
        {
          heading: "8. اتصل بنا",
          body: `إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا:\n\n• **البريد الإلكتروني**: support@shiftsouq.com\n• **صفحة التواصل**: /contact`,
        },
      ],
    };
  }

  return {
    title: "Privacy Policy",
    lastUpdated: "Last updated",
    sections: [
      {
        heading: "1. Introduction",
        body: `Welcome to ${APP_NAME}. We are committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services. By using our site, you agree to the practices described in this policy.`,
      },
      {
        heading: "2. Information We Collect",
        body: `We collect different types of information to provide you with a better service:\n\n• **Personal Information**: Full name, email address, phone number, and shipping address when you create an account or complete a purchase.\n• **Payment Information**: We do not store credit card details directly. All payments are securely processed through Paymob, our PCI DSS-compliant payment gateway.\n• **Usage Data**: We collect information about how you interact with our site, including pages visited, products browsed, and device type.\n• **Cookies**: We use cookies to improve your browsing experience and remember your preferences.`,
      },
      {
        heading: "3. How We Use Your Information",
        body: `We use the collected information for the following purposes:\n\n• Processing and fulfilling your orders and managing your account.\n• Sending order confirmations and shipping updates.\n• Improving our website, products, and services.\n• Communicating with you about promotions and updates (you can opt out at any time).\n• Preventing fraud and ensuring transaction security.\n• Complying with legal and regulatory requirements.`,
      },
      {
        heading: "4. Data Protection",
        body: `We implement strict security measures to protect your data:\n\n• SSL/TLS encryption for all data transmissions.\n• Secure data storage on protected servers.\n• Restricted access to authorized personnel only.\n• Regular security audits of our systems.\n• Payment processing through PCI DSS-compliant gateways.`,
      },
      {
        heading: "5. Third-Party Data Sharing",
        body: `We do not sell or rent your personal information to third parties. We may share your data only with:\n\n• **Shipping Carriers**: To deliver your orders to your address.\n• **Payment Gateways**: To securely process your payments (Paymob).\n• **Service Providers**: Who help us operate our website (hosting, analytics).\n• **Legal Authorities**: When required by law or to protect our rights.`,
      },
      {
        heading: "6. Your Rights",
        body: `You have the following rights regarding your personal data:\n\n• **Right of Access**: You can request a copy of your personal data.\n• **Right to Rectification**: You can update or correct your data via your profile page.\n• **Right to Erasure**: You can request deletion of your account and data.\n• **Right to Object**: You can opt out of marketing communications.\n\nTo exercise any of these rights, contact us through our Contact page.`,
      },
      {
        heading: "7. Policy Updates",
        body: `We may update this Privacy Policy from time to time. We will notify you of any material changes via email or a notice on our website. We encourage you to review this policy periodically.`,
      },
      {
        heading: "8. Contact Us",
        body: `If you have any questions or concerns about this Privacy Policy, please contact us:\n\n• **Email**: support@shiftsouq.com\n• **Contact Page**: /contact`,
      },
    ],
  };
}

/* ── Page Component ───────────────────────────────────────────── */

export default async function PrivacyPolicyPage() {
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
          <Shield size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
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
