/* ══════════════════════════════════════════════════════════════
   Validation — newsletter sign-up
   ──────────────────────────────────────────────────────────────
   One email field. Addresses are stored lower-cased and trimmed,
   so duplicates are caught by the unique index on lower(email).
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

export const newsletterEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** The normalised address, or null when it is not a valid email. */
export function parseNewsletterEmail(value: unknown): string | null {
  const parsed = newsletterEmailSchema.safeParse(typeof value === "string" ? value : "");
  return parsed.success ? parsed.data : null;
}

export type NewsletterStatus = "idle" | "subscribed" | "already" | "resubscribed" | "invalid" | "too_many" | "error";

export interface NewsletterState {
  status: NewsletterStatus;
  message: string;
}

export const NEWSLETTER_MESSAGES: Record<"en" | "ar", Record<Exclude<NewsletterStatus, "idle">, string>> = {
  en: {
    subscribed: "Thank you. You're on the list.",
    already: "You're already subscribed. Thank you!",
    resubscribed: "Welcome back. You're subscribed again.",
    invalid: "Please enter a valid email address.",
    too_many: "Too many attempts. Please try again in a few minutes.",
    error: "We couldn't subscribe you right now. Please try again.",
  },
  ar: {
    subscribed: "شكرًا لك، تم اشتراكك بنجاح.",
    already: "أنت مشترك بالفعل، شكرًا لك.",
    resubscribed: "مرحبًا بعودتك، تم تجديد اشتراكك.",
    invalid: "يرجى إدخال بريد إلكتروني صحيح.",
    too_many: "محاولات كثيرة، يرجى المحاولة بعد بضع دقائق.",
    error: "تعذّر إتمام الاشتراك الآن، يرجى المحاولة مرة أخرى.",
  },
};
