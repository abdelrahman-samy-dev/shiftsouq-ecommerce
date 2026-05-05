/* ══════════════════════════════════════════════════════════════
   Contact Us Page — /contact
   ──────────────────────────────────────────────────────────────
   Server component wrapper that loads locale/dict and renders
   the client-side ContactForm.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { APP_NAME } from "@/lib/constants";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: `Contact Us | ${APP_NAME}`,
  description:
    "Get in touch with ShiftSouq. We're here to help with orders, returns, product questions, and more.",
};

export default async function ContactPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  return <ContactContent dict={dict} locale={locale} />;
}
