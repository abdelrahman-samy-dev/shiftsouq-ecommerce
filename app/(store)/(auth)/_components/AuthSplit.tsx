/* ══════════════════════════════════════════════════════════════
   AuthSplit — the sign-in pages' frame
   Form on one side; on desktop an editorial panel on the other:
   the first featured category's photo, or a calm sand panel with
   the brand and what an account is for. Server component.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import type { ReactNode } from "react";
import { brand, t as localized } from "@/lib/brand/config";
import { getAuthEditorial } from "@/lib/dal/account";
import { authCopy } from "./copy";

export async function AuthSplit({ locale, children }: { locale: string; children: ReactNode }) {
  const t = authCopy(locale);
  const editorial = await getAuthEditorial();

  return (
    <div className="grid lg:min-h-[680px] lg:grid-cols-2">
      <div className="container-x flex items-start justify-center py-14 md:py-20 lg:items-center lg:py-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>

      <aside aria-hidden="true" className="relative hidden overflow-hidden bg-surface lg:block">
        {editorial ? (
          <>
            <Image src={editorial.image} alt="" fill sizes="50vw" className="object-cover" />
            <div className="absolute bottom-0 start-0 max-w-md bg-background p-10">
              <p className="t-eyebrow">{t.panelEyebrow}</p>
              <p className="t-h2 mt-3">{t.panelTitle}</p>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col justify-between p-12 xl:p-16">
            <p className="font-display text-2xl text-text-primary [&:lang(ar)]:font-semibold">{localized(brand.name, locale)}</p>
            <div className="flex max-w-md flex-col gap-8">
              <div className="flex flex-col gap-4">
                <p className="t-eyebrow">{t.panelEyebrow}</p>
                <p className="t-h1">{t.panelTitle}</p>
              </div>
              <ul className="flex flex-col border-t border-border-hover/60">
                {t.benefits.map((b) => (
                  <li key={b} className="border-b border-border-hover/60 py-4 text-sm text-text-secondary">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[0.8125rem] text-text-muted">{localized(brand.tagline, locale)}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
