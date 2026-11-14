/* ══════════════════════════════════════════════════════════════
   Collections — editorial index of curated sets
   Route: /collections
   ──────────────────────────────────────────────────────────────
   Large image tiles (the collection's image, or its first
   product's photo), title, short story and piece count. Only
   collections with products are listed; with none, a calm
   empty state (the header hides its link in that case).
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { getCollections } from "@/lib/dal/collections";
import { getRequestLocale } from "@/lib/seo/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { discoveryCopy } from "@/lib/search/copy";
import { cn } from "@/lib/utils";
import { Breadcrumbs, ButtonLink, EmptyState } from "@/components/ds";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = discoveryCopy(locale);
  return buildPageMetadata({ locale, title: copy.collections, description: copy.collectionsIntro, path: "/collections" });
}

export default async function CollectionsPage() {
  const [locale, collections] = await Promise.all([getRequestLocale(), getCollections()]);
  const copy = discoveryCopy(locale);
  const isAr = locale === "ar";
  // An odd number of tiles: the first one runs full width.
  const leadWide = collections.length % 2 === 1 && collections.length > 1;

  return (
    <div className="pb-24 md:pb-32">
      <header className="container-x pt-5 pb-10 md:pt-8 md:pb-16">
        <Breadcrumbs items={[{ label: copy.home, href: "/" }, { label: copy.collections }]} />
        <div className="mt-8 md:mt-14">
          <h1 className="t-h1">{copy.collections}</h1>
          <p className="mt-4 max-w-xl text-text-secondary">{copy.collectionsIntro}</p>
        </div>
      </header>

      {collections.length === 0 ? (
        <div className="container-x">
          <EmptyState
            title={copy.collectionsEmptyTitle}
            body={copy.collectionsEmptyBody}
            action={
              <ButtonLink href="/shop" variant="secondary">
                {copy.browseAll}
              </ButtonLink>
            }
            className="border-t border-border"
          />
        </div>
      ) : (
        <ul className="container-x grid grid-cols-1 gap-x-5 gap-y-14 md:grid-cols-2 md:gap-y-20">
          {collections.map((c, i) => {
            const title = isAr ? c.title_ar : c.title_en;
            const description = isAr ? c.description_ar : c.description_en;
            const wide = leadWide && i === 0;
            return (
              <li key={c.id} className={cn(wide && "md:col-span-2")}>
                <Link href={`/collections/${encodeURIComponent(c.slug)}`} className="group block">
                  <div className={cn("relative overflow-hidden bg-surface", wide ? "aspect-[4/5] md:aspect-[16/9]" : "aspect-[4/5] lg:aspect-[5/6]")}>
                    {c.cover ? (
                      <Image
                        src={c.cover.url}
                        alt={(isAr ? c.cover.alt_ar : c.cover.alt_en) || ""}
                        fill
                        sizes={wide ? "(min-width: 1600px) 1504px, 100vw" : "(min-width: 1600px) 742px, (min-width: 768px) 50vw, 100vw"}
                        loading={i < 2 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : undefined}
                        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : null}
                  </div>
                  <div className={cn("mt-5 flex flex-col gap-2", wide && "md:max-w-2xl")}>
                    <p className="t-eyebrow tabular-nums">{copy.pieces(c.productCount)}</p>
                    <h2 className="t-h2">{title}</h2>
                    {description ? <p className="line-clamp-2 max-w-xl text-text-secondary">{description}</p> : null}
                    <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                      <span className="underline decoration-border-hover underline-offset-4 transition-colors group-hover:decoration-text-primary">
                        {copy.explore}
                      </span>
                      <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={1.5} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
