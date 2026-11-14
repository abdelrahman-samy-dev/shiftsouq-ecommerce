"use client";

/* ══════════════════════════════════════════════════════════════
   ErrorState — what every error.tsx boundary shows
   ──────────────────────────────────────────────────────────────
   Editorial and calm: eyebrow, display title, one sentence, a
   retry button and one way out. Bilingual through useLocale();
   props accept a plain string or { en, ar }. The digest is shown
   as a reference the customer can quote to support.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useLocale, pickLocalized, type Localized } from "@/components/providers/LocaleProvider";
import { Button, buttonClasses } from "@/components/ds/Button";

interface ErrorStateProps {
  title?: Localized;
  message?: Localized;
  digest?: string;
  onReset: () => void;
  retryLabel?: Localized;
  secondaryHref?: string;
  secondaryLabel?: Localized;
  /** Kept for existing callers; the layout no longer uses icons. */
  secondaryIcon?: "home" | "shop" | "back";
}

const DEFAULTS = {
  title: { en: "Something went wrong", ar: "حدث خطأ ما" },
  message: {
    en: "We couldn't load this page. Please try again; if it keeps happening, come back in a few minutes.",
    ar: "تعذّر تحميل هذه الصفحة. يرجى المحاولة مرة أخرى، وإن تكرر الخطأ فعُد بعد بضع دقائق.",
  },
  retryLabel: { en: "Try again", ar: "إعادة المحاولة" },
  secondaryLabel: { en: "Back to the home page", ar: "العودة إلى الصفحة الرئيسية" },
  eyebrow: { en: "Error", ar: "خطأ" },
  reference: { en: "Reference", ar: "الرقم المرجعي" },
} satisfies Record<string, Localized>;

export default function ErrorState({
  title = DEFAULTS.title,
  message = DEFAULTS.message,
  digest,
  onReset,
  retryLabel = DEFAULTS.retryLabel,
  secondaryHref = "/",
  secondaryLabel = DEFAULTS.secondaryLabel,
}: ErrorStateProps) {
  const locale = useLocale();

  return (
    <section className="container-x flex min-h-[60vh] flex-col justify-center py-20 md:py-28">
      <div className="flex max-w-2xl flex-col gap-5">
        <p className="t-eyebrow">{pickLocalized(DEFAULTS.eyebrow, locale)}</p>
        <h1 className="t-h1">{pickLocalized(title, locale)}</h1>
        <p className="max-w-xl text-[1.0625rem] leading-relaxed text-text-secondary">{pickLocalized(message, locale)}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onReset} className="sm:min-w-44">
            {pickLocalized(retryLabel, locale)}
          </Button>
          <Link href={secondaryHref} className={buttonClasses("secondary", "lg", false, "sm:min-w-44")}>
            {pickLocalized(secondaryLabel, locale)}
          </Link>
        </div>
        {digest ? (
          <p className="mt-6 text-[0.8125rem] text-text-muted">
            {pickLocalized(DEFAULTS.reference, locale)}:{" "}
            <code dir="ltr" className="select-all font-mono text-text-secondary">
              {digest}
            </code>
          </p>
        ) : null}
      </div>
    </section>
  );
}
