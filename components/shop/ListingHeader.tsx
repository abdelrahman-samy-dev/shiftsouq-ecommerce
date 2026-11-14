/* ══════════════════════════════════════════════════════════════
   ListingHeader — breadcrumbs, title, count and quick links
   ──────────────────────────────────────────────────────────────
   Server component. The count arrives with the results (a
   Suspense slot), everything else renders immediately.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs, Eyebrow } from "@/components/ds/Display";
import { cn } from "@/lib/utils";

export interface QuickLink {
  label: string;
  href: string;
  active?: boolean;
}

export function ListingHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  count,
  links,
  linksLabel,
  aside,
}: {
  breadcrumbs: { label: string; href?: string }[];
  eyebrow?: string;
  title: ReactNode;
  description?: string | null;
  count?: ReactNode;
  links?: QuickLink[];
  linksLabel?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="container-x pt-5 pb-7 md:pt-8 md:pb-10">
      <Breadcrumbs items={breadcrumbs} />
      <div className="mt-8 flex flex-col gap-4 md:mt-14 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="min-w-0">
          {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
          <h1 className="t-h1 break-words">{title}</h1>
          {description ? <p className="mt-4 max-w-xl text-text-secondary">{description}</p> : null}
        </div>
        {count ? <p className="shrink-0 text-[0.8125rem] tabular-nums text-text-muted md:pb-1.5">{count}</p> : null}
      </div>
      {aside}
      {links && links.length > 0 ? (
        <nav aria-label={linksLabel} className="-mx-5 mt-7 md:mx-0 md:mt-9">
          <ul className="flex gap-2 overflow-x-auto px-5 no-scrollbar md:flex-wrap md:overflow-visible md:px-0">
            {links.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center rounded-sm border px-4 text-[0.8125rem] transition-colors",
                    link.active
                      ? "border-text-primary bg-text-primary text-background"
                      : "border-border text-text-primary hover:border-text-primary",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
