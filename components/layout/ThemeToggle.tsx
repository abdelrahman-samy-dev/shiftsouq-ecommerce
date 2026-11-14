"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useHydrated } from "@/components/shared/useHydrated";
import { useLocale } from "@/components/providers/LocaleProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const isAr = useLocale() === "ar";

  if (!hydrated) {
    return <div className={`btn-icon ${className || ''}`} />;
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark
    ? isAr ? "التبديل إلى الوضع الفاتح" : "Switch to light mode"
    : isAr ? "التبديل إلى الوضع الداكن" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`btn-icon relative overflow-hidden group ${className || ''}`}
      aria-label={label}
      title={label}
    >
      {/* Animated Background Blob */}
      <div className="absolute inset-0 bg-surface-elevated rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300 origin-center opacity-50"></div>

      <div className="relative flex items-center justify-center w-full h-full">
        {/* Sun Icon */}
        <Sun
          className={`absolute h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "rotate-[180deg] scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
          strokeWidth={2}
        />

        {/* Moon Icon */}
        <Moon
          className={`absolute h-[18px] w-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-[180deg] scale-0 opacity-0"
          }`}
          strokeWidth={2.5}
        />
      </div>
    </button>
  );
}
