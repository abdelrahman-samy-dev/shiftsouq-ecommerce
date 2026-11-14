/* ══════════════════════════════════════════════════════════════
   Checkout Success Page — /checkout/success
   Shows the real order (number, items, payment status) to the
   browser that placed it. Online payments are confirmed by the
   Paymob webhook; until then the page shows "confirming payment".
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getReceipt } from "@/lib/dal/receipt";
import { CheckoutSuccessContent } from "@/components/checkout/CheckoutSuccessContent";

export const metadata: Metadata = {
  title: "Order Placed",
  description: "Your ShiftSouq order has been placed.",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const receipt = await getReceipt(typeof order === "string" ? order.slice(0, 40) : undefined);

  return <CheckoutSuccessContent locale={locale} receipt={receipt} />;
}
