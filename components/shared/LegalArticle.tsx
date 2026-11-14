/* ══════════════════════════════════════════════════════════════
   LegalArticle — editorial layout for policy and help pages
   ──────────────────────────────────────────────────────────────
   Title, intro, last-updated date, then numbered sections in a
   readable measure. Long pages get a table of contents: sticky
   beside the text on desktop, a collapsible list on phones.
   Content is structured data (no HTML strings): paragraphs,
   lists, steps and small tables. Inline **bold** and
   [label](href) links are the only markup understood.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "table"; rows: [string, string][]; caption?: string };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  eyebrow: string;
  title: string;
  intro: string;
  /** ISO date (YYYY-MM-DD). */
  updated: string;
  sections: LegalSection[];
}

interface LegalArticleProps {
  doc: LegalDocument;
  locale: string;
  labels: { updated: string; onThisPage: string };
  /** Extra content after the sections (e.g. a contact panel). */
  aside?: ReactNode;
}

/** Inline markup: **bold** and [label](href). Everything else is plain text. */
export function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i} className="font-medium text-text-primary">{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const cls = "text-text-primary underline decoration-border-hover underline-offset-4 hover:decoration-text-primary";
      if (href.startsWith("/") && !href.startsWith("//")) {
        return (
          <Link key={i} href={href} className={cls}>
            {label}
          </Link>
        );
      }
      if (/^(mailto:|tel:|https:\/\/)/.test(href)) {
        const ltr = href.startsWith("mailto:") || href.startsWith("tel:");
        return (
          <a key={i} href={href} className={cls} dir={ltr ? "ltr" : undefined} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {label}
          </a>
        );
      }
      return label;
    }
    return part;
  });
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return <p>{renderInline(block.text)}</p>;
    case "list":
      return (
        <ul className="flex list-disc flex-col gap-2 ps-5 marker:text-text-faint">
          {block.items.map((item, i) => (
            <li key={i} className="ps-1">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="flex list-decimal flex-col gap-2 ps-5 marker:text-text-muted marker:tabular-nums">
          {block.items.map((item, i) => (
            <li key={i} className="ps-1">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <table className="w-full border-collapse text-[0.875rem]">
          {block.caption ? <caption className="mb-2 text-start text-[0.8125rem] text-text-muted">{block.caption}</caption> : null}
          <tbody>
            {block.rows.map(([label, value]) => (
              <tr key={label} className="border-b border-border first:border-t">
                <th scope="row" className="py-3 pe-4 text-start font-normal text-text-secondary">
                  {label}
                </th>
                <td className="py-3 text-end font-medium text-text-primary tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export function LegalArticle({ doc, locale, labels, aside }: LegalArticleProps) {
  const showToc = doc.sections.length >= 4;
  const updated = new Date(`${doc.updated}T00:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const toc = (
    <ol className="flex flex-col">
      {doc.sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-3 py-1.5 text-[0.8125rem] leading-snug text-text-secondary transition-colors hover:text-text-primary"
          >
            <span className="w-5 shrink-0 text-text-faint tabular-nums">{pad(i + 1)}</span>
            {s.heading}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <article className="container-x py-14 md:py-20">
      <header className="border-b border-border pb-10 md:pb-14">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="t-eyebrow">{doc.eyebrow}</p>
          <h1 className="t-h1">{doc.title}</h1>
          <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-text-secondary md:text-lg">{renderInline(doc.intro)}</p>
          <p className="text-[0.8125rem] text-text-muted">
            {labels.updated}: <time dateTime={doc.updated}>{updated}</time>
          </p>
        </div>
      </header>

      <div className={showToc ? "grid gap-10 pt-10 md:pt-14 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-20" : "pt-10 md:pt-14"}>
        {showToc ? (
          <>
            <nav aria-label={labels.onThisPage} className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-height)+2.5rem)] flex flex-col gap-3">
                <p className="t-eyebrow">{labels.onThisPage}</p>
                {toc}
              </div>
            </nav>
            <details className="group border-y border-border lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
                {labels.onThisPage}
                <span aria-hidden="true" className="relative size-3">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform group-open:scale-y-0" />
                </span>
              </summary>
              <div className="pb-4">{toc}</div>
            </details>
          </>
        ) : null}

        <div className="flex max-w-2xl flex-col gap-12 md:gap-14">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-[calc(var(--header-height)+1.5rem)]">
              <h2 id={`${s.id}-h`} className="mb-4 flex items-baseline gap-3 text-[1.1875rem] font-medium leading-snug text-text-primary">
                <span aria-hidden="true" className="text-[0.8125rem] font-normal text-text-faint tabular-nums">
                  {pad(i + 1)}
                </span>
                {s.heading}
              </h2>
              <div className="flex flex-col gap-4 text-[0.9375rem] leading-7 text-text-secondary">
                {s.blocks.map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </div>
            </section>
          ))}
          {aside}
        </div>
      </div>
    </article>
  );
}
