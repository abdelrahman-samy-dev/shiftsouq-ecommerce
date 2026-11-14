"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/* Silence the React 19 false-positive "Encountered a script tag" warning
   caused by next-themes' inline script. Patched once, in development only. */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const patched = window as typeof window & { __ssThemeConsolePatched?: boolean };
  if (!patched.__ssThemeConsolePatched) {
    patched.__ssThemeConsolePatched = true;
    const orig = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
      orig.apply(console, args);
    };
  }
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
