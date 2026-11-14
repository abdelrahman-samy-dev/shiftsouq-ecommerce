"use client";

/* ══════════════════════════════════════════════════════════════
   LanguageSwitcher — English ⇄ العربية
   ──────────────────────────────────────────────────────────────
   Two languages, so one tap: the button names the other language.
   A Server Function writes the NEXT_LOCALE cookie, then the
   router refreshes: Server Components re-render in the new
   language and <html lang/dir> update without a full reload.
   For shareable links, /ar and /en (?next=…) do the same thing.
   ══════════════════════════════════════════════════════════════ */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/types";
import { Spinner } from "@/components/ds";
import { cn } from "@/lib/utils";

const LABEL: Record<Locale, string> = { en: "English", ar: "العربية" };
const ARIA: Record<Locale, string> = { en: "Switch to Arabic", ar: "التبديل إلى الإنجليزية" };

export function LanguageSwitcher({
  currentLocale,
  className,
  variant = "text",
}: {
  currentLocale: Locale;
  className?: string;
  /** "text": compact header link style. "outline": bordered button (menus, footer). */
  variant?: "text" | "outline";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const target: Locale = currentLocale === "ar" ? "en" : "ar";

  const switchLanguage = () => {
    startTransition(async () => {
      const result = await setLocaleAction(target);
      if ("locale" in result) router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={ARIA[currentLocale]}
      aria-busy={isPending || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150",
        variant === "text"
          ? "h-10 rounded-sm px-2 text-[0.8125rem] font-medium hover:bg-surface group-data-[overlay=true]/header:hover:bg-white/10"
          : "h-11 rounded-sm border border-border px-4 text-sm hover:border-text-primary",
        className,
      )}
    >
      {isPending ? <Spinner className="size-3.5" /> : null}
      <span lang={target} dir={target === "ar" ? "rtl" : "ltr"}>
        {LABEL[target]}
      </span>
    </button>
  );
}
