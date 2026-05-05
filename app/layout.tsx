import type { Metadata } from "next";
import { Inter, Geist_Mono, Alexandria } from "next/font/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { Locale } from "@/lib/types";

/* ── Fonts ─────────────────────────────────────────────────── */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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
      className={`${inter.variable} ${alexandria.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
