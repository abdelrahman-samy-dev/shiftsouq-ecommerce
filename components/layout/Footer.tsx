/* ══════════════════════════════════════════════════════════════
   Footer — newsletter, link columns, contact, payments, legal
   ──────────────────────────────────────────────────────────────
   Server component. Shop links come from the DB category tree,
   contact details, social links and payment methods from store
   settings (empty social links are hidden). The only client
   pieces are the newsletter form and the language/theme switches.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { getNavigation } from "@/lib/dal/navigation";
import { getStoreSettings } from "@/lib/settings";
import { brand, t } from "@/lib/brand/config";
import type { Locale } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { NewsletterForm } from "./NewsletterForm";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { shellCopy } from "./copy";
import { NEW_IN_HREF, categoryHref, phoneHref, socialLinks, whatsappHref } from "./shell-rules";

const linkClass = "inline-flex min-h-9 items-center text-[0.875rem] text-text-secondary transition-colors hover:text-text-primary";

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  if (!links.length) return null;
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="t-eyebrow">{title}</h2>
      <ul className="flex flex-col">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className={linkClass}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function Footer({ locale = "en" }: { locale?: Locale }) {
  const copy = shellCopy(locale);
  const [nav, settings] = await Promise.all([getNavigation(), getStoreSettings()]);
  const isAr = locale === "ar";
  const year = new Date().getFullYear();
  const brandName = t(brand.name, locale);

  const shopLinks = [
    ...nav.categories.map((c) => ({ href: categoryHref(c.slug), label: isAr ? c.name.ar : c.name.en })),
    { href: NEW_IN_HREF, label: copy.newIn },
  ];
  const helpLinks = [
    { href: "/contact", label: copy.contactUs },
    { href: "/shipping", label: copy.shipping },
    { href: "/refund-policy", label: copy.returns },
    { href: "/orders", label: copy.myOrders },
  ];
  const legalLinks = [
    { href: "/terms", label: copy.terms },
    { href: "/privacy-policy", label: copy.privacy },
  ];

  const { contact, payments } = settings;
  const tel = phoneHref(contact.phone);
  const wa = contact.whatsapp ? whatsappHref(contact.whatsapp) : null;
  const social = socialLinks(settings.social);
  const address = t(contact.address, locale);
  const hours = t(contact.hours, locale);

  const paymentMarks = [
    payments.cod ? copy.cod : null,
    ...(payments.card ? ["Visa", "Mastercard", isAr ? "ميزة" : "Meeza"] : []),
    payments.wallet ? copy.wallets : null,
  ].filter((m): m is string => !!m);

  return (
    <footer className="mt-auto border-t border-border bg-background text-text-primary">
      {/* ── Newsletter ─────────────────────────────────────── */}
      <section aria-labelledby="newsletter-title" className="border-b border-border">
        <div className="container-x grid gap-8 py-14 md:grid-cols-2 md:items-end md:gap-16 md:py-20">
          <div className="flex max-w-lg flex-col gap-3">
            <h2 id="newsletter-title" className="t-h2">
              {copy.newsletterTitle}
            </h2>
            <p className="text-text-secondary">{copy.newsletterBody}</p>
          </div>
          <div className="md:justify-self-end md:w-full md:max-w-md">
            <NewsletterForm
              labels={{ email: copy.emailLabel, placeholder: copy.emailPlaceholder, submit: copy.subscribe, note: copy.unsubscribeNote }}
            />
          </div>
        </div>
      </section>

      {/* ── Columns ────────────────────────────────────────── */}
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:grid-cols-4 lg:grid-cols-12 lg:gap-x-8">
        <div className="col-span-2 flex flex-col gap-5 md:col-span-4 lg:col-span-4">
          <Link href="/" aria-label={copy.homeLink} className="self-start">
            <Logo locale={locale} size="sm" />
          </Link>
          <p className="max-w-xs text-[0.875rem] text-text-secondary">{t(brand.tagline, locale)}</p>
          {social.length ? (
            <div className="flex flex-col gap-2">
              <h2 className="t-eyebrow">{copy.followUs}</h2>
              <ul className="flex flex-wrap gap-x-5">
                {social.map((s) => (
                  <li key={s.key}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <Column title={copy.shop} links={shopLinks} />
        </div>
        <div className="lg:col-span-2">
          <Column title={copy.help} links={helpLinks} />
        </div>
        <div className="lg:col-span-2">
          <Column title={copy.policies} links={legalLinks} />
        </div>

        <div className="col-span-2 flex flex-col gap-3 md:col-span-2 lg:col-span-2">
          <h2 className="t-eyebrow">{copy.customerCare}</h2>
          <address className="flex flex-col gap-1.5 text-[0.875rem] not-italic text-text-secondary">
            {contact.email ? (
              <a href={`mailto:${contact.email}`} dir="ltr" className="self-start break-all transition-colors hover:text-text-primary">
                {contact.email}
              </a>
            ) : null}
            {contact.phone && tel ? (
              <a href={tel} dir="ltr" className="self-start transition-colors hover:text-text-primary">
                {contact.phone}
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="self-start transition-colors hover:text-text-primary">
                {copy.whatsapp}
              </a>
            ) : null}
            {address ? <span>{address}</span> : null}
            {hours ? <span className="text-text-muted">{hours}</span> : null}
          </address>
        </div>
      </div>

      {/* ── Payments ───────────────────────────────────────── */}
      {paymentMarks.length ? (
        <div className="container-x">
          <div className="flex flex-col gap-3 border-t border-border py-6 md:flex-row md:items-center md:gap-6">
            <h2 className="t-eyebrow shrink-0">{copy.waysToPay}</h2>
            <ul className="flex flex-wrap gap-2" aria-label={copy.waysToPay}>
              {paymentMarks.map((m) => (
                <li
                  key={m}
                  className="inline-flex h-7 items-center rounded-sm border border-border px-2.5 text-[0.75rem] font-medium text-text-secondary"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* ── Bottom bar ─────────────────────────────────────── */}
      <div className="container-x">
        <div className="flex flex-col-reverse gap-5 border-t border-border py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.8125rem] text-text-muted">
            © {year} {brandName}. {copy.rights}
          </p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher currentLocale={locale} variant="outline" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
