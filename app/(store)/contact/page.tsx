/* ══════════════════════════════════════════════════════════════
   Contact — /contact
   ──────────────────────────────────────────────────────────────
   Editorial header, contact details and hours from store
   settings (email, phone, WhatsApp, address, hours), and the
   message form (client).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { t } from "@/lib/brand/config";
import { phoneHref, whatsappHref } from "@/components/layout/shell-rules";
import ContactContent from "./ContactContent";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends the store name.
  return { title: dict.meta.contact.title, description: dict.meta.contact.description };
}

const COPY = {
  en: {
    eyebrow: "Help",
    title: "Contact us",
    intro: "Questions about an order, a size or a return? Write to us and a real person will reply, usually within two working days.",
    details: "Customer care",
    email: "Email",
    phone: "Phone",
    whatsapp: "WhatsApp",
    whatsappCta: "Message us on WhatsApp",
    address: "Address",
    hours: "Hours",
    formTitle: "Send a message",
    required: "All fields are required.",
    another: "Send another message",
    sentTitle: "Message sent",
    faq: "Quick answers",
    faqShipping: "Delivery times and fees",
    faqReturns: "Returns and refunds",
    faqOrders: "Track my orders",
  },
  ar: {
    eyebrow: "المساعدة",
    title: "تواصل معنا",
    intro: "لديك سؤال عن طلب أو مقاس أو إرجاع؟ راسلنا وسيرد عليك أحد أفراد فريقنا، غالبًا خلال يومي عمل.",
    details: "خدمة العملاء",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    whatsapp: "واتساب",
    whatsappCta: "راسلنا على واتساب",
    address: "العنوان",
    hours: "مواعيد العمل",
    formTitle: "أرسل رسالة",
    required: "جميع الحقول مطلوبة.",
    another: "إرسال رسالة أخرى",
    sentTitle: "تم إرسال رسالتك",
    faq: "إجابات سريعة",
    faqShipping: "مواعيد التوصيل ورسومه",
    faqReturns: "الإرجاع والاسترداد",
    faqOrders: "متابعة طلباتي",
  },
} as const;

export default async function ContactPage() {
  const [{ locale, dict }, settings] = await Promise.all([getLocaleAndDictionary(), getStoreSettings()]);
  const c = COPY[locale];
  const { contact } = settings;
  const tel = phoneHref(contact.phone);
  const wa = contact.whatsapp ? whatsappHref(contact.whatsapp) : null;
  const address = t(contact.address, locale);
  const hours = t(contact.hours, locale);

  type Row = { label: string; value: React.ReactNode };
  const rows = ([
    contact.email
      ? { label: c.email, value: <a href={`mailto:${contact.email}`} dir="ltr" className="break-all underline decoration-border-hover underline-offset-4 hover:decoration-text-primary">{contact.email}</a> }
      : null,
    contact.phone
      ? {
          label: c.phone,
          value: tel ? (
            <a href={tel} dir="ltr" className="underline decoration-border-hover underline-offset-4 hover:decoration-text-primary">
              {contact.phone}
            </a>
          ) : (
            <span dir="ltr">{contact.phone}</span>
          ),
        }
      : null,
    wa
      ? { label: c.whatsapp, value: <a href={wa} target="_blank" rel="noopener noreferrer" className="underline decoration-border-hover underline-offset-4 hover:decoration-text-primary">{c.whatsappCta}</a> }
      : null,
    address ? { label: c.address, value: address } : null,
    hours ? { label: c.hours, value: hours } : null,
  ] as (Row | null)[]).filter((r): r is Row => !!r);

  return (
    <div className="container-x py-14 md:py-20">
      <header className="border-b border-border pb-10 md:pb-14">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="t-eyebrow">{c.eyebrow}</p>
          <h1 className="t-h1">{c.title}</h1>
          <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-text-secondary md:text-lg">{c.intro}</p>
        </div>
      </header>

      <div className="grid gap-14 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-16">
        <aside className="flex flex-col gap-10 lg:col-span-4">
          <section aria-labelledby="contact-details" className="flex flex-col gap-4">
            <h2 id="contact-details" className="t-eyebrow">
              {c.details}
            </h2>
            <dl className="border-t border-border">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1 border-b border-border py-4">
                  <dt className="text-[0.8125rem] text-text-muted">{r.label}</dt>
                  <dd className="text-[0.9375rem] text-text-primary">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <nav aria-labelledby="contact-faq" className="flex flex-col gap-3">
            <h2 id="contact-faq" className="t-eyebrow">
              {c.faq}
            </h2>
            <ul className="flex flex-col">
              {[
                { href: "/shipping", label: c.faqShipping },
                { href: "/refund-policy", label: c.faqReturns },
                { href: "/orders", label: c.faqOrders },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group flex min-h-11 items-center justify-between gap-4 text-[0.9375rem] text-text-secondary hover:text-text-primary">
                    {l.label}
                    <span aria-hidden="true" className="text-text-faint transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <section aria-labelledby="contact-form-title" className="flex flex-col gap-6 lg:col-span-8 lg:max-w-2xl">
          <h2 id="contact-form-title" className="t-h2">
            {c.formTitle}
          </h2>
          <ContactContent dict={dict} labels={{ required: c.required, another: c.another, sentTitle: c.sentTitle }} />
        </section>
      </div>
    </div>
  );
}
