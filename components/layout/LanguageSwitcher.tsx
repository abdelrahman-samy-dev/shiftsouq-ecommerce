"use client";

/* ══════════════════════════════════════════════════════════════
   LanguageSwitcher — English / العربية
   ──────────────────────────────────────────────────────────────
   Calls a Server Function that writes the NEXT_LOCALE cookie,
   then refreshes the router: Server Components re-render in the
   new language and <html lang/dir> update without a full reload.
   For shareable links, /ar and /en (?next=…) do the same thing.
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useTransition } from "react";
import { ChevronDown, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/types";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export function LanguageSwitcher({ currentLocale, className }: { currentLocale: Locale; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isAr = currentLocale === "ar";
  const currentLabel = isAr ? "العربية" : "English";

  const switchTo = (lang: Locale) => {
    setIsOpen(false);
    if (lang === currentLocale) return;

    startTransition(async () => {
      const result = await setLocaleAction(lang);
      if ("locale" in result) router.refresh();
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[46px] w-full px-3.5 flex items-center gap-2 font-medium text-sm border border-border rounded-lg hover:border-text-primary transition-colors bg-background shadow-xs text-text-primary"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`${isAr ? "اللغة" : "Language"}: ${currentLabel}`}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 size={18} strokeWidth={1.8} className="animate-spin" />
        ) : (
          <Globe size={18} strokeWidth={1.8} />
        )}
        <span className="hidden xl:inline-block flex-1 text-start">{currentLabel}</span>
        <span className="xl:hidden uppercase flex-1 text-start">{currentLocale}</span>
        <ChevronDown size={14} strokeWidth={2} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="dropdown-panel absolute top-full end-0 mt-2 w-32 z-50 animate-scale-in origin-top py-1">
          {LANGUAGES.map(({ code, label }) => {
            const active = code === currentLocale;
            return (
              <button
                key={code}
                type="button"
                onClick={() => switchTo(code)}
                lang={code}
                dir={code === "ar" ? "rtl" : "ltr"}
                aria-current={active ? "true" : undefined}
                className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                  ""
                } ${
                  active
                    ? "bg-surface-elevated font-semibold text-text-primary"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
