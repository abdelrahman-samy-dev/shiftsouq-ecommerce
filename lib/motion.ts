/* ══════════════════════════════════════════════════════════════
   Motion — Shared Framer Motion Animation Variants
   ──────────────────────────────────────────────────────────────
   Centralised animation configuration used across the app.
   Keeps animation definitions DRY and consistent.
   ══════════════════════════════════════════════════════════════ */

import type { Variants } from "framer-motion";

/**
 * Staggered fade-up animation for grid items.
 * Parent container should use `staggerContainer`,
 * children should use `fadeUpItem`.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/**
 * Individual fade-up animation for items in a staggered grid.
 * Pairs with `staggerContainer` on the parent.
 */
export const fadeUpItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

/**
 * Subtle scale-up hover effect for cards.
 * Used on CategoryCard, ProductGallery thumbnails, etc.
 */
export const hoverScale: Variants = {
  rest: {
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  hover: {
    scale: 1.03,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/**
 * Form container entrance animation.
 * Smooth scale + fade used on auth forms.
 */
export const formEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

/**
 * Individual form field entrance (used as children of formEntrance).
 */
export const formItem: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

/**
 * Error shake animation (keyframes-based).
 * Triggers a quick horizontal shake for error feedback.
 */
export const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: {
    duration: 0.5,
    ease: "easeInOut",
  },
};
