"use server";

/* ══════════════════════════════════════════════════════════════
   Server Function — newsletter sign-up
   ──────────────────────────────────────────────────────────────
   Public (no account needed). Writes newsletter_subscribers with
   the service client: RLS lets only admins read or write the
   table directly.
   • Honeypot ("company"): bots that fill it get a quiet success.
   • Rate limit per client (hashed IP) and per address, shared by
     every server instance (lib/checkout/rate-limit).
   • Idempotent: an address already on the list is a success;
     an address that had unsubscribed is subscribed again. Every
     success gets the SAME answer, so the form can't be used to
     find out who is subscribed.
   Replies follow the visitor's language (NEXT_LOCALE).
   ══════════════════════════════════════════════════════════════ */

import { getServiceClient } from "@/lib/supabase/service";
import { getLocale } from "@/lib/i18n/server";
import { NEWSLETTER_MESSAGES, parseNewsletterEmail, type NewsletterState, type NewsletterStatus } from "@/lib/validations/newsletter";
import { clientKey, NEWSLETTER_CLIENT_LIMIT, NEWSLETTER_EMAIL_LIMIT, rateLimit, targetKey } from "@/lib/checkout/rate-limit";

const SOURCES = new Set(["footer", "home", "checkout"]);

export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const locale = await getLocale();
  const reply = (status: Exclude<NewsletterStatus, "idle">): NewsletterState => ({
    status,
    message: NEWSLETTER_MESSAGES[locale][status],
  });

  try {
    if (String(formData.get("company") ?? "").trim()) return reply("subscribed");

    const email = parseNewsletterEmail(formData.get("email"));
    if (!email) return reply("invalid");

    const [byClient, byEmail] = await Promise.all([
      rateLimit("newsletter", await clientKey(null), NEWSLETTER_CLIENT_LIMIT),
      rateLimit("newsletter-email", targetKey(email), NEWSLETTER_EMAIL_LIMIT),
    ]);
    if (!byClient || !byEmail) return reply("too_many");

    const rawSource = String(formData.get("source") ?? "footer");
    const source = SOURCES.has(rawSource) ? rawSource : "footer";

    const db = getServiceClient();
    const { error } = await db.from("newsletter_subscribers").insert({ email, locale, source });
    if (!error) return reply("subscribed");

    if (error.code === "23505") {
      // Already on the list (or coming back): same answer as a new sign-up.
      const { error: updateError } = await db
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: null, locale })
        .eq("email", email)
        .not("unsubscribed_at", "is", null);
      if (updateError) console.error("[newsletter] resubscribe:", updateError.message);
      return reply("subscribed");
    }

    console.error("[newsletter] insert:", error.message);
    return reply("error");
  } catch (err) {
    console.error("[newsletter] unexpected:", err instanceof Error ? err.message : err);
    return reply("error");
  }
}
