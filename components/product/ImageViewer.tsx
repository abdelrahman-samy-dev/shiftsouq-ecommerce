"use client";

/* ══════════════════════════════════════════════════════════════
   ImageViewer — full-screen photo viewer (ds Dialog)
   ──────────────────────────────────────────────────────────────
   • Previous / next buttons, ← → keys (mirrored in Arabic), Esc
     (native <dialog>), "2 / 5" counter.
   • Swipe left/right on touch screens.
   • Zoom: tap or click a photo (or the zoom button) to see it at
     2.2×; on touch, drag to pan; with a mouse the photo follows
     the pointer. Native pinch-zoom stays available.
   Loaded only when a photo is first opened.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Dialog } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { PdpImage } from "./pdp-logic";
import { pdpCopy } from "./pdp-copy";

interface ImageViewerProps {
  images: PdpImage[];
  productName: string;
  locale: Locale;
  open: boolean;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const ZOOM = 2.2;

/* The ds Dialog is a centred panel; these overrides make it full screen. */
const FULLSCREEN =
  "m-0! h-dvh! max-h-none! w-screen! max-w-none! rounded-none! bg-background! " +
  "[&>div]:h-full [&>div]:max-h-none! [&>div>div:first-child]:justify-end [&>div>div:first-child]:py-2! " +
  "[&>div>div:last-child]:p-0! [&>div>div:last-child]:overflow-hidden!";

export default function ImageViewer({ images, productName, locale, open, index, onIndexChange, onClose }: ImageViewerProps) {
  const copy = pdpCopy(locale);
  const isAr = locale === "ar";
  const count = images.length;
  const current = images[Math.min(index, count - 1)];
  const [zoomed, setZoomed] = useState(false);
  const zoomRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  function go(delta: number) {
    setZoomed(false);
    onIndexChange((index + delta + count) % count);
  }

  // Arrow keys while open; in Arabic the next photo is on the left.
  const onArrowKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(e.key === (isAr ? "ArrowLeft" : "ArrowRight") ? 1 : -1);
  });
  useEffect(() => {
    if (!open || count < 2) return;
    const onKey = (e: KeyboardEvent) => onArrowKey(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);

  function close() {
    setZoomed(false);
    onClose();
  }

  /* Zoom: centre the scroll position on the point that was clicked. */
  function zoomAt(clientX: number, clientY: number) {
    setZoomed(true);
    requestAnimationFrame(() => {
      const box = zoomRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      box.scrollLeft = fx * (box.scrollWidth - box.clientWidth);
      box.scrollTop = fy * (box.scrollHeight - box.clientHeight);
    });
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onPointerUp(e: ReactPointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId || zoomed || count < 2) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Swiping towards the reading direction's start shows the next photo.
    const next = isAr ? dx > 0 : dx < 0;
    go(next ? 1 : -1);
  }

  /* With a mouse, the zoomed photo follows the pointer. */
  function onZoomPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget;
    const rect = box.getBoundingClientRect();
    box.scrollLeft = ((e.clientX - rect.left) / rect.width) * (box.scrollWidth - box.clientWidth);
    box.scrollTop = ((e.clientY - rect.top) / rect.height) * (box.scrollHeight - box.clientHeight);
  }

  if (!current) return null;
  const alt = current.alt || productName;

  return (
    <Dialog open={open} onClose={close} title={copy.productImages} hideTitle closeLabel={copy.close} className={FULLSCREEN}>
      <div className="flex h-full flex-col">
        <div
          className="relative min-h-0 flex-1 touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          {zoomed ? (
            <div
              ref={zoomRef}
              dir="ltr"
              onPointerMove={onZoomPointerMove}
              onClick={() => setZoomed(false)}
              className="no-scrollbar absolute inset-0 cursor-zoom-out overflow-auto overscroll-contain bg-surface"
            >
              <div className="relative" style={{ width: `${ZOOM * 100}%`, height: `${ZOOM * 100}%` }}>
                <Image src={current.url} alt={alt} fill sizes="200vw" className="object-contain" />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => zoomAt(e.clientX, e.clientY)}
              aria-label={`${alt} — ${copy.zoomIn}`}
              className="absolute inset-0 cursor-zoom-in [touch-action:pan-y_pinch-zoom]"
            >
              <Image key={current.id} src={current.url} alt="" fill sizes="100vw" className="object-contain" />
            </button>
          )}

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={copy.prevImage}
                className="absolute start-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-text-primary transition-colors hover:bg-background md:start-6"
              >
                <ChevronLeft className="size-5 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={copy.nextImage}
                className="absolute end-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-text-primary transition-colors hover:bg-background md:end-6"
              >
                <ChevronRight className="size-5 rtl:-scale-x-100" strokeWidth={1.5} />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-t border-border px-5">
          <p className="text-[0.8125rem] tabular-nums text-text-secondary" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{copy.imageOf(index + 1, count)}</span>
            <span aria-hidden="true" dir="ltr">
              {index + 1} / {count}
            </span>
          </p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {count > 1
              ? images.map((img, i) => (
                  <span
                    key={img.id}
                    className={cn("size-1.5 rounded-full", i === index ? "bg-text-primary" : "bg-text-primary/25")}
                  />
                ))
              : null}
          </div>
          <button
            type="button"
            onClick={() => (zoomed ? setZoomed(false) : zoomAt(window.innerWidth / 2, window.innerHeight / 2))}
            aria-pressed={zoomed}
            className="inline-flex h-11 items-center gap-2 px-2 text-[0.8125rem] text-text-primary hover:underline underline-offset-4"
          >
            {zoomed ? <Minus className="size-4" strokeWidth={1.5} /> : <Plus className="size-4" strokeWidth={1.5} />}
            {zoomed ? copy.zoomOut : copy.zoomIn}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
