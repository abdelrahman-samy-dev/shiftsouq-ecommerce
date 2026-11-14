"use client";

/* Switches the admin between English and Arabic (same cookie as the storefront switcher). */

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/lib/i18n/actions";
import { getAdminText } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";
import { adminButton } from "../components/buttons";

export function LanguageButton({ locale, className, full = false }: { locale: string; className?: string; full?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  const t = getAdminText(locale).shell;

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${t.language}: ${t.switchLanguage}`}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        })
      }
      className={adminButton("ghost", "sm", cn("px-2.5", full && "w-full justify-start", className))}
    >
      <Languages aria-hidden="true" strokeWidth={1.75} />
      <span lang={next}>{t.switchLanguage}</span>
    </button>
  );
}
