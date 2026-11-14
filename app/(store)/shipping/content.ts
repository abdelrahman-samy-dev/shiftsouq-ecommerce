/* Shipping & delivery — bilingual policy text. Every number comes from LegalFacts (store settings). */

import type { LegalDocument } from "@/components/shared/LegalArticle";
import { contactItems, LEGAL_LABELS, type LegalFacts } from "@/components/shared/legal-facts";
import type { Locale } from "@/lib/types";

export const SHIPPING_UPDATED = "2026-11-14";

export function shippingDocument(f: LegalFacts, locale: Locale): LegalDocument {
  if (locale === "ar") {
    return {
      eyebrow: LEGAL_LABELS.ar.help,
      title: "الشحن والتوصيل",
      intro: `نوصل طلبات ${f.brand} إلى جميع محافظات مصر. تجد هنا مواعيد التوصيل ورسومه، وما يحدث إذا تأخر طلبك.`,
      updated: SHIPPING_UPDATED,
      sections: [
        {
          id: "coverage",
          heading: "مناطق التوصيل",
          blocks: [
            { type: "p", text: "نوصل حاليًا إلى جميع محافظات جمهورية مصر العربية." },
            { type: "p", text: "للطلبات من خارج مصر، يرجى [التواصل معنا](/contact) قبل الطلب لنرتب الشحن إن أمكن." },
          ],
        },
        {
          id: "times",
          heading: "مواعيد التوصيل",
          blocks: [
            { type: "p", text: `يصل معظم الطلبات خلال **${f.etaMin} إلى ${f.etaMax} أيام عمل** حسب المحافظة.` },
            ...(f.etaRows.length ? [{ type: "table" as const, caption: "مدة التوصيل بأيام العمل حسب المحافظة", rows: f.etaRows }] : []),
            {
              type: "list",
              items: [
                "نجهز الطلبات ونسلمها لشركة الشحن من السبت إلى الخميس، عدا العطلات الرسمية.",
                "المواعيد المذكورة تقديرية، وقد تتأثر بظروف خارجة عن إرادتنا مثل الأحوال الجوية أو ضغط المواسم.",
              ],
            },
          ],
        },
        {
          id: "fees",
          heading: "رسوم التوصيل",
          blocks: [
            { type: "p", text: "تُحسب رسوم التوصيل حسب محافظة الاستلام، وتظهر بوضوح قبل تأكيد الطلب." },
            { type: "table", rows: f.feeRows },
            ...(f.freeThreshold
              ? [{ type: "p" as const, text: `**التوصيل مجاني** للطلبات التي تبلغ قيمتها ${f.freeThreshold} أو أكثر بعد الخصم، ويُطبَّق ذلك تلقائيًا عند إتمام الطلب.` }]
              : []),
          ],
        },
        ...(f.payments.cod
          ? [
              {
                id: "cod",
                heading: "الدفع عند الاستلام",
                blocks: [
                  { type: "p" as const, text: "يمكنك الدفع نقدًا لمندوب التوصيل عند وصول طلبك. نرجو تجهيز المبلغ إن أمكن لتسريع التسليم." },
                ],
              },
            ]
          : []),
        {
          id: "tracking",
          heading: "متابعة الطلب",
          blocks: [
            { type: "p", text: "تابع حالة طلباتك في أي وقت من صفحة [طلباتي](/orders)، وتواصل معنا برقم الطلب لأي استفسار." },
          ],
        },
        {
          id: "delays",
          heading: "التأخير أو تعذر التسليم",
          blocks: [
            {
              type: "list",
              items: [
                "إذا لم يصلك طلبك خلال المدة المتوقعة، تواصل معنا وسنتابع الأمر مع شركة الشحن فورًا.",
                "إذا تعذر التسليم بسبب عنوان غير صحيح أو عدم وجود المستلم، فقد تُحتسب رسوم توصيل إضافية لإعادة الإرسال.",
              ],
            },
          ],
        },
        {
          id: "contact",
          heading: "تواصل معنا",
          blocks: [
            { type: "p", text: "لأي سؤال عن الشحن والتوصيل:" },
            { type: "list", items: contactItems(f, locale) },
          ],
        },
      ],
    };
  }

  return {
    eyebrow: LEGAL_LABELS.en.help,
    title: "Shipping & delivery",
    intro: `${f.brand} delivers to every governorate in Egypt. Here is how long delivery takes, what it costs, and what happens if an order is late.`,
    updated: SHIPPING_UPDATED,
    sections: [
      {
        id: "coverage",
        heading: "Where we deliver",
        blocks: [
          { type: "p", text: "We currently deliver to all governorates of the Arab Republic of Egypt." },
          { type: "p", text: "Ordering from outside Egypt? Please [contact us](/contact) before you order and we will see whether we can arrange shipping." },
        ],
      },
      {
        id: "times",
        heading: "Delivery times",
        blocks: [
          { type: "p", text: `Most orders arrive within **${f.etaMin} to ${f.etaMax} working days**, depending on the governorate.` },
          ...(f.etaRows.length ? [{ type: "table" as const, caption: "Delivery time in working days, by governorate", rows: f.etaRows }] : []),
          {
            type: "list",
            items: [
              "Orders are prepared and handed to our courier Saturday to Thursday, except public holidays.",
              "Delivery times are estimates and can be affected by things outside our control, such as weather or peak seasons.",
            ],
          },
        ],
      },
      {
        id: "fees",
        heading: "Delivery fees",
        blocks: [
          { type: "p", text: "The delivery fee depends on the delivery governorate and is shown clearly before you confirm your order." },
          { type: "table", rows: f.feeRows },
          ...(f.freeThreshold
            ? [{ type: "p" as const, text: `**Delivery is free** on orders of ${f.freeThreshold} or more after discounts. It is applied automatically at checkout.` }]
            : []),
        ],
      },
      ...(f.payments.cod
        ? [
            {
              id: "cod",
              heading: "Cash on delivery",
              blocks: [
                { type: "p" as const, text: "You can pay the courier in cash when your order arrives. Having the exact amount ready helps the handover go quickly." },
              ],
            },
          ]
        : []),
      {
        id: "tracking",
        heading: "Following your order",
        blocks: [
          { type: "p", text: "Follow the status of your orders at any time in [My orders](/orders), and quote your order number if you need to contact us." },
        ],
      },
      {
        id: "delays",
        heading: "Late or missed deliveries",
        blocks: [
          {
            type: "list",
            items: [
              "If your order has not arrived within the expected time, contact us and we will follow it up with the courier straight away.",
              "If delivery fails because of an incorrect address or because nobody is available to receive it, an extra delivery fee may apply to send it again.",
            ],
          },
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [
          { type: "p", text: "Questions about shipping and delivery:" },
          { type: "list", items: contactItems(f, locale) },
        ],
      },
    ],
  };
}
