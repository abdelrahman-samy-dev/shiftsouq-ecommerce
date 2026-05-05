"use client";

/* ══════════════════════════════════════════════════════════════
   PageTransition — Global Page Entry Animation
   ──────────────────────────────────────────────────────────────
   Wraps page content with a subtle fade-in + slide-up animation
   on mount. Uses Framer Motion's AnimatePresence for smooth
   transitions. Fully respects prefers-reduced-motion.
   
   Usage: Wrap the {children} in layout.tsx or template.tsx.
   ══════════════════════════════════════════════════════════════ */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface PageTransitionProps {
  /** The page content to animate. */
  children: ReactNode;
}

/**
 * PageTransition provides a premium page-entry animation.
 *
 * Animation: Fade in (0 → 1) + subtle slide-up (15px → 0px)
 * with a smooth easeOut curve. Duration is tuned to feel
 * snappy but elegant (~0.45s).
 *
 * Accessibility:
 * - Checks `useReducedMotion()` and disables all motion if
 *   the user's OS preference is set to reduce motion.
 *
 * @param children - The page content to wrap and animate.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier easeOut
      }}
    >
      {children}
    </motion.div>
  );
}
