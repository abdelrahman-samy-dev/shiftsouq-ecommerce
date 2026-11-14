/* ══════════════════════════════════════════════════════════════
   Cart Page — /cart
   ──────────────────────────────────────────────────────────────
   Server component wrapper for the cart page. Passes locale
   down to the client CartPageContent component.

   Uses generateMetadata for locale-aware SEO (N4).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale, getLocaleAndDictionary } from "@/lib/i18n/server";
import { CartPageContent } from "@/components/cart/CartPageContent";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.cart.title, description: dict.meta.cart.description };
}

export default async function CartPage() {
  const locale = await getLocale();

  return <CartPageContent locale={locale} />;
}
