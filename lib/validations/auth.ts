/* ══════════════════════════════════════════════════════════════
   Validation Schemas – Authentication
   ──────────────────────────────────────────────────────────────
   Zod schemas for login and registration form validation.
   Used both client-side (react-hook-form) and server-side
   (server actions) for double validation.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

/**
 * Validation schema for the login form.
 *
 * - `email`: Must be a valid email format.
 * - `password`: Must not be empty (length validation is deferred
 *   to the auth provider since existing accounts may have varying
 *   password requirements).
 * - `rememberMe`: Optional boolean for session persistence.
 */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

/**
 * Validation schema for the registration form.
 *
 * Includes a cross-field refinement that ensures `password` and
 * `confirmPassword` match. The `.refine()` is applied last so
 * individual field errors are reported first.
 */
export const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Please enter a valid email address."),
    gender: z.enum(["male", "female"], {
      message: "Please select a gender.",
    }),
    country: z.string().min(2, "Country is required"),
    city: z.string().min(2, "City is required"),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
    terms: z.literal(true, {
      message: "You must accept the terms and privacy policy.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Inferred TypeScript type for login form values. */
export type LoginInput = z.infer<typeof loginSchema>;

/** Inferred TypeScript type for registration form values. */
export type RegisterInput = z.infer<typeof registerSchema>;
