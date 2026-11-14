/* ══════════════════════════════════════════════════════════════
   Hero — full-bleed photograph, display headline, one action
   ──────────────────────────────────────────────────────────────
   Sits under the transparent header (pulled up by the header
   height). The photograph is the page's LCP element: it is the
   only image preloaded (in <head>, high priority), served at 100vw.
   Two soft scrims keep white type and the header readable on
   any photo. The headline is the page's single <h1>.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ds/Button";
import { cn } from "@/lib/utils";

export interface HeroContent {
  image: string | null;
  imageAlt: string;
  title: string;
  /** Read by screen readers and search engines before the headline (store name). */
  srPrefix?: string;
  subtitle: string;
  cta: { label: string; href: string };
}

export function Hero({ content }: { content: HeroContent }) {
  const { image, imageAlt, title, srPrefix, subtitle, cta } = content;
  const external = /^https?:\/\//.test(cta.href);

  return (
    <section
      aria-label={title}
      className={cn(
        "relative -mt-[var(--header-height)] isolate flex h-[max(34rem,min(92svh,60rem))] flex-col overflow-hidden",
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
          className="-z-10 object-cover object-[50%_35%]"
        />
      ) : null}
      {/* Scrims: header readability at the top, headline at the bottom. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b from-black/45 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

      <div className="container-x mt-auto flex flex-col items-start gap-5 pb-12 text-white md:gap-6 md:pb-20">
        <h1 className="t-display max-w-[16ch] text-white! text-balance">
          {srPrefix ? <span className="sr-only">{srPrefix} — </span> : null}
          {title}
        </h1>
        {subtitle ? <p className="max-w-[42ch] text-base text-white/85 md:text-lg">{subtitle}</p> : null}
        <Link
          href={cta.href}
          prefetch={external ? false : undefined}
          className={buttonClasses("inverse", "lg", false, "mt-2 min-w-44")}
        >
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
