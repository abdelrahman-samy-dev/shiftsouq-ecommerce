"use client";

/* ══════════════════════════════════════════════════════════════
   ProductGallery — photos of the selected colour
   ──────────────────────────────────────────────────────────────
   One list of images, two layouts (pure CSS, no duplicate DOM):
   • phones/tablets: a swipeable scroll-snap carousel with a
     "2 / 5" counter and dots;
   • desktop: a two-column stack on the sand ground, the first
     photo across both columns (see galleryLayout()).
   The first photo is the page's LCP: preloaded, real `sizes`.
   Any photo opens the full-screen viewer.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { galleryLayout, type PdpImage } from "./pdp-logic";
import { pdpCopy } from "./pdp-copy";
import { useHydrated } from "./use-hydrated";

const ImageViewer = dynamic(() => import("./ImageViewer"), { ssr: false });

/** Matches the page grid: gallery = viewport minus the info column on desktop. */
const SIZES_FULL = "(max-width: 1023px) 100vw, (max-width: 1279px) calc(100vw - 480px), min(calc(100vw - 600px), 1040px)";
const SIZES_HALF = "(max-width: 1023px) 100vw, (max-width: 1279px) calc(50vw - 240px), min(calc(50vw - 300px), 520px)";

interface ProductGalleryProps {
  images: PdpImage[];
  productName: string;
  locale: Locale;
}

export default function ProductGallery({ images, productName, locale }: ProductGalleryProps) {
  const copy = pdpCopy(locale);
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<{ open: boolean; index: number } | null>(null);
  const hydrated = useHydrated();
  const layout = galleryLayout(images.length);
  const count = images.length;

  // Which slide is in view (phones): the one at least 60% visible.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index ?? 0));
        }
      },
      { root: track, threshold: 0.6 },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [count]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-[0.8125rem] text-text-muted">
        {copy.noImage}
      </div>
    );
  }

  const goTo = (index: number) => {
    const slide = trackRef.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label={copy.productImages}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
          "lg:grid lg:grid-cols-2 lg:gap-1.5 lg:overflow-visible lg:snap-none",
        )}
      >
        {images.map((img, i) => (
          <li
            key={img.id}
            data-index={i}
            className={cn("relative w-full shrink-0 snap-start snap-always lg:w-auto", layout[i] === "full" && "lg:col-span-2")}
          >
            <button
              type="button"
              onClick={() => setViewer({ open: true, index: i })}
              className="group/img relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-surface focus-visible:outline-offset-[-4px]"
            >
              {/* Only the first photo is in the server HTML, so nothing competes with it
                  for the first paint; the rest join right after hydration (boxes are
                  already sized, so nothing moves). */}
              {i === 0 || hydrated ? (
                <Image
                  src={img.url}
                  alt={img.alt || productName}
                  fill
                  sizes={layout[i] === "full" ? SIZES_FULL : SIZES_HALF}
                  preload={i === 0}
                  fetchPriority={i === 0 ? "high" : undefined}
                  loading={i === 0 ? undefined : "lazy"}
                  className="object-cover"
                />
              ) : null}
              <span className="sr-only">{copy.enlarge(i + 1)}</span>
            </button>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 pb-4 lg:hidden">
          <span
            className="rounded-[2px] bg-background/85 px-2 py-1 text-[0.75rem] tabular-nums text-text-primary"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">{copy.imageOf(active + 1, count)}</span>
            <span aria-hidden="true" dir="ltr">
              {active + 1} / {count}
            </span>
          </span>
          <span className="pointer-events-auto flex items-center gap-1.5" aria-hidden="true">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                tabIndex={-1}
                onClick={() => goTo(i)}
                className={cn(
                  "size-1.5 rounded-full transition-[background-color,transform] duration-200",
                  i === active ? "scale-125 bg-text-primary" : "bg-text-primary/30",
                )}
              />
            ))}
          </span>
        </div>
      ) : null}

      {viewer ? (
        <ImageViewer
          images={images}
          productName={productName}
          locale={locale}
          open={viewer.open}
          index={viewer.index}
          onIndexChange={(index) => setViewer({ open: true, index })}
          onClose={() => setViewer((v) => (v ? { ...v, open: false } : v))}
        />
      ) : null}
    </div>
  );
}
