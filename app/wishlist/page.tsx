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
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.wishlist.title, description: dict.meta.wishlist.description };
}

export default async function WishlistPage() {
  const { locale, dict } = await getLocaleAndDictionary();

  // Product cards only need the "products" strings.
  return <WishlistPageContent locale={locale} cardDict={{ products: dict.products }} />;
}
