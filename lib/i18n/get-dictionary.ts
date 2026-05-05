/* ══════════════════════════════════════════════════════════════
   Dictionary Loader
   Loads the appropriate translation JSON based on locale.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import type { Locale } from "@/lib/types";

// Dynamic imports for code-splitting per locale
const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
};

export const getDictionary = cache(async (locale: Locale) => {
  return dictionaries[locale]();
});

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
