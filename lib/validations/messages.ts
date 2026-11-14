/* ══════════════════════════════════════════════════════════════
   Validation messages
   ──────────────────────────────────────────────────────────────
   Zod schemas are built from a messages object so the same rules
   speak English or Arabic. Forms pass `dict.validation`; server
   functions pass the dictionary of the visitor's locale.
   ══════════════════════════════════════════════════════════════ */

import en from "@/lib/i18n/dictionaries/en.json";

export type ValidationMessages = typeof en.validation;

/** English messages — used by the default (legacy) schema exports. */
export const defaultValidationMessages: ValidationMessages = en.validation;
