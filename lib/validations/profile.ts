/* ══════════════════════════════════════════════════════════════
   Validation Schemas – Profile
   ──────────────────────────────────────────────────────────────
   Personal details and password change. Shared by ProfileForm
   (instant feedback) and lib/actions/profile.ts (authoritative).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth";

/** Digits with optional +, spaces, dashes or brackets; 7–15 digits. */
const PHONE_PATTERN = /^\+?[\d\s\-()]{7,20}$/;

/** Empty strings are allowed (the field is cleared). */
const optionalText = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

export function createProfileSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({
    full_name: z
      .string()
      .trim()
      .refine((v) => v === "" || (v.length >= 2 && v.length <= 100), m.fullNameInvalid),
    phone: z
      .string()
      .trim()
      .refine((v) => {
        if (v === "") return true;
        const digits = v.replace(/\D/g, "").length;
        return PHONE_PATTERN.test(v) && digits >= 7 && digits <= 15;
      }, m.phoneInvalid),
    country: optionalText(60, m.tooLong),
    city: optionalText(60, m.tooLong),
  });
}

export function createPasswordChangeSchema(m: ValidationMessages = defaultValidationMessages) {
  return z
    .object({
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, m.passwordMin)
        .max(PASSWORD_MAX_LENGTH, m.passwordMax),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type PasswordChangeInput = z.infer<ReturnType<typeof createPasswordChangeSchema>>;
