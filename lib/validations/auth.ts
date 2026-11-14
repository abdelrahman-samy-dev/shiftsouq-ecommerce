/* ══════════════════════════════════════════════════════════════
   Validation Schemas – Authentication
   ──────────────────────────────────────────────────────────────
   Zod schemas for login and registration form validation.
   Used both client-side (react-hook-form) and server-side
   (server actions) for double validation.

   Schemas are created from a messages object so errors appear in
   the visitor's language: `createLoginSchema(dict.validation)`.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { defaultValidationMessages, type ValidationMessages } from "./messages";

/** Supabase / bcrypt only use the first 72 bytes of a password. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Validation schema for the login form.
 *
 * - `email`: Must be a valid email format.
 * - `password`: Must not be empty (length validation is deferred
 *   to the auth provider since existing accounts may have varying
 *   password requirements).
 * - `rememberMe`: Optional boolean for session persistence.
 */
export function createLoginSchema(m: ValidationMessages = defaultValidationMessages) {
  return z.object({
    email: z.string().trim().email(m.emailInvalid),
    password: z.string().min(1, m.passwordRequired),
    rememberMe: z.boolean().optional(),
  });
}

/**
 * Validation schema for the registration form.
 *
 * Includes a cross-field refinement that ensures `password` and
 * `confirmPassword` match. The `.refine()` is applied last so
 * individual field errors are reported first.
 */
export function createRegisterSchema(m: ValidationMessages = defaultValidationMessages) {
  return z
    .object({
      firstName: z.string().trim().min(2, m.firstNameRequired).max(60, m.tooLong),
      lastName: z.string().trim().min(2, m.lastNameRequired).max(60, m.tooLong),
      email: z.string().trim().email(m.emailInvalid),
      gender: z.enum(["male", "female"], { message: m.genderRequired }),
      country: z.string({ message: m.countryRequired }).min(2, m.countryRequired),
      city: z.string().trim().min(2, m.cityRequired).max(60, m.tooLong),
      password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, m.passwordMin)
        .max(PASSWORD_MAX_LENGTH, m.passwordMax),
      confirmPassword: z.string(),
      terms: z.literal(true, { message: m.termsRequired }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"],
    });
}

/** English schemas, kept for existing imports. */
export const loginSchema = createLoginSchema();
export const registerSchema = createRegisterSchema();

/** Inferred TypeScript type for login form values. */
export type LoginInput = z.infer<typeof loginSchema>;

/** Inferred TypeScript type for registration form values. */
export type RegisterInput = z.infer<typeof registerSchema>;
