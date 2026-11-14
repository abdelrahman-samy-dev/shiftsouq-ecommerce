/* Returns & refunds — bilingual policy text. Return days and contact details come from store settings. */

import type { LegalDocument } from "@/components/shared/LegalArticle";
import { contactItems, LEGAL_LABELS, type LegalFacts } from "@/components/shared/legal-facts";
import type { Locale } from "@/lib/types";

export const REFUND_UPDATED = "2026-11-14";

export function refundDocument(f: LegalFacts, locale: Locale): LegalDocument {
  const mail = f.email ? `[${f.email}](mailto:${f.email})` : "";

  if (locale === "ar") {
    return {
      eyebrow: LEGAL_LABELS.ar.help,
      title: "الإرجاع والاسترداد",
      intro: `نريدك أن تكون راضيًا عن كل قطعة تشتريها من ${f.brand}. إن لم تناسبك، يمكنك إرجاعها خلال **${f.returnDays}** من تاريخ الاستلام.`,
      updated: REFUND_UPDATED,
      sections: [
        {
          id: "window",
          heading: "مدة الإرجاع",
          blocks: [
            { type: "p", text: `يمكنك طلب إرجاع أي منتج خلال **${f.returnDays}** من تاريخ استلام الطلب، بشرط استيفاء الشروط أدناه.` },
          ],
        },
        {
          id: "conditions",
          heading: "شروط الإرجاع",
          blocks: [
            {
              type: "list",
              items: [
                "أن يكون المنتج بحالته الأصلية، غير مستخدم وغير ملبوس.",
                "أن تكون جميع البطاقات والملصقات الأصلية مثبتة عليه.",
                "أن يكون في عبوته الأصلية.",
                `أن يُقدَّم طلب الإرجاع خلال ${f.returnDays} من الاستلام.`,
                "أن يرافقه ما يثبت الشراء، مثل رقم الطلب أو إيصال الدفع.",
              ],
            },
          ],
        },
        {
          id: "exclusions",
          heading: "منتجات لا يمكن إرجاعها",
          blocks: [
            {
              type: "list",
              items: [
                "الملابس الداخلية والجوارب، حفاظًا على الصحة العامة.",
                "المنتجات المخصصة أو المصنوعة حسب الطلب.",
                "العطور ومستحضرات العناية المفتوحة أو المستخدمة.",
                "المنتجات المخفضة بأكثر من 50% ضمن عروض التصفية.",
                "بطاقات الهدايا.",
              ],
            },
          ],
        },
        {
          id: "how",
          heading: "كيف تطلب الإرجاع",
          blocks: [
            {
              type: "steps",
              items: [
                `راسلنا عبر [صفحة تواصل معنا](/contact)${mail ? ` أو على ${mail}` : ""} مع رقم الطلب وسبب الإرجاع.`,
                "يراجع فريقنا طلبك ويرد عليك خلال يومي عمل.",
                "عند الموافقة، نرسل إليك تعليمات إعادة المنتج.",
                "بعد استلام المنتج والتأكد من حالته، نبدأ إجراءات الاسترداد.",
              ],
            },
          ],
        },
        {
          id: "refunds",
          heading: "استرداد المبلغ",
          blocks: [
            {
              type: "list",
              items: [
                "يُرد المبلغ المدفوع بالبطاقة أو المحفظة الإلكترونية إلى البطاقة أو المحفظة نفسها.",
                "في طلبات الدفع عند الاستلام، نتفق معك على طريقة الاسترداد، مثل المحفظة الإلكترونية أو التحويل البنكي.",
                "تستغرق معالجة الاسترداد من **5 إلى 14 يوم عمل** بعد استلامنا المنتج المرتجع.",
                "لا تُرد رسوم التوصيل الأصلية إلا إذا كان المنتج معيبًا أو كان الخطأ من جانبنا.",
                "قد يحتاج ظهور المبلغ في كشف حساب البطاقة إلى دورة فوترة إضافية.",
              ],
            },
          ],
        },
        {
          id: "exchanges",
          heading: "الاستبدال",
          blocks: [
            {
              type: "list",
              items: [
                "يمكنك استبدال المنتج بمقاس أو لون آخر حسب التوفر.",
                "نعالج طلبات الاستبدال خلال 3 إلى 5 أيام عمل.",
                "إذا كان سعر المنتج البديل أعلى، يُحصَّل الفرق، وإذا كان أقل، يُرد إليك الفرق.",
              ],
            },
          ],
        },
        {
          id: "damaged",
          heading: "المنتجات التالفة أو المعيبة",
          blocks: [
            {
              type: "list",
              items: [
                "تواصل معنا خلال **48 ساعة** من الاستلام مع صور توضح العيب.",
                "نرتب لك الاستبدال أو الاسترداد الكامل، بما في ذلك رسوم التوصيل.",
                "لا تتحمل أي تكلفة شحن إضافية للمنتجات التالفة أو المعيبة.",
              ],
            },
          ],
        },
        {
          id: "contact",
          heading: "تواصل معنا",
          blocks: [
            { type: "p", text: "لأي سؤال عن الإرجاع والاسترداد:" },
            { type: "list", items: contactItems(f, locale) },
          ],
        },
      ],
    };
  }

  return {
    eyebrow: LEGAL_LABELS.en.help,
    title: "Returns & refunds",
    intro: `We want you to love everything you buy from ${f.brand}. If something isn't right, you can return it within **${f.returnDays}** of delivery.`,
    updated: REFUND_UPDATED,
    sections: [
      {
        id: "window",
        heading: "Return window",
        blocks: [{ type: "p", text: `You can request a return within **${f.returnDays}** of receiving your order, as long as the conditions below are met.` }],
      },
      {
        id: "conditions",
        heading: "Return conditions",
        blocks: [
          {
            type: "list",
            items: [
              "The item is in its original condition: unworn and unused.",
              "All original tags and labels are still attached.",
              "It is in its original packaging.",
              `The return is requested within ${f.returnDays} of delivery.`,
              "It comes with proof of purchase, such as the order number or payment receipt.",
            ],
          },
        ],
      },
      {
        id: "exclusions",
        heading: "Items that can't be returned",
        blocks: [
          {
            type: "list",
            items: [
              "Underwear and socks, for hygiene reasons.",
              "Custom or made-to-order items.",
              "Opened or used fragrances and grooming products.",
              "Clearance items discounted by more than 50%.",
              "Gift cards.",
            ],
          },
        ],
      },
      {
        id: "how",
        heading: "How to return an item",
        blocks: [
          {
            type: "steps",
            items: [
              `Write to us through [our contact page](/contact)${mail ? ` or at ${mail}` : ""} with your order number and the reason for the return.`,
              "Our team reviews your request and replies within two working days.",
              "Once approved, we send you instructions for sending the item back.",
              "When the item arrives and we have checked its condition, we process your refund.",
            ],
          },
        ],
      },
      {
        id: "refunds",
        heading: "Refunds",
        blocks: [
          {
            type: "list",
            items: [
              "Card and mobile-wallet payments are refunded to the same card or wallet.",
              "For cash on delivery orders, we agree the refund method with you, such as a mobile wallet or a bank transfer.",
              "Refunds are processed within **5 to 14 working days** of receiving the returned item.",
              "The original delivery fee is not refunded unless the item was faulty or the mistake was ours.",
              "Card refunds can take an extra billing cycle to appear on your statement.",
            ],
          },
        ],
      },
      {
        id: "exchanges",
        heading: "Exchanges",
        blocks: [
          {
            type: "list",
            items: [
              "You can exchange an item for another size or colour, subject to availability.",
              "Exchanges are processed within 3 to 5 working days.",
              "If the replacement costs more, we charge the difference; if it costs less, we refund the difference.",
            ],
          },
        ],
      },
      {
        id: "damaged",
        heading: "Damaged or faulty items",
        blocks: [
          {
            type: "list",
            items: [
              "Contact us within **48 hours** of delivery with photos showing the problem.",
              "We arrange a replacement or a full refund, including the delivery fee.",
              "You never pay extra shipping for damaged or faulty items.",
            ],
          },
        ],
      },
      {
        id: "contact",
        heading: "Contact us",
        blocks: [
          { type: "p", text: "Questions about returns and refunds:" },
          { type: "list", items: contactItems(f, locale) },
        ],
      },
    ],
  };
}
