/* Terms & conditions — bilingual text. Store name, payment methods and contact details come from settings. */

import type { LegalDocument } from "@/components/shared/LegalArticle";
import { contactItems, LEGAL_LABELS, type LegalFacts } from "@/components/shared/legal-facts";
import type { Locale } from "@/lib/types";

export const TERMS_UPDATED = "2026-11-14";

export function termsDocument(f: LegalFacts, locale: Locale): LegalDocument {
  const online = f.payments.card || f.payments.wallet;

  if (locale === "ar") {
    return {
      eyebrow: LEGAL_LABELS.ar.legal,
      title: "الشروط والأحكام",
      intro: `تنظم هذه الشروط استخدامك لموقع ${f.brand} وشراءك منه. باستخدامك للموقع فإنك توافق عليها؛ وإن لم توافق على أي جزء منها، يرجى عدم استخدام الموقع.`,
      updated: TERMS_UPDATED,
      sections: [
        {
          id: "acceptance",
          heading: "قبول الشروط",
          blocks: [
            { type: "p", text: `يحق لـ${f.brand} تعديل هذه الشروط في أي وقت، وتسري التعديلات من تاريخ نشرها على هذه الصفحة.` },
          ],
        },
        {
          id: "accounts",
          heading: "الحسابات",
          blocks: [
            {
              type: "list",
              items: [
                "يجب ألا يقل عمرك عن 13 عامًا لإنشاء حساب.",
                "أنت مسؤول عن سرية بيانات تسجيل الدخول الخاصة بك.",
                "يجب أن تكون البيانات التي تقدمها صحيحة ومحدَّثة.",
                "يحق لنا إيقاف أي حساب يخالف هذه الشروط أو إلغاؤه.",
                "أبلغنا فورًا إذا لاحظت أي استخدام غير مصرح به لحسابك.",
              ],
            },
          ],
        },
        {
          id: "products",
          heading: "المنتجات والأسعار",
          blocks: [
            {
              type: "list",
              items: [
                "نحرص على دقة صور المنتجات وأوصافها، وقد تختلف الألوان قليلًا حسب إعدادات الشاشة.",
                "جميع الأسعار بالجنيه المصري وتشمل ضريبة القيمة المضافة حيثما تنطبق.",
                "قد تتغير الأسعار دون إشعار مسبق، أما سعر الطلب المؤكد فلا يتغير.",
                "المنتجات متاحة حسب المخزون، ويحق لنا إلغاء الطلب إذا نفد المنتج، مع رد أي مبلغ مدفوع.",
              ],
            },
          ],
        },
        {
          id: "orders",
          heading: "الطلبات والدفع",
          blocks: [
            {
              type: "list",
              items: [
                "تقديم الطلب عرضٌ للشراء يخضع لقبولنا.",
                ...(f.paymentList ? [`طرق الدفع المتاحة: ${f.paymentList}.`] : []),
                ...(online ? ["تُعالج المدفوعات الإلكترونية عبر بوابة Paymob الآمنة، ويُؤكَّد الطلب المدفوع إلكترونيًا بعد التحقق من نجاح الدفع."] : []),
                ...(f.payments.cod ? ["يُؤكَّد طلب الدفع عند الاستلام عند قبولنا له، ويُسدَّد المبلغ لمندوب التوصيل."] : []),
                "يحق لنا رفض أي طلب أو إلغاؤه في حالات مثل عدم توفر المنتج أو وجود خطأ في السعر أو الاشتباه في الاحتيال.",
                "يُحسب إجمالي الطلب النهائي على خوادمنا عند إتمام الطلب، ويشمل رسوم التوصيل وأي خصم.",
              ],
            },
          ],
        },
        {
          id: "delivery",
          heading: "الشحن والتوصيل",
          blocks: [
            {
              type: "list",
              items: [
                "مواعيد التوصيل تقديرية وليست مضمونة.",
                "التوصيل متاح داخل مصر.",
                "أنت مسؤول عن تقديم عنوان توصيل صحيح وكامل.",
                "تُحسب رسوم التوصيل حسب محافظة الاستلام، وتظهر قبل تأكيد الطلب. التفاصيل في [سياسة الشحن والتوصيل](/shipping).",
              ],
            },
          ],
        },
        {
          id: "returns",
          heading: "الإرجاع والاسترداد",
          blocks: [
            { type: "p", text: `يمكنك إرجاع المنتجات خلال ${f.returnDays} من الاستلام وفق [سياسة الإرجاع والاسترداد](/refund-policy).` },
          ],
        },
        {
          id: "ip",
          heading: "الملكية الفكرية",
          blocks: [
            {
              type: "list",
              items: [
                `جميع محتويات الموقع، من نصوص وصور وشعارات وتصاميم، مملوكة لـ${f.brand} أو للجهات المرخِّصة لها.`,
                "لا يجوز نسخ أي محتوى من الموقع أو إعادة نشره أو توزيعه دون إذن كتابي مسبق.",
              ],
            },
          ],
        },
        {
          id: "liability",
          heading: "حدود المسؤولية",
          blocks: [
            {
              type: "list",
              items: [
                "يُقدَّم الموقع والخدمات كما هي، دون ضمانات صريحة أو ضمنية بخلاف ما ينص عليه القانون.",
                "لا نتحمل مسؤولية الأضرار غير المباشرة الناتجة عن استخدام الموقع.",
                "لا نضمن أن يعمل الموقع دون انقطاع أو أخطاء.",
                "تقتصر مسؤوليتنا القصوى على قيمة المنتج المشترى.",
              ],
            },
          ],
        },
        {
          id: "law",
          heading: "القانون المطبق",
          blocks: [
            { type: "p", text: "تخضع هذه الشروط لقوانين جمهورية مصر العربية، وتختص المحاكم المصرية بأي نزاع ينشأ عنها." },
          ],
        },
        {
          id: "contact",
          heading: "تواصل معنا",
          blocks: [
            { type: "p", text: "لأي سؤال عن هذه الشروط:" },
            { type: "list", items: contactItems(f, locale) },
          ],
        },
      ],
    };
  }

  return {
    eyebrow: LEGAL_LABELS.en.legal,
    title: "Terms & conditions",
    intro: `These terms govern your use of the ${f.brand} website and your purchases from it. By using the site you agree to them; if you don't agree with any part, please don't use the site.`,
    updated: TERMS_UPDATED,
    sections: [
      {
        id: "acceptance",
        heading: "Accepting these terms",
        blocks: [{ type: "p", text: `${f.brand} may change these terms at any time. Changes take effect when they are published on this page.` }],
      },
      {
        id: "accounts",
        heading: "Accounts",
        blocks: [
          {
            type: "list",
            items: [
              "You must be 13 or older to create an account.",
              "You are responsible for keeping your sign-in details confidential.",
              "The information you give us must be accurate and up to date.",
              "We may suspend or close any account that breaks these terms.",
              "Tell us straight away if you notice any unauthorised use of your account.",
            ],
          },
        ],
      },
      {
        id: "products",
        heading: "Products and prices",
        blocks: [
          {
            type: "list",
            items: [
              "We take care to show accurate photos and descriptions; colours can look slightly different depending on your screen.",
              "All prices are in Egyptian pounds (EGP) and include VAT where it applies.",
              "Prices may change without notice. The price of a confirmed order does not change.",
              "Products are subject to stock. If an item sells out we may cancel the order and refund any amount paid.",
            ],
          },
        ],
      },
      {
        id: "orders",
        heading: "Orders and payment",
        blocks: [
          {
            type: "list",
            items: [
              "Placing an order is an offer to buy, subject to our acceptance.",
              ...(f.paymentList ? [`We accept ${f.paymentList}.`] : []),
              ...(online ? ["Online payments are processed through the secure Paymob gateway. An order paid online is confirmed once the payment is verified."] : []),
              ...(f.payments.cod ? ["A cash on delivery order is confirmed when we accept it, and is paid to the courier on delivery."] : []),
              "We may refuse or cancel an order, for example if a product is unavailable, a price is wrong or we suspect fraud.",
              "Your final order total, including delivery and any discount, is calculated on our servers at checkout.",
            ],
          },
        ],
      },
      {
        id: "delivery",
        heading: "Shipping and delivery",
        blocks: [
          {
            type: "list",
            items: [
              "Delivery times are estimates, not guarantees.",
              "We deliver within Egypt.",
              "You are responsible for giving an accurate and complete delivery address.",
              "The delivery fee depends on the delivery governorate and is shown before you confirm. See our [shipping policy](/shipping) for details.",
            ],
          },
        ],
      },
      {
        id: "returns",
        heading: "Returns and refunds",
        blocks: [{ type: "p", text: `You can return items within ${f.returnDays} of delivery under our [returns & refunds policy](/refund-policy).` }],
      },
      {
        id: "ip",
        heading: "Intellectual property",
        blocks: [
          {
            type: "list",
            items: [
              `All content on this site, including text, photographs, logos and designs, belongs to ${f.brand} or its licensors.`,
              "You may not copy, republish or distribute any content from the site without our prior written permission.",
            ],
          },
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        blocks: [
          {
            type: "list",
            items: [
              "The site and services are provided as they are, without warranties beyond those required by law.",
              "We are not liable for indirect damages arising from the use of the site.",
              "We do not guarantee that the site will run without interruption or errors.",
              "Our maximum liability is limited to the value of the product purchased.",
            ],
          },
        ],
      },
      {
        id: "law",
        heading: "Governing law",
        blocks: [{ type: "p", text: "These terms are governed by the laws of the Arab Republic of Egypt, and the Egyptian courts have jurisdiction over any dispute." }],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [
          { type: "p", text: "Questions about these terms:" },
          { type: "list", items: contactItems(f, locale) },
        ],
      },
    ],
  };
}
