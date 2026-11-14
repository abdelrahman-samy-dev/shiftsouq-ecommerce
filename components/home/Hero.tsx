/* ══════════════════════════════════════════════════════════════
   Hero — full-bleed photograph, display headline, one action
   ──────────────────────────────────────────────────────────────
   Sits under the transparent header (pulled up by the header
   height). The photograph is the page's LCP element: it is the
   only image preloaded (in <head>, high priority), at 100vw.

   Wide screens: the words sit over the photo on the side with
   free space (`align`, a physical side, the same in English and
   Arabic so text never lands on the model). `tone` picks ink
   type for light photos or white type with soft scrims for dark
   ones. Phones: the photo keeps its subject in frame and the
   words follow below it on paper, readable on any photo.
   The headline is the page's single <h1>.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface HeroContent {
  image: string | null;
  imageAlt: string;
  title: string;
  /** Read by screen readers and search engines before the headline (store name). */
  srPrefix?: string;
  subtitle: string;
  cta: { label: string; href: string };
  tone: "light" | "dark";
  align: "left" | "right";
  credit?: { label: string; href: string | null } | null;
}

export function Hero({ content }: { content: HeroContent }) {
  const { image, imageAlt, title, srPrefix, subtitle, cta, credit } = content;
  // Without a photo the block is ink with white type.
  const tone = image ? content.tone : "light";
  const right = content.align === "right";
  const external = /^https?:\/\//.test(cta.href);
  const dark = tone === "dark";

  return (
    <section aria-label={title} className="relative isolate -mt-[var(--header-height)] md:h-[max(36rem,min(92svh,60rem))]">
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden sm:aspect-[3/2] md:absolute md:inset-0 md:aspect-auto",
          image ? "bg-surface-inset" : "bg-text-primary dark:bg-surface",
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={imageAlt}
            fill
            preload
            fetchPriority="high"
            sizes="100vw"
            quality={75}
            className={cn("object-cover md:object-[50%_35%]", right ? "object-[28%_30%]" : "object-[72%_30%]")}
          />
        ) : null}

        {/* Scrims for white type: the header strip always, the text side on wide screens. */}
        {!dark ? (
          <>
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 hidden w-3/5 md:block",
                right ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r",
                "from-black/50 via-black/20 to-transparent",
              )}
            />
          </>
        ) : null}

        {credit ? (
          <p
            className={cn(
              "absolute bottom-3 z-10 text-[0.6875rem]",
              right ? "left-4 md:left-[var(--gutter)]" : "right-4 md:right-[var(--gutter)]",
              dark ? "text-black/55" : "text-white/70",
            )}
          >
            {credit.href ? (
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">
                {credit.label}
              </a>
            ) : (
              credit.label
            )}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "container-x relative flex flex-col gap-4 pb-12 pt-8 md:absolute md:inset-0 md:justify-end md:gap-6 md:pb-20 md:pt-0 lg:justify-center lg:pb-0",
          // Physical side on wide screens, whatever the reading direction.
          right ? "ltr:md:items-end rtl:md:items-start" : "ltr:md:items-start rtl:md:items-end",
          dark ? "md:text-black/90" : "md:text-white",
        )}
      >
        <div className="flex max-w-xl flex-col items-start gap-4 md:gap-6 md:[align-items:inherit]">
          <h1 className={cn("t-display max-w-[14ch] text-balance", dark ? "md:text-black/90!" : "md:text-white!")}>
            {srPrefix ? <span className="sr-only">{srPrefix} — </span> : null}
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("max-w-[40ch] text-base text-text-secondary md:text-lg", dark ? "md:text-black/70" : "md:text-white/85")}>
              {subtitle}
            </p>
          ) : null}
          <Link
            href={cta.href}
            prefetch={external ? false : undefined}
            className={cn(
              "mt-2 inline-flex h-13 min-w-44 items-center justify-center rounded-sm px-8 text-[0.9375rem] font-medium transition-opacity hover:opacity-85",
              "bg-primary text-primary-foreground",
              dark ? "md:bg-black md:text-white" : "md:bg-white md:text-black",
            )}
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
