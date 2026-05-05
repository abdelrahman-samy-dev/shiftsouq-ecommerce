/* ══════════════════════════════════════════════════════════════
   Cart Page — /cart
   ──────────────────────────────────────────────────────────────
   Server component wrapper for the cart page. Passes locale
   down to the client CartPageContent component.

   Uses generateMetadata for locale-aware SEO (N4).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  const title = dict.cart?.title || "Cart";
  const description =
    locale === "ar"
      ? `راجع المنتجات المختارة وانتقل إلى الدفع في ${APP_NAME}.`
      : `Review your selected products and proceed to checkout at ${APP_NAME}.`;

  return {
    title: `${title} | ${APP_NAME}`,
    description,
  };
}

export default async function CartPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;

  return <CartPageContent locale={locale} />;
}
