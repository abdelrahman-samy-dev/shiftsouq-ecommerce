"use client";

import { SkyToggle } from "@/components/ui/SkyToggle";
import { useLocale } from "@/components/providers/LocaleProvider";

/** Header / menu theme switch: the animated sun–moon toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const isAr = useLocale() === "ar";
  // 14px base → 79×35px: sits level with the 40–46px header controls.
  return <SkyToggle size={14} className={className} label={isAr ? "الوضع الداكن" : "Dark mode"} />;
}
