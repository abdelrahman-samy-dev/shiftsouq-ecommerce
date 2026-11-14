import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { LegalArticle } from "@/components/shared/LegalArticle";
import { LEGAL_LABELS, legalFacts } from "@/components/shared/legal-facts";
import { shippingDocument } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends the store name.
  return { title: dict.meta.shipping.title, description: dict.meta.shipping.description };
}

export default async function ShippingPage() {
  const [{ locale }, settings] = await Promise.all([getLocaleAndDictionary(), getStoreSettings()]);
  const doc = shippingDocument(legalFacts(settings, locale), locale);
  return <LegalArticle doc={doc} locale={locale} labels={LEGAL_LABELS[locale]} />;
}
