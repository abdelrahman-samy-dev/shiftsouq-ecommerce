/* ══════════════════════════════════════════════════════════════
   Validation Schema – Contact form
   ──────────────────────────────────────────────────────────────
   Shared by ContactContent (instant, localized feedback) and the
   submitContactForm Server Function (authoritative check).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

export const CONTACT_MESSAGE_MAX = 5000;

export function createContactSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({
    name: z.string().trim().min(2, m.nameInvalid).max(120, m.nameInvalid),
    email: z.string().trim().toLowerCase().max(254, m.emailInvalid).email(m.emailInvalid),
    subject: z.string().trim().min(3, m.subjectRequired).max(200, m.tooLong),
    message: z
      .string()
      .trim()
      .min(10, m.messageMin)
      .max(CONTACT_MESSAGE_MAX, m.messageMax),
  });
}

export type ContactInput = z.infer<ReturnType<typeof createContactSchema>>;
