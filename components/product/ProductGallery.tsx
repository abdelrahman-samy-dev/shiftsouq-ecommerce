"use client";

/* ══════════════════════════════════════════════════════════════
   ProductGallery — Image Gallery with Zoom Lightbox
   ──────────────────────────────────────────────────────────────
   Elevated image gallery with thumbnail strip + full-screen
   zoom overlay (lightbox). Supports LTR/RTL, dark mode,
   keyboard navigation, and smooth transitions.

   Architecture:
   - Main gallery with primary image + navigation arrows
   - Scrollable thumbnail strip for quick image selection
   - Portal-based lightbox for full-screen zoom viewing
   ══════════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ProductImage } from "@/lib/types";

/* ── Types ───────────────────────────────────────────────────── */

interface ProductGalleryProps {
  /** Array of product images sorted by `sort_order`. */
  images: ProductImage[];
  /** Product name used as fallback alt text. */
  productName: string;
  /** Current display locale for RTL/alt text. */
  locale: string;
}

/* ── Component ───────────────────────────────────────────────── */

/**
 * ProductGallery renders a primary image viewer with thumbnails
 * and an optional full-screen zoom lightbox.
 *
 * Accessibility:
 * - Keyboard navigation (←/→/Escape) in lightbox mode
 * - Proper ARIA labels on all interactive elements
 * - Body scroll lock when lightbox is open
 * - Focus-visible indicators for keyboard users
 *
 * @param images      - Sorted product images array.
 * @param productName - Fallback alt text when image alt is empty.
 * @param locale      - "en" or "ar" for directional/alt text logic.
 */
export default function ProductGallery({
  images,
  productName,
  locale,
}: ProductGalleryProps) {
  const isAr = locale === "ar";
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  /** Track client-side mount for portal rendering */
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[activeIndex] : null;

  /**
   * Returns the localised alt text for a product image,
   * falling back to the product name when alt text is missing.
   */
  const getAlt = useCallback(
    (img: ProductImage) =>
      (isAr ? img.alt_text_ar : img.alt_text_en) || productName,
    [isAr, productName]
  );

  /** Navigate to the next image (wraps around) */
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  /** Navigate to the previous image (wraps around) */
  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  /** Open the lightbox overlay */
  const openZoom = useCallback(() => setIsZoomed(true), []);

  /** Close the lightbox overlay */
  const closeZoom = useCallback(() => setIsZoomed(false), []);

  /**
   * Handles keyboard navigation within the zoom lightbox.
   * ArrowRight/Left for image cycling, Escape to close.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isZoomed) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closeZoom();
    },
    [isZoomed, goNext, goPrev, closeZoom]
  );

  /** Attach/detach keyboard listener and body scroll lock */
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isZoomed, handleKeyDown]);

  return (
    <>
      {/* ── Main Gallery ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Primary Image */}
        <div
          className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {activeImage ? (
            <>
              <Image
                key={activeImage.id}
                src={activeImage.url}
                alt={getAlt(activeImage)}
                fill
                priority
                className="object-contain object-center transition-opacity duration-500 animate-fade-in"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              {/* Zoom trigger */}
              <button
                type="button"
                className="absolute top-3 end-3 z-10 btn-icon w-10 h-10 bg-background/80 backdrop-blur-sm border-border/60 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={openZoom}
                aria-label={isAr ? "تكبير الصورة" : "Zoom image"}
              >
                <ZoomIn size={18} strokeWidth={1.5} />
              </button>

              {/* Navigation arrows (only if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute start-3 top-1/2 -translate-y-1/2 z-10 btn-icon w-10 h-10 bg-background/80 backdrop-blur-sm border-border/60 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label={isAr ? "الصورة السابقة" : "Previous image"}
                  >
                    {isAr ? (
                      <ChevronRight size={18} />
                    ) : (
                      <ChevronLeft size={18} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute end-3 top-1/2 -translate-y-1/2 z-10 btn-icon w-10 h-10 bg-background/80 backdrop-blur-sm border-border/60 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label={isAr ? "الصورة التالية" : "Next image"}
                  >
                    {isAr ? (
                      <ChevronLeft size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                </>
              )}
            </>
          ) : (
            /* Placeholder when no images */
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-text-faint">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface-inset)" }}
              >
                <ZoomIn size={28} strokeWidth={1} />
              </div>
              <span className="text-sm">
                {isAr ? "لا توجد صورة" : "No image available"}
              </span>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div
            className="flex gap-2.5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
            role="tablist"
            aria-label={isAr ? "صور المنتج" : "Product images"}
          >
            {images.map((img, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`${isAr ? "عرض الصورة" : "View image"} ${idx + 1}`}
                  aria-selected={isActive}
                  className="relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{
                    borderColor: isActive
                      ? "var(--primary)"
                      : "var(--border)",
                    opacity: isActive ? 1 : 0.6,
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <Image
                    src={img.url}
                    alt={getAlt(img)}
                    fill
                    className="object-cover object-center transition-transform duration-300 hover:scale-110"
                    sizes="72px"
                  />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-1 start-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Image counter pill */}
        {images.length > 1 && (
          <div className="flex justify-center">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-muted)",
              }}
              aria-live="polite"
            >
              {activeIndex + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Zoom Overlay / Lightbox ───────────────────────────── */}
      {mounted &&
        isZoomed &&
        activeImage &&
        createPortal(
          <AnimatePresence>
            {isZoomed && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl"
                onClick={closeZoom}
                role="dialog"
                aria-modal="true"
                aria-label={isAr ? "تكبير الصورة" : "Image zoom"}
              >
            {/* Close */}
            <button
              type="button"
              className="absolute top-4 end-4 md:top-8 md:end-8 z-[60] rounded-full bg-white/10 border border-white/20 hover:bg-white/25 hover:scale-110 flex items-center justify-center w-12 h-12 !text-white transition-all backdrop-blur-md shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={closeZoom}
              aria-label={isAr ? "إغلاق" : "Close zoom"}
            >
              <X size={24} />
            </button>

            {/* Prev/Next in lightbox */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute start-4 md:start-8 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 border border-white/20 hover:bg-white/25 hover:scale-110 flex items-center justify-center w-12 h-12 !text-white transition-all backdrop-blur-md shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label={isAr ? "السابق" : "Previous"}
                >
                  {isAr ? (
                    <ChevronRight size={24} />
                  ) : (
                    <ChevronLeft size={24} />
                  )}
                </button>
                <button
                  type="button"
                  className="absolute end-4 md:end-8 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/10 border border-white/20 hover:bg-white/25 hover:scale-110 flex items-center justify-center w-12 h-12 !text-white transition-all backdrop-blur-md shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label={isAr ? "التالي" : "Next"}
                >
                  {isAr ? (
                    <ChevronLeft size={24} />
                  ) : (
                    <ChevronRight size={24} />
                  )}
                </button>
              </>
            )}

            {/* Zoomed Image Container */}
            <div
              className="relative w-full h-full p-4 md:p-12 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  key={activeImage.id + "-zoom"}
                  src={activeImage.url}
                  alt={getAlt(activeImage)}
                  fill
                  unoptimized
                  className="object-contain animate-scale-in"
                  sizes="100vw"
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>

            {/* Counter dots in lightbox */}
            {images.length > 1 && (
              <div className="absolute bottom-6 md:bottom-10 start-1/2 -translate-x-1/2 flex gap-2 z-[60]">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(idx);
                    }}
                    className="h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    style={{
                      background:
                        idx === activeIndex
                          ? "#ffffff"
                          : "rgba(255,255,255,0.3)",
                      width: idx === activeIndex ? "24px" : "8px",
                    }}
                    aria-label={`${isAr ? "انتقل للصورة" : "Go to image"} ${idx + 1}`}
                  />
                ))}
              </div>
            )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
