"use client";

/* ══════════════════════════════════════════════════════════════
   CategoryGrid — Homepage Category Cards Grid
   ──────────────────────────────────────────────────────────────
   Renders the top-level categories on the homepage with
   Framer Motion scroll-triggered stagger animations and
   premium hover effects.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { CategoryWithChildren } from "@/lib/types";

interface CategoryGridProps {
  categories: CategoryWithChildren[];
  dict: any;
  locale: string;
}

export function CategoryGrid({ categories, dict, locale }: CategoryGridProps) {
  const isAr = locale === "ar";
  const prefersReducedMotion = useReducedMotion();

  // Premium imagery fallback if category.image_url is missing
  const getCategoryImage = (slug: string) => {
    switch (slug) {
      case "men":
        return "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=1000&auto=format&fit=crop"; // Premium menswear
      case "sneakers":
        return "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1000&auto=format&fit=crop"; // Shoe studio shot
      case "accessories":
        return "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop"; // Luxury watch dial
      case "tech":
        return "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1000&auto=format&fit=crop"; // Sleek tech/laptop
      case "beauty":
        return "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000&auto=format&fit=crop"; // Perfume bottle
      case "home":
        return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop"; // Minimalist furniture
      default:
        return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop";
    }
  };

  const displayCategories = categories.slice(0, 5);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
      {displayCategories.map((category, index) => {
        const name = isAr ? category.name_ar : category.name_en;
        const imageUrl = category.image_url || getCategoryImage(category.slug);

        return (
          <motion.div
            key={category.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.5,
              delay: prefersReducedMotion ? 0 : index * 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
          >
            <Link
              href={`/category/${category.slug}`}
              className="group card-hover relative flex flex-col h-48 sm:h-64 md:h-72 w-full rounded-xl sm:rounded-2xl overflow-hidden bg-surface-inset border border-transparent hover:border-border-hover transition-all duration-300"
            >
              {/* Background Image */}
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content Bottom Left/Start */}
              <div className="relative z-10 flex flex-col mt-auto p-3 sm:p-5 md:p-6">
                <h3 className="text-base sm:text-xl font-bold text-white mb-0.5 sm:mb-1 drop-shadow-md">
                  {name}
                </h3>
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-gray-200 group-hover:text-white transition-colors duration-300">
                  <span>{dict.home?.shopNow || "Shop Now"}</span>
                  <ArrowRight size={14} className={`transition-transform duration-300 group-hover:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover:-translate-x-1' : ''}`} />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
