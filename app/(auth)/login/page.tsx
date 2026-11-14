/* ══════════════════════════════════════════════════════════════
   Login Page
   Route: /login
   ──────────────────────────────────────────────────────────────
   Server component that provides locale and dictionary to the
   client-side LoginForm component.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import LoginForm from "./LoginForm";

/* ── SEO Metadata ─────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.login.title, description: dict.meta.login.description };
}

/* ── Page Component ────────────────────────────────────────── */

export default async function LoginPage() {
  const { dict } = await getLocaleAndDictionary();

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      aria-label={dict.meta.login.title}
    >
      <LoginForm dict={dict} />
    </section>
  );
}
