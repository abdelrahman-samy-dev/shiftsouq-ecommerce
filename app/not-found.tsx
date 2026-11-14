/* ══════════════════════════════════════════════════════════════
   Not found (404)
   ──────────────────────────────────────────────────────────────
   Editorial and helpful: a display title, one sentence, the two
   most useful ways out, and the store's categories. Follows the
   visitor's language (NEXT_LOCALE).
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getNavigation } from "@/lib/dal/navigation";
import { buttonClasses } from "@/components/ds/Button";
import { categoryHref, NEW_IN_HREF } from "@/components/layout/shell-rules";
import { StoreChrome } from "@/components/layout/StoreChrome";

const COPY = {
  en: {
    eyebrow: "Error 404",
    title: "We couldn’t find that page",
    body: "The link may be old, or the page may have moved. Try the shop, or start from one of our categories.",
    home: "Back to the home page",
    shop: "Browse the shop",
    browse: "Or browse",
    newIn: "New in",
  },
  ar: {
    eyebrow: "خطأ 404",
    title: "تعذّر العثور على هذه الصفحة",
    body: "ربما يكون الرابط قديمًا أو نُقلت الصفحة إلى مكان آخر. تصفّح المتجر، أو ابدأ من إحدى الفئات.",
    home: "العودة إلى الصفحة الرئيسية",
    shop: "تصفّح المتجر",
    browse: "أو تصفّح",
    newIn: "وصل حديثًا",
  },
} as const;

/** The 404 body; rendered inside the store frame by app/(store)/not-found.tsx and below. */
export async function NotFoundContent() {
  const [locale, nav] = await Promise.all([getLocale(), getNavigation()]);
  const c = COPY[locale];
  const links = [
    ...nav.categories.map((cat) => ({ href: categoryHref(cat.slug), label: locale === "ar" ? cat.name.ar : cat.name.en })),
    { href: NEW_IN_HREF, label: c.newIn },
  ];

  return (
    <section className="container-x flex min-h-[60vh] flex-col justify-center py-20 md:py-28">
      <div className="flex max-w-3xl flex-col gap-5">
        <p className="t-eyebrow">{c.eyebrow}</p>
        <h1 className="t-display text-balance">{c.title}</h1>
        <p className="max-w-xl text-[1.0625rem] leading-relaxed text-text-secondary md:text-lg">{c.body}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className={buttonClasses("primary", "lg", false, "sm:min-w-44")}>
            {c.shop}
          </Link>
          <Link href="/" className={buttonClasses("secondary", "lg", false, "sm:min-w-44")}>
            {c.home}
          </Link>
        </div>
      </div>

      {links.length > 1 ? (
        <nav aria-labelledby="nf-browse" className="mt-16 flex flex-col gap-4 border-t border-border pt-8 md:mt-24">
          <h2 id="nf-browse" className="t-eyebrow">
            {c.browse}
          </h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center font-display text-[1.5rem] leading-none hover:underline underline-offset-[6px] decoration-1 rtl:text-[1.25rem] rtl:font-semibold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}

/** Unknown URLs render outside every route group, so add the store frame here. */
export default async function NotFound() {
  const locale = await getLocale();
  return (
    <StoreChrome locale={locale}>
      <NotFoundContent />
    </StoreChrome>
  );
}
