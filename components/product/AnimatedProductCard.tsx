"use client";

/* ══════════════════════════════════════════════════════════════
   AnimatedProductCard — Scroll-Triggered Animation Wrapper
   ──────────────────────────────────────────────────────────────
   Thin client-side wrapper that adds Framer Motion whileInView
   scroll animation to ProductCard (which remains a server
   component for maximum performance).

   Respects prefers-reduced-motion via useReducedMotion.
   ══════════════════════════════════════════════════════════════ */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedProductCardProps {
  /** The ProductCard content to wrap. */
  children: ReactNode;
  /** Index within the grid, used for stagger delay. */
  index?: number;
}

/**
 * Wraps a ProductCard with scroll-triggered fade-up animation.
 * Each card animates independently as it enters the viewport.
 *
 * @param children - ProductCard JSX to animate.
 * @param index    - Grid position index for stagger offset.
 */
export default function AnimatedProductCard({
  children,
  index = 0,
}: AnimatedProductCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: prefersReducedMotion ? 0 : index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
