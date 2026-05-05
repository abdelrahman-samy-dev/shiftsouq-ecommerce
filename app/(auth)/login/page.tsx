/* ══════════════════════════════════════════════════════════════
   Login Page
   Route: /login
   ──────────────────────────────────────────────────────────────
   Server component that provides locale and dictionary to the
   client-side LoginForm component.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";
import LoginForm from "./LoginForm";
import { cookies } from "next/headers";

/* ── SEO Metadata ─────────────────────────────────────────── */

export const metadata: Metadata = {
  title: `Login | ${APP_NAME}`,
  description: `Sign in to your ${APP_NAME} account to access your orders, wishlist, and exclusive offers.`,
};

/* ── Page Component ────────────────────────────────────────── */

export default async function LoginPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      aria-label={locale === "ar" ? "تسجيل الدخول" : "Login"}
    >
      <LoginForm dict={dict} />
    </section>
  );
}
