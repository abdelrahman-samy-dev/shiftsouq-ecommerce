/* ══════════════════════════════════════════════════════════════
   Checkout Success Page — /checkout/success
   ──────────────────────────────────────────────────────────────
   Shown after a successful COD order or Paymob payment callback.
   Displays a confirmation animation and order summary.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { CheckoutSuccessContent } from "@/components/checkout/CheckoutSuccessContent";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your order has been placed successfully. Thank you for shopping at ShiftSouq!",
};

export default async function CheckoutSuccessPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;

  return <CheckoutSuccessContent locale={locale} />;
}
