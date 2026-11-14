/* ══════════════════════════════════════════════════════════════
   Contact Us Page — /contact
   ──────────────────────────────────────────────────────────────
   Server component wrapper that loads locale/dict and renders
   the client-side ContactForm.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import ContactContent from "./ContactContent";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.contact.title, description: dict.meta.contact.description };
}

export default async function ContactPage() {
  const { locale, dict } = await getLocaleAndDictionary();

  return <ContactContent dict={dict} locale={locale} />;
}
