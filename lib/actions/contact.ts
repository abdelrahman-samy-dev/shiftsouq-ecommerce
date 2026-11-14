/* ══════════════════════════════════════════════════════════════
   Server Actions — Contact Form
   ──────────────────────────────────────────────────────────────
   Inserts contact form submissions into the contact_messages
   table with the service role client. There is deliberately no
   public INSERT policy (migration 20261114080000), so the honeypot
   and the per-address throttle below can't be bypassed by
   writing to the table with the public key.

   Replies are written in the visitor's language (NEXT_LOCALE).
   ══════════════════════════════════════════════════════════════ */

"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { getLocaleAndDictionary } from "@/lib/i18n/server";
import { createContactSchema } from "@/lib/validations/contact";

/* ── Types ───────────────────────────────────────────────────── */

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: hidden field that real visitors leave empty. */
  website?: string;
}

export interface ContactResult {
  success: boolean;
  message: string;
  /** Field the message refers to, when it is a validation error. */
  field?: "name" | "email" | "subject" | "message";
}

/* ── Submit Contact Form ─────────────────────────────────────── */

/**
 * Validates and stores a contact form submission.
 * No authentication required — public visitors can submit.
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactResult> {
  const { dict } = await getLocaleAndDictionary();
  const t = dict.contact;

  try {
    // Bots fill every field, including the hidden one: pretend success.
    if (data?.website) {
      return { success: true, message: t.form.success };
    }

    /* 1. Server-side validation */
    const parsed = createContactSchema(dict.validation).safeParse({
      name: data?.name ?? "",
      email: data?.email ?? "",
      subject: data?.subject ?? "",
      message: data?.message ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        message: issue?.message ?? t.form.error,
        field: issue?.path[0] as ContactResult["field"],
      };
    }

    const { name, email, subject, message } = parsed.data;

    /* 2. Throttle: at most 3 messages per email address every 10 minutes */
    const db = getServiceClient();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return { success: false, message: t.errors.tooMany };
    }

    /* 3. Insert into database */

    const { error } = await db
      .from("contact_messages")
      .insert({
        name,
        email,
        subject,
        message,
      });

    if (error) {
      console.error("[submitContactForm]", error.message);
      return { success: false, message: t.errors.sendFailed };
    }

    return { success: true, message: t.form.success };
  } catch (err) {
    console.error("[submitContactForm] unexpected:", err);
    return { success: false, message: t.errors.unexpected };
  }
}
