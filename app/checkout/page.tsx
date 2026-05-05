/* ══════════════════════════════════════════════════════════════
   Checkout Page — /checkout
   ──────────────────────────────────────────────────────────────
   Server component wrapper for the multi-step checkout flow.
   Passes locale down to the client CheckoutPageContent component.

   Uses generateMetadata for locale-aware SEO (N4).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  const title = dict.checkout?.title || "Checkout";
  const description =
    locale === "ar"
      ? `أكمل عملية الشراء بأمان في ${APP_NAME}. خيارات دفع متعددة تشمل البطاقات والمحافظ الإلكترونية.`
      : `Complete your purchase securely at ${APP_NAME}. Multiple payment options including credit cards, mobile wallets, and cash on delivery.`;

  return {
    title: `${title} | ${APP_NAME}`,
    description,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;

  return <CheckoutPageContent locale={locale} />;
}
