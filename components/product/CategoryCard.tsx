"use client";

/* ══════════════════════════════════════════════════════════════
   CategoryCard — Animated Category Tile
   ──────────────────────────────────────────────────────────────
   Displays a category with background image, gradient overlay,
   and premium Framer Motion hover scaling. Respects reduced
   motion preferences.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Category } from "@/lib/types";

interface CategoryCardProps {
  /** Category data to display. */
  category: Category;
  /** Current display locale. */
  locale?: string;
  /** Index within the grid, used for stagger delay. */
  index?: number;
}

/**
 * CategoryCard renders a single category tile with:
 * - Scroll-triggered fade-up entrance animation
 * - Smooth scale hover effect (no layout thrashing)
 * - Gradient overlay for text readability
 * - Full reduced-motion accessibility support
 *
 * @param category - Category data with image and names.
 * @param locale   - "en" or "ar" for localisation.
 * @param index    - Grid position for stagger delay.
 */
export default function CategoryCard({ category, locale = "en", index = 0 }: CategoryCardProps) {
  const isAr = locale === "ar";
  const name = isAr ? category.name_ar : category.name_en;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: prefersReducedMotion ? 0 : index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
    >
      <Link
        href={`/category/${category.slug}`}
        id={`category-${category.slug}`}
        className="category-card card-hover group relative flex flex-col items-center justify-end overflow-hidden rounded-2xl"
      >
        {/* Background image */}
        {category.image_url && (
          <Image
            src={category.image_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Label */}
        <div className="relative z-10 w-full px-4 pb-5 pt-16 text-center">
          <h3 className="text-lg font-semibold tracking-wide text-white md:text-xl">
            {name}
          </h3>
          <span className="mt-1 inline-block text-xs font-medium uppercase tracking-widest text-white/70 transition-colors group-hover:text-white">
            {isAr ? "تسوق الآن ←" : "Shop now →"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
