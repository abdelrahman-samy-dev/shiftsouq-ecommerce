/* ══════════════════════════════════════════════════════════════
   Validation Schemas – Authentication
   ──────────────────────────────────────────────────────────────
   Sign in, create an account, forgotten password. Used by the
   forms (instant feedback) and the server actions (authoritative).
   Schemas are built from a messages object so errors appear in
   the visitor's language: `createLoginSchema(dict.validation)`.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

/** Supabase / bcrypt only use the first 72 bytes of a password. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** httpOnly cookie set by /auth/callback after a password-reset link (signed user id + expiry, 15 minutes; lib/auth/recovery-cookie.ts). */
export const RECOVERY_COOKIE = "ss_recovery";

/**
 * Sign in. The password only has to be present: length rules are the
 * provider's business for existing accounts.
 */
export function createLoginSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({
    email: z.string().trim().email(m.emailInvalid).max(254, m.tooLong),
    password: z.string().min(1, m.passwordRequired).max(PASSWORD_MAX_LENGTH, m.passwordMax),
    rememberMe: z.boolean().optional(),
  });
}

/** Create an account: name, email and a password of at least 8 characters. */
export function createRegisterSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({
    firstName: z.string().trim().min(2, m.firstNameRequired).max(60, m.tooLong),
    lastName: z.string().trim().min(2, m.lastNameRequired).max(60, m.tooLong),
    email: z.string().trim().email(m.emailInvalid).max(254, m.tooLong),
    password: z.string().min(PASSWORD_MIN_LENGTH, m.passwordMin).max(PASSWORD_MAX_LENGTH, m.passwordMax),
  });
}

/** Forgotten password: just the email. */
export function createForgotPasswordSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({ email: z.string().trim().email(m.emailInvalid).max(254, m.tooLong) });
}

/** English schemas, kept for existing imports. */
export const loginSchema = createLoginSchema();
export const registerSchema = createRegisterSchema();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
