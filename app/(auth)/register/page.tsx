/* ══════════════════════════════════════════════════════════════
   Register Page
   Route: /register
   ──────────────────────────────────────────────────────────────
   Server component that provides locale and dictionary to the
   client-side RegisterForm component.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import RegisterForm from "./RegisterForm";

/* ── SEO Metadata ─────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getLocaleAndDictionary();
  // The root layout's title template appends " | ShiftSouq".
  return { title: dict.meta.register.title, description: dict.meta.register.description };
}

/* ── Page Component ────────────────────────────────────────── */

export default async function RegisterPage() {
  const { dict } = await getLocaleAndDictionary();

  return (
    <section
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      aria-label={dict.meta.register.title}
    >
      <RegisterForm dict={dict} />
    </section>
  );
}
