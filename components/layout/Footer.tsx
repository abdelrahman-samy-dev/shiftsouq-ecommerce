/* ══════════════════════════════════════════════════════════════
   Footer — Global Site Footer
   ──────────────────────────────────────────────────────────────
   Server component rendering the site-wide footer with:
   - Brand info and description
   - Dynamic shop links from DB categories
   - Customer service links
   - Social media links
   - Copyright and legal links

   Semantic HTML: Uses <footer>, <nav>, and appropriate headings.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getNavCategories } from "@/lib/dal/categories";
import { Locale } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";

/* ── Brand Icon Components ────────────────────────────────── */

/** X (Twitter) brand icon SVG. */
const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[18px] h-[18px]"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/** Facebook brand icon SVG. */
const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[18px] h-[18px]"
    aria-hidden="true"
  >
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.021 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.969h-1.514c-1.491 0-1.956.93-1.956 1.875v2.282h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

/** Instagram brand icon SVG. */
const InstagramIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[18px] h-[18px]"
    aria-hidden="true"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

/* ── Footer Component ────────────────────────────────────── */

/**
 * Footer — The global site footer.
 *
 * Fetches dictionary and nav categories in parallel.
 * Shop links are dynamically generated from DB categories.
 *
 * @param locale - Current display locale.
 */
export default async function Footer({ locale = "en" }: { locale?: Locale }) {
  const [dict, navCategories] = await Promise.all([
    getDictionary(locale),
    getNavCategories(),
  ]);

  const isAr = locale === "ar";
  const year = new Date().getFullYear();
  const ft = dict.footer || ({} as Record<string, string>);

  /** Build the "Shop" section dynamically from DB categories */
  const shopLinks = navCategories.map((cat) => ({
    name: isAr ? cat.name_ar : cat.name_en,
    href: `/category/${cat.slug}`,
  }));

  return (
    <footer
      className="w-full bg-background border-t border-border pt-12 pb-6 text-text-primary transition-colors duration-300"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-border">
          {/* Column 1: Brand Info */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center group transition-transform group-hover:scale-[1.02]"
              aria-label="ShiftSouq Home"
            >
              <Logo locale={locale} size="sm" />
            </Link>
            <p className="text-[14px] text-text-muted leading-relaxed max-w-sm mt-2">
              {ft.brandDescription ||
                "Your ultimate destination for premium menswear and luxury accessories. Redefining modern elegance."}
            </p>
          </div>

          {/* Column 2: Shop */}
          <nav aria-label={isAr ? "روابط التسوق" : "Shop links"}>
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-base tracking-tight text-text-primary">
                {ft.shop || "Shop"}
              </h4>
              <ul className="flex flex-col gap-3">
                {shopLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-link inline-block">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Column 3: Customer Service */}
          <nav
            aria-label={isAr ? "خدمة العملاء" : "Customer service links"}
          >
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-base tracking-tight text-text-primary">
                {ft.customerService || "Customer Service"}
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link href="/contact" className="text-link inline-block">
                    {ft.contactUs || "Contact Us"}
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="text-link inline-block">
                    {ft.shipping || "Shipping"}
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-link inline-block">
                    {ft.returns || "Returns"}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* Column 4: Social */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-base tracking-tight text-text-primary">
              {ft.social || "Social"}
            </h4>
            <nav
              className="flex flex-col gap-3"
              aria-label={isAr ? "وسائل التواصل" : "Social media links"}
            >
              <a
                href="#"
                className="flex items-center gap-3 text-link"
                aria-label="Instagram"
                rel="noopener noreferrer"
              >
                <InstagramIcon />
                <span>Instagram</span>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 text-link"
                aria-label="Facebook"
                rel="noopener noreferrer"
              >
                <FacebookIcon />
                <span>Facebook</span>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 text-link"
                aria-label="X (Twitter)"
                rel="noopener noreferrer"
              >
                <XIcon />
                <span>X (Twitter)</span>
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Bar (Copyright, Links) */}
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-6 pt-6">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
            <p className="text-[13px] text-text-muted text-center lg:text-left font-medium">
              © {year} ShiftSouq.{" "}
              {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
            <div className="hidden lg:block w-px h-4 bg-border"></div>
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-[13px] font-medium text-text-muted">
              <Link
                href="/terms"
                className="hover:text-text-primary transition-colors"
              >
                {ft.termsConditions || "Terms & Conditions"}
              </Link>
              <Link
                href="/privacy-policy"
                className="hover:text-text-primary transition-colors"
              >
                {ft.privacyPolicy || "Privacy Policy"}
              </Link>
              <Link
                href="/refund-policy"
                className="hover:text-text-primary transition-colors"
              >
                {ft.refundPolicy || "Refund Policy"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
