import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Sans_Arabic } from "next/font/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
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
            {/* Store pages get their header/footer from app/(store)/layout.tsx; the admin has its own frame. */}
            {children}
          </ThemeProvider>
          {/* Toasts in the house style: ink panel, square corners, no colour washes. */}
          <Toaster
            position="top-center"
            dir={dir}
            gap={8}
            style={
              {
                "--normal-bg": "var(--text-primary)",
                "--normal-text": "var(--background)",
                "--normal-border": "transparent",
                "--border-radius": "var(--radius-sm)",
                "--width": "380px",
                fontFamily: "var(--font-sans)",
              } as React.CSSProperties
            }
            toastOptions={{
              style: { boxShadow: "var(--shadow-float)", padding: "14px 16px", fontSize: "0.875rem", gap: "10px" },
              classNames: {
                description: "opacity-75",
                actionButton: "bg-background! text-text-primary! rounded-sm! h-8! px-3! text-[0.8125rem]! font-medium!",
                cancelButton: "bg-transparent! text-background! underline! rounded-sm!",
                closeButton: "bg-text-primary! text-background! border-0!",
              },
            }}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
