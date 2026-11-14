import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Sans_Arabic } from "next/font/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import { Toaster } from "sonner";
import { getDirection } from "@/lib/i18n/config";
import { getLocale, getLocaleAndDictionary } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/seo/site";

/* ── Fonts ─────────────────────────────────────────────────── */

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

// Display serif and Arabic are not preloaded: they load only on pages/glyphs that use them.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

/* ── Metadata ──────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getLocaleAndDictionary();

  return {
    metadataBase: new URL(SITE_URL),
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
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
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
