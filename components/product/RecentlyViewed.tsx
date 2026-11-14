"use client";

/* ══════════════════════════════════════════════════════════════
   RecentlyViewed — products this browser looked at
   ──────────────────────────────────────────────────────────────
   Records the current product, then shows up to 8 others. Data
   lives in localStorage only (components/product/recently-
   viewed.ts), so nothing renders on the server or during
   hydration; the rail appears afterwards at the end of the page,
   below the fold, where it can't shift what the buyer is reading.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ds";
import type { Locale } from "@/lib/types";
import ProductRail from "./ProductRail";
import { RECENT_KEY, parseRecent, pushRecent, recentForDisplay, type RecentItem } from "./recently-viewed";
import { pdpCopy } from "./pdp-copy";
import { readStored, useStoredValue, writeStored } from "./use-stored-value";

interface RecentlyViewedProps {
  current: Omit<RecentItem, "viewedAt">;
  locale: Locale;
}

export default function RecentlyViewed({ current, locale }: RecentlyViewedProps) {
  const copy = pdpCopy(locale);
  const raw = useStoredValue(RECENT_KEY);
  const items = useMemo(() => recentForDisplay(parseRecent(raw), current.id), [raw, current.id]);

  // Remember this product (newest first).
  useEffect(() => {
    const list = parseRecent(readStored(RECENT_KEY));
    writeStored(RECENT_KEY, JSON.stringify(pushRecent(list, { ...current, viewedAt: Date.now() })));
  }, [current]);

  if (items.length === 0) return null;

  return (
    <ProductRail id="recently-viewed-title" title={copy.recentlyViewed} locale={locale} className="border-t border-border">
      {items.map((item) => (
        <RecentTile key={item.id} item={item} locale={locale} />
      ))}
    </ProductRail>
  );
}

function RecentTile({ item, locale }: { item: RecentItem; locale: Locale }) {
  const copy = pdpCopy(locale);
  const name = locale === "ar" ? item.name_ar || item.name_en : item.name_en;
  const href = `/product/${encodeURIComponent(item.slug)}`;
  return (
    <article className="flex flex-col">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-surface" tabIndex={-1} aria-hidden="true">
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 23vw" className="object-cover" />
        ) : null}
      </Link>
      <div className="flex flex-col gap-1 pt-3">
        <h3 className="text-sm leading-snug text-text-primary">
          <Link href={href} className="line-clamp-1 underline-offset-4 decoration-1 hover:underline">
            {name}
          </Link>
        </h3>
        <div className="flex items-baseline gap-1.5">
          {item.varies ? <span className="text-[0.8125rem] text-text-muted">{copy.from}</span> : null}
          <Price amount={item.price} compareAt={item.compareAt} locale={locale} size="sm" />
        </div>
      </div>
    </article>
  );
}
