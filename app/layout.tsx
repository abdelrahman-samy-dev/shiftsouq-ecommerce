import type { Metadata } from "next";
import { Inter, Geist_Mono, Alexandria } from "next/font/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import { Toaster } from "sonner";
import { getDirection } from "@/lib/i18n/config";
import { getLocale, getLocaleAndDictionary } from "@/lib/i18n/server";

/* ── Fonts ─────────────────────────────────────────────────── */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Arabic UI font. Its CSS also ships the Latin faces, so mixed
 * Arabic/Latin lines (emails, prices, brand names) stay in one
 * family when the page is RTL — see the [dir="rtl"] body rule in
 * globals.css. Only the Arabic subset is preloaded.
 */
const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ── Metadata ──────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getLocaleAndDictionary();

  return {
    title: {
      default: dict.meta.siteTitle,
      template: `%s | ${dict.common.appName}`,
    },
    description: dict.meta.siteDescription,
    keywords:
      locale === "ar"
        ? ["شيفت سوق", "تسوق أونلاين", "أزياء", "أحذية رياضية", "إكسسوارات", "مصر"]
        : ["ShiftSouq", "e-commerce", "fashion", "sneakers", "accessories", "online store", "Egypt"],
    openGraph: {
      siteName: dict.common.appName,
      locale: locale === "ar" ? "ar_EG" : "en_US",
    },
  };
}

/* ── Root Layout ───────────────────────────────────────────── */

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = getDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${alexandria.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider locale={locale}>
          <ThemeProvider>
            {/* ── Global Header ─────────────────────────────── */}
            <Header locale={locale} />

            {/* ── Page Content ──────────────────────────────── */}
            <main className="flex-1">
              {children}
            </main>

            {/* ── Global Footer ─────────────────────────────── */}
            <Footer locale={locale} />
          </ThemeProvider>
          <Toaster richColors position="top-center" dir={dir} />
        </LocaleProvider>
      </body>
    </html>
  );
}
