/* Storefront layout: header, footer and mini-cart around every customer-facing page. */

import { getLocale } from "@/lib/i18n/server";
import { StoreChrome } from "@/components/layout/StoreChrome";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return <StoreChrome locale={locale}>{children}</StoreChrome>;
}
