"use client";

import { SkyToggle } from "@/components/ui/SkyToggle";
import { useLocale } from "@/components/providers/LocaleProvider";

/** Header / menu theme switch: the animated sun–moon toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const isAr = useLocale() === "ar";
  return <SkyToggle size={9} className={className} label={isAr ? "الوضع الداكن" : "Dark mode"} />;
}
