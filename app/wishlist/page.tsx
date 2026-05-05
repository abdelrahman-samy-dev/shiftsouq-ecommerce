/* ══════════════════════════════════════════════════════════════
   Wishlist Page — /wishlist
   ──────────────────────────────────────────────────────────────
   Server component that fetches wishlisted products by their IDs
   and renders a grid using AnimatedProductCard.

   Since wishlist IDs are stored client-side (localStorage via
   Zustand), this page uses a client wrapper to read the IDs and
   pass them to the server-fetched product grid.

   Uses generateMetadata for locale-aware SEO (N4).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  const title = dict.common?.wishlist || "Wishlist";
  const description =
    locale === "ar"
      ? `منتجاتك المحفوظة في ${APP_NAME}. أضفها إلى السلة عندما تكون جاهزاً.`
      : `Your saved products at ${APP_NAME}. Add them to your cart when you're ready.`;

  return {
    title: `${title} | ${APP_NAME}`,
    description,
  };
}

export default async function WishlistPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;

  return <WishlistPageContent locale={locale} />;
}
