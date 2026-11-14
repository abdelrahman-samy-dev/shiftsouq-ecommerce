/* Privacy policy — bilingual text. Store name and contact details come from settings and the brand config. */

import type { LegalDocument } from "@/components/shared/LegalArticle";
import { contactItems, LEGAL_LABELS, type LegalFacts } from "@/components/shared/legal-facts";
import type { Locale } from "@/lib/types";

export const PRIVACY_UPDATED = "2026-11-14";

export function privacyDocument(f: LegalFacts, locale: Locale): LegalDocument {
  if (locale === "ar") {
    return {
      eyebrow: LEGAL_LABELS.ar.legal,
      title: "سياسة الخصوصية",
      intro: `تشرح هذه السياسة البيانات التي يجمعها ${f.brand} عند استخدامك للموقع، وكيف نستخدمها ونحميها، والحقوق المتاحة لك. باستخدامك للموقع فإنك توافق على ما ورد فيها.`,
      updated: PRIVACY_UPDATED,
      sections: [
        {
          id: "collect",
          heading: "البيانات التي نجمعها",
          blocks: [
            {
              type: "list",
              items: [
                "**بيانات الحساب والطلب:** الاسم والبريد الإلكتروني ورقم الهاتف وعنوان التوصيل عند إنشاء حساب أو إتمام طلب.",
                "**بيانات الدفع:** لا نخزن بيانات البطاقات. تُعالج المدفوعات الإلكترونية لدى Paymob، وهي بوابة دفع متوافقة مع معيار PCI DSS.",
                "**بيانات الاستخدام:** معلومات عن تفاعلك مع الموقع، مثل الصفحات التي تزورها والمنتجات التي تتصفحها ونوع جهازك.",
                "**النشرة البريدية:** إن اشتركت فيها، نحفظ بريدك الإلكتروني ولغتك المفضلة فقط.",
              ],
            },
          ],
        },
        {
          id: "use",
          heading: "كيف نستخدم بياناتك",
          blocks: [
            {
              type: "list",
              items: [
                "تجهيز طلباتك وتوصيلها وإدارة حسابك.",
                "إرسال تأكيدات الطلبات وتحديثات التوصيل.",
                "تحسين الموقع والمنتجات والخدمة.",
                "إرسال العروض والجديد إن اخترت ذلك، مع إمكانية إلغاء الاشتراك في أي وقت.",
                "منع الاحتيال وحماية المعاملات.",
                "الالتزام بالمتطلبات القانونية والتنظيمية.",
              ],
            },
          ],
        },
        {
          id: "cookies",
          heading: "ملفات تعريف الارتباط والتخزين المحلي",
          blocks: [
            {
              type: "p",
              text: "نستخدم ملفات تعريف الارتباط الضرورية لتسجيل الدخول وحفظ لغتك، ونحفظ محتوى حقيبتك وقائمة المفضلة على جهازك. لا نستخدم ملفات تعريف ارتباط إعلانية من أطراف ثالثة.",
            },
          ],
        },
        {
          id: "protection",
          heading: "حماية البيانات",
          blocks: [
            {
              type: "list",
              items: [
                "تشفير جميع البيانات المنقولة عبر بروتوكول HTTPS.",
                "تخزين البيانات على خوادم محمية، مع صلاحيات وصول محدودة للموظفين المخوّلين فقط.",
                "مراجعة دورية لإجراءات الأمان.",
              ],
            },
          ],
        },
        {
          id: "sharing",
          heading: "مشاركة البيانات",
          blocks: [
            { type: "p", text: "لا نبيع بياناتك الشخصية ولا نؤجرها. نشاركها فقط بالقدر اللازم مع:" },
            {
              type: "list",
              items: [
                "**شركات الشحن:** لتوصيل طلباتك إلى عنوانك.",
                "**مزود الدفع (Paymob):** لمعالجة المدفوعات الإلكترونية بأمان.",
                "**مزودي الخدمات التقنية:** مثل الاستضافة وقواعد البيانات، الذين يعملون لصالحنا وفق التزامات سرية.",
                "**الجهات الرسمية:** عندما يلزمنا القانون بذلك.",
              ],
            },
          ],
        },
        {
          id: "rights",
          heading: "حقوقك",
          blocks: [
            {
              type: "list",
              items: [
                "**الاطلاع:** يمكنك طلب نسخة من بياناتك الشخصية.",
                "**التصحيح:** يمكنك تحديث بياناتك من [الملف الشخصي](/profile).",
                "**الحذف:** يمكنك طلب حذف حسابك وبياناتك.",
                "**الاعتراض:** يمكنك إلغاء الاشتراك في الرسائل التسويقية في أي وقت.",
              ],
            },
            { type: "p", text: "لممارسة أي من هذه الحقوق، [تواصل معنا](/contact)." },
          ],
        },
        {
          id: "updates",
          heading: "تحديث السياسة",
          blocks: [
            { type: "p", text: "قد نحدّث هذه السياسة من وقت لآخر، وسنبلغك بأي تغيير جوهري عبر البريد الإلكتروني أو بإشعار على الموقع." },
          ],
        },
        {
          id: "contact",
          heading: "تواصل معنا",
          blocks: [
            { type: "p", text: "لأي سؤال عن الخصوصية وبياناتك:" },
            { type: "list", items: contactItems(f, locale) },
          ],
        },
      ],
    };
  }

  return {
    eyebrow: LEGAL_LABELS.en.legal,
    title: "Privacy policy",
    intro: `This policy explains what information ${f.brand} collects when you use the site, how we use and protect it, and the rights you have. By using the site you agree to it.`,
    updated: PRIVACY_UPDATED,
    sections: [
      {
        id: "collect",
        heading: "Information we collect",
        blocks: [
          {
            type: "list",
            items: [
              "**Account and order details:** your name, email address, phone number and delivery address when you create an account or place an order.",
              "**Payment details:** we never store card details. Online payments are processed by Paymob, a PCI DSS-compliant payment gateway.",
              "**Usage data:** how you use the site, such as pages visited, products viewed and your device type.",
              "**Newsletter:** if you subscribe, we keep only your email address and preferred language.",
            ],
          },
        ],
      },
      {
        id: "use",
        heading: "How we use it",
        blocks: [
          {
            type: "list",
            items: [
              "To prepare and deliver your orders and manage your account.",
              "To send order confirmations and delivery updates.",
              "To improve the site, our products and our service.",
              "To send news and offers if you chose to receive them. You can unsubscribe at any time.",
              "To prevent fraud and keep payments secure.",
              "To meet legal and regulatory requirements.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        blocks: [
          {
            type: "p",
            text: "We use essential cookies to keep you signed in and remember your language, and we keep your bag and wishlist on your device. We do not use third-party advertising cookies.",
          },
        ],
      },
      {
        id: "protection",
        heading: "How we protect it",
        blocks: [
          {
            type: "list",
            items: [
              "All data is encrypted in transit over HTTPS.",
              "Data is stored on protected servers, and only authorised staff can access it.",
              "Our security measures are reviewed regularly.",
            ],
          },
        ],
      },
      {
        id: "sharing",
        heading: "Sharing your information",
        blocks: [
          { type: "p", text: "We never sell or rent your personal information. We share only what is needed with:" },
          {
            type: "list",
            items: [
              "**Couriers:** to deliver your orders.",
              "**Our payment provider (Paymob):** to process online payments securely.",
              "**Technical service providers:** such as hosting and databases, working for us under confidentiality obligations.",
              "**Authorities:** when the law requires it.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        blocks: [
          {
            type: "list",
            items: [
              "**Access:** ask for a copy of your personal information.",
              "**Correction:** update your details in your [profile](/profile).",
              "**Deletion:** ask us to delete your account and data.",
              "**Objection:** unsubscribe from marketing messages at any time.",
            ],
          },
          { type: "p", text: "To use any of these rights, [contact us](/contact)." },
        ],
      },
      {
        id: "updates",
        heading: "Changes to this policy",
        blocks: [
          { type: "p", text: "We may update this policy from time to time. We will tell you about important changes by email or with a notice on the site." },
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [
          { type: "p", text: "Questions about privacy and your data:" },
          { type: "list", items: contactItems(f, locale) },
        ],
      },
    ],
  };
}
