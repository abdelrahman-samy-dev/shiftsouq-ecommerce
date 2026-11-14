"use client";

import { SkyToggle } from "@/components/ui/SkyToggle";

/** Header / menu theme switch: the animated sun–moon toggle. */
export function ThemeToggle({ className, locale }: { className?: string; locale?: string }) {
  return (
    <SkyToggle
      size={9}
      className={className}
      label={locale === "ar" ? "الوضع الداكن" : "Dark mode"}
    />
  );
}
