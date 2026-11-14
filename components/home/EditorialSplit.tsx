/* Editorial split — one collection told as a story: photograph on one side, words on the other. */

import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ds/Button";

export interface EditorialContent {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  meta?: string;
  cta: string;
  image: string | null;
}

export function EditorialSplit({ content }: { content: EditorialContent }) {
  const { href, eyebrow, title, body, meta, cta, image } = content;
  return (
    <section aria-labelledby="home-editorial" className="py-8 md:py-12">
      <div className="grid bg-surface md:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-inset md:aspect-auto md:min-h-[42rem]">
          {image ? (
            <Image src={image} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" />
          ) : null}
        </div>
        <div className="flex flex-col justify-center gap-5 px-[var(--gutter)] py-14 md:px-12 md:py-20 xl:px-24">
          <p className="t-eyebrow text-text-secondary!">{eyebrow}</p>
          <h2 id="home-editorial" className="t-h1 max-w-[14ch] text-balance">
            {title}
          </h2>
          {body ? <p className="max-w-md text-text-secondary md:text-lg md:leading-relaxed">{body}</p> : null}
          {meta ? <p className="text-[0.8125rem] text-text-secondary tabular-nums">{meta}</p> : null}
          <Link href={href} prefetch={false} className={buttonClasses("secondary", "lg", false, "mt-3 self-start")}>
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
