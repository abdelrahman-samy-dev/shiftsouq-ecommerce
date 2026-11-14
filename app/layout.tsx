import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Sans_Arabic } from "next/font/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { Locale } from "@/lib/types";

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

export const metadata: Metadata = {
  title: {
    default: "ShiftSouq — Premium Fashion & Lifestyle Store",
    template: "%s | ShiftSouq",
  },
  description:
    "Discover curated collections of menswear, kids fashion, sneakers & accessories at ShiftSouq. Premium quality, modern design, worldwide delivery.",
  keywords: [
    "ShiftSouq",
    "e-commerce",
    "fashion",
    "sneakers",
    "accessories",
    "online store",
  ],
};

/* ── Root Layout ───────────────────────────────────────────── */

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as Locale;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
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
      </body>
    </html>
  );
}
