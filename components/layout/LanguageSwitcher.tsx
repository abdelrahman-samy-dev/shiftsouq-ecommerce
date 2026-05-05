"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useRouter } from "next/navigation";

export function LanguageSwitcher({ currentLocale, className }: { currentLocale: string, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const toggleLanguage = (lang: string) => {
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    setIsOpen(false);
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className || ''}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-[46px] w-full px-3.5 flex items-center gap-2 font-medium text-sm border border-border rounded-lg hover:border-text-primary transition-colors bg-background shadow-xs text-text-primary"
      >
        <Globe size={18} strokeWidth={1.8} />
        <span className="hidden xl:inline-block flex-1 text-left">{currentLocale === "ar" ? "العربية" : "English"}</span>
        <span className="xl:hidden uppercase flex-1 text-left">{currentLocale}</span>
        <ChevronDown size={14} strokeWidth={2} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="dropdown-panel absolute top-full right-0 mt-2 w-32 z-50 animate-scale-in origin-top py-1">
          <button
            onClick={() => toggleLanguage("en")}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentLocale === 'en' ? 'bg-surface-elevated font-semibold text-text-primary' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}
          >
            English
          </button>
          <button
            onClick={() => toggleLanguage("ar")}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentLocale === 'ar' ? 'bg-surface-elevated font-semibold text-text-primary' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}
          >
            العربية
          </button>
        </div>
      )}
    </div>
  );
}
