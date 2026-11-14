"use client";

/* Error boundary content for listing routes: calm, bilingual, no animation library (it ships with every listing page). */

import { Button, ButtonLink, EmptyState } from "@/components/ds";
import { useLocale } from "@/components/providers/LocaleProvider";

export function ListingError({
  reset,
  digest,
  title,
  body,
  link,
}: {
  reset: () => void;
  digest?: string;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  link: { href: string; label: { en: string; ar: string } };
}) {
  const locale = useLocale();
  return (
    <div className="container-x">
      <EmptyState
        title={title[locale]}
        body={
          <>
            {body[locale]}
            {digest ? <span className="mt-3 block text-[0.75rem] text-text-faint tabular-nums">{digest}</span> : null}
          </>
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>{locale === "ar" ? "إعادة المحاولة" : "Try again"}</Button>
            <ButtonLink href={link.href} variant="secondary">
              {link.label[locale]}
            </ButtonLink>
          </div>
        }
        className="min-h-[60vh] justify-center"
      />
    </div>
  );
}
