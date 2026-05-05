/* ══════════════════════════════════════════════════════════════
   Validation Schemas — Payment (Paymob)
   ──────────────────────────────────────────────────────────────
   Zod schemas for server-side validation of payment data.
   Prevents price manipulation by validating amounts, billing
   data, and payment method constraints.

   NOTE: Uses Zod v4 API (error messages via `{ error: "..." }`).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

/* ── Billing Data Schema ─────────────────────────────────────── */

export const billingDataSchema = z.object({
  first_name: z.string().min(1, { error: "First name is required" }).max(100).trim(),
  last_name: z.string().min(1, { error: "Last name is required" }).max(100).trim(),
  email: z.string().email({ error: "Invalid email address" }).max(254).trim(),
  phone_number: z.string().min(5, { error: "Phone number is required" }).max(20).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().max(100).trim(),
  street: z.string().max(200).trim(),
  building: z.string().max(100).trim(),
  apartment: z.string().max(100).trim(),
  floor: z.string().max(20).trim(),
  postal_code: z.string().max(20).trim(),
  country: z.string().min(1).max(5).trim(),
});

/* ── Order Item Schema ───────────────────────────────────────── */

export const paymobOrderItemSchema = z.object({
  name: z.string().min(1).max(200),
  amount_cents: z.number().int().positive({ error: "Item amount must be positive" }),
  quantity: z.number().int().positive({ error: "Quantity must be at least 1" }),
  description: z.string().max(500).optional(),
});

/* ── Process Payment Schema ──────────────────────────────────── */

export const processPaymentSchema = z.object({
  paymentType: z.enum(["card", "wallet"], {
    error: "Payment type must be 'card' or 'wallet'",
  }),
  amountCents: z
    .number()
    .int({ error: "Amount must be a whole number of cents" })
    .positive({ error: "Amount must be positive" })
    .max(100_000_00, { error: "Amount exceeds maximum (100,000 EGP)" }),
  items: z
    .array(paymobOrderItemSchema)
    .min(1, { error: "At least one item is required" }),
  billingData: billingDataSchema,
  walletPhone: z.string().max(20).optional(),
});

/* ── Inferred Types ──────────────────────────────────────────── */

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
