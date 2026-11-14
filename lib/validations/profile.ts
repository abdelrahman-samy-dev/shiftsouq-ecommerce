/* ══════════════════════════════════════════════════════════════
   Validation Schemas – Profile
   ──────────────────────────────────────────────────────────────
   Personal details and password change. Shared by the account
   forms (instant feedback) and lib/actions/profile.ts
   (authoritative). Phone numbers follow the checkout rule: an
   Egyptian mobile, or empty.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth";
import { normalizeEgyptianMobile } from "@/components/checkout/checkout-rules";

/** Empty strings are allowed (the field is cleared). */
const optionalText = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

export function createProfileSchema(m: ValidationMessages = defaultValidationMessages, phoneMessage: string = m.phoneInvalid) {
  return z.object({
    full_name: z
      .string()
      .trim()
      .refine((v) => v === "" || (v.length >= 2 && v.length <= 100), m.fullNameInvalid),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || normalizeEgyptianMobile(v) !== null, phoneMessage),
    country: optionalText(60, m.tooLong),
    city: optionalText(60, m.tooLong),
  });
}

export function createPasswordChangeSchema(m: ValidationMessages = defaultValidationMessages) {
  return z
    .object({
      currentPassword: z.string().min(1, m.passwordRequired).max(PASSWORD_MAX_LENGTH, m.passwordMax),
      newPassword: z.string().min(PASSWORD_MIN_LENGTH, m.passwordMin).max(PASSWORD_MAX_LENGTH, m.passwordMax),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

/** Setting a new password from a reset link (no current password: the link proved who it is). */
export function createNewPasswordSchema(m: ValidationMessages = defaultValidationMessages) {
  return z
    .object({
      newPassword: z.string().min(PASSWORD_MIN_LENGTH, m.passwordMin).max(PASSWORD_MAX_LENGTH, m.passwordMax),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type PasswordChangeInput = z.infer<ReturnType<typeof createPasswordChangeSchema>>;
export type NewPasswordInput = z.infer<ReturnType<typeof createNewPasswordSchema>>;
