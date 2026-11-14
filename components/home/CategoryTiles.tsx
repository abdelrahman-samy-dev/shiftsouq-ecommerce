/* Category tiles — editorial grid of top-level categories (2 columns on phones, 3–4 on desktop). */

import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/ds/Display";
import { cn } from "@/lib/utils";

export interface CategoryTile {
  href: string;
  name: string;
  image: string | null;
}

export function CategoryTiles({
  tiles,
  eyebrow,
  title,
  cta,
}: {
  tiles: CategoryTile[];
  eyebrow: string;
  title: string;
  cta: string;
}) {
  if (!tiles.length) return null;
  const n = tiles.length;
  // Desktop columns follow the count so a row is never left with one orphan tile.
  const cols = n === 1 ? "md:grid-cols-1" : n === 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-4";
  // Odd counts on phones: the first tile runs full width.
  const oddFirst = n % 2 === 1;
  // Image widths follow the same column count (1–3 columns, or 3 then 4 from xl).
  const desktopSizes = n >= 4 ? "(max-width: 1279px) 33vw, 25vw" : `${Math.round(100 / n)}vw`;

  return (
    <section aria-labelledby="home-categories" className="py-16 md:py-24">
      <div className="container-x">
        <SectionHeader title={<span id="home-categories">{title}</span>} eyebrow={eyebrow} />
        <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-4 xl:gap-x-5", cols)}>
          {tiles.map((tile, i) => {
            const wide = oddFirst && i === 0;
            return (
              <li key={tile.href} className={cn(wide && "col-span-2 md:col-span-1")}>
                <Link href={tile.href} className="group flex flex-col gap-3">
                  <div className={cn("relative overflow-hidden bg-surface", wide ? "aspect-[4/3] md:aspect-[3/4]" : "aspect-[3/4]")}>
                    {tile.image ? (
                      <Image
                        src={tile.image}
                        alt=""
                        fill
                        sizes={`(max-width: 767px) ${wide ? 100 : 50}vw, ${desktopSizes}`}
                        className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-[1.375rem] leading-tight md:text-[1.625rem] rtl:text-[1.125rem] rtl:font-semibold md:rtl:text-[1.3125rem]">
                      {tile.name}
                    </span>
                    {/* Half-width phone tiles keep just the name; the whole tile is the link. */}
                    <span
                      className={cn(
                        "shrink-0 text-[0.8125rem] text-text-muted underline decoration-transparent underline-offset-4 transition-colors group-hover:text-text-primary group-hover:decoration-current",
                        !wide && "max-md:hidden",
                      )}
                    >
                      {cta}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
