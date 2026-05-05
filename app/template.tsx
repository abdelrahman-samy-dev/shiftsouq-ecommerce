/* ══════════════════════════════════════════════════════════════
   Template — Global Page Transition Wrapper
   ──────────────────────────────────────────────────────────────
   In the Next.js App Router, template.tsx creates a NEW
   instance on every route change (unlike layout.tsx which
   persists). This is the ideal place for page-entry animations
   because the component remounts on navigation, re-triggering
   the Framer Motion `initial` animation.
   ══════════════════════════════════════════════════════════════ */

import PageTransition from "@/components/shared/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
