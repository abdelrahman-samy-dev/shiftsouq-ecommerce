"use client";

/* ══════════════════════════════════════════════════════════════
   Global error — when the root layout itself fails
   ──────────────────────────────────────────────────────────────
   Replaces the whole document, so it brings its own <html> and
   <body>, the global styles and no providers. The language is
   unknown here, so the message is shown in English and Arabic.
   ══════════════════════════════════════════════════════════════ */

import "./globals.css";
import { brand } from "@/lib/brand/config";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-text-primary">
        <main className="container-x flex min-h-dvh flex-col justify-center gap-12 py-16">
          <p className="font-display text-2xl">{brand.name.en}</p>
          <div className="grid gap-12 md:grid-cols-2">
            <section className="flex flex-col gap-4">
              <h1 className="t-h1">Something went wrong</h1>
              <p className="max-w-md text-text-secondary">The store couldn&apos;t load. Please try again in a moment.</p>
            </section>
            <section lang="ar" dir="rtl" className="flex flex-col gap-4">
              <h2 className="t-h1">حدث خطأ ما</h2>
              <p className="max-w-md text-text-secondary">تعذّر تحميل المتجر. يرجى المحاولة مرة أخرى بعد قليل.</p>
            </section>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-13 items-center justify-center rounded-sm bg-primary px-8 text-[0.9375rem] font-medium text-primary-foreground"
            >
              Try again · إعادة المحاولة
            </button>
            {/* A full reload, not client navigation: the app shell is what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="inline-flex h-13 items-center justify-center rounded-sm border border-text-primary px-8 text-[0.9375rem] font-medium">
              Home · الرئيسية
            </a>
          </div>
          {error.digest ? (
            <p className="text-[0.8125rem] text-text-muted">
              Ref: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
