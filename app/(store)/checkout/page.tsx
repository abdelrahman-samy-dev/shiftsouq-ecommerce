/* ══════════════════════════════════════════════════════════════
   Checkout — /checkout (guests welcome)
   ──────────────────────────────────────────────────────────────
   Passes the client checkout what it needs to show the same
   numbers the server will charge: the store's delivery rates and
   payment switches, which online methods the gateway can take
   right now, and — for signed-in buyers — their details and
   saved addresses. Private page: never indexed.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { getCheckoutPrefill, getPaymentAvailability, getZoneEtas } from "@/lib/dal/orders";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { checkoutCopy } from "@/components/checkout/copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = checkoutCopy(await getLocale());
  return { title: t.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const [locale, settings, prefill, etaByZone] = await Promise.all([getLocale(), getStoreSettings(), getCheckoutPrefill(), getZoneEtas()]);

  return (
    <Suspense>
      <CheckoutPageContent
        locale={locale}
        prefill={prefill}
        rates={settings.shipping}
        etaByZone={etaByZone}
        payments={settings.payments}
        gateway={getPaymentAvailability()}
      />
    </Suspense>
  );
}
