/* ══════════════════════════════════════════════════════════════
   Receipt — /checkout/success?order=SS-…
   Shows the real order to the browser that placed it (httpOnly
   receipt cookie) or to its signed-in owner. Online payments are
   confirmed by the Paymob webhook; until then the page shows
   "confirming" and refreshes. Private page: never indexed.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getReceipt } from "@/lib/dal/receipt";
import { getAccountUser } from "@/lib/dal/account";
import { CheckoutSuccessContent } from "@/components/checkout/CheckoutSuccessContent";
import { checkoutCopy } from "@/components/checkout/copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = checkoutCopy(await getLocale());
  return { title: t.receiptEyebrow, robots: { index: false, follow: false } };
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const { order } = await searchParams;
  const [locale, receipt, user] = await Promise.all([
    getLocale(),
    getReceipt(typeof order === "string" ? order.trim().slice(0, 40) : undefined),
    getAccountUser(),
  ]);

  return <CheckoutSuccessContent locale={locale} receipt={receipt} signedIn={!!user} />;
}
