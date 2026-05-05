/* ══════════════════════════════════════════════════════════════
   Server Actions — Contact Form
   ──────────────────────────────────────────────────────────────
   Inserts contact form submissions into the contact_messages
   table. Uses the service role client because the public anon
   key needs an INSERT policy (which we've created), but we use
   the admin client here for reliability and to avoid any RLS
   edge cases.
   ══════════════════════════════════════════════════════════════ */

"use server";

import { createClient } from "@supabase/supabase-js";

/* ── Types ───────────────────────────────────────────────────── */

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResult {
  success: boolean;
  message: string;
}

/* ── Service Client ──────────────────────────────────────────── */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/* ── Submit Contact Form ─────────────────────────────────────── */

/**
 * Validates and stores a contact form submission.
 * No authentication required — public visitors can submit.
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactResult> {
  try {
    /* 1. Server-side validation */
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const subject = data.subject?.trim();
    const message = data.message?.trim();

    if (!name || name.length < 2) {
      return { success: false, message: "Please enter a valid name (at least 2 characters)." };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    if (!subject || subject.length < 3) {
      return { success: false, message: "Please select or enter a subject." };
    }

    if (!message || message.length < 10) {
      return { success: false, message: "Message must be at least 10 characters long." };
    }

    if (message.length > 5000) {
      return { success: false, message: "Message must be under 5000 characters." };
    }

    /* 2. Insert into database */
    const db = getServiceClient();

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
      return { success: false, message: "Failed to send message. Please try again later." };
    }

    return {
      success: true,
      message: "Your message has been sent successfully! We'll get back to you within 24-48 hours.",
    };
  } catch (err) {
    console.error("[submitContactForm] unexpected:", err);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}
