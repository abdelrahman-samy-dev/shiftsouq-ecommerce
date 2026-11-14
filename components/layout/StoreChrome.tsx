/* ══════════════════════════════════════════════════════════════
   StoreChrome — the storefront frame: header (with announcement
   bar and mini-cart), main landmark, footer.
   Used by app/(store)/layout.tsx and by the root not-found page
   (unknown URLs render outside every route group). The admin has
   its own frame, so none of this loads there.
   ══════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import type { Locale } from "@/lib/types";
import Header from "./Header";
import Footer from "./Footer";

export function StoreChrome({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <>
      <Header locale={locale} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer locale={locale} />
    </>
  );
}
