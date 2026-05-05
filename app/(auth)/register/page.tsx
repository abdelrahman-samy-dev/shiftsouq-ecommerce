/* ══════════════════════════════════════════════════════════════
   Register Page
   Route: /register
   ──────────────────────────────────────────────────────────────
   Server component that provides locale and dictionary to the
   client-side RegisterForm component.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";
import RegisterForm from "./RegisterForm";
import { cookies } from "next/headers";

/* ── SEO Metadata ─────────────────────────────────────────── */

export const metadata: Metadata = {
  title: `Create Account | ${APP_NAME}`,
  description: `Join ${APP_NAME} today to access premium fashion, exclusive deals, and personalized shopping.`,
};

/* ── Page Component ────────────────────────────────────────── */

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      aria-label={locale === "ar" ? "إنشاء حساب" : "Create account"}
    >
      <RegisterForm dict={dict} />
    </section>
  );
}
