import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { getStoreSettings } from "@/lib/settings";
import { LegalArticle } from "@/components/shared/LegalArticle";
import { LEGAL_LABELS, legalFacts } from "@/components/shared/legal-facts";
import { refundDocument } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends the store name.
  return { title: dict.legal.refundPolicy.title, description: dict.legal.refundPolicy.description };
}

/** Return & refund policy (also required by Paymob for live payments). */
export default async function RefundPolicyPage() {
  const [{ locale }, settings] = await Promise.all([getLocaleAndDictionary(), getStoreSettings()]);
  const doc = refundDocument(legalFacts(settings, locale), locale);
  return <LegalArticle doc={doc} locale={locale} labels={LEGAL_LABELS[locale]} />;
}
