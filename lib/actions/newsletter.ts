"use server";

/* ══════════════════════════════════════════════════════════════
   Server Function — newsletter sign-up
   ──────────────────────────────────────────────────────────────
   Public (no account needed). Writes newsletter_subscribers with
   the service client: RLS lets only admins read or write the
   table directly.
   • Honeypot ("company"): bots that fill it get a quiet success.
   • Light rate limit per IP and per address (in memory).
   • Idempotent: an address already on the list is a success;
     an address that had unsubscribed is subscribed again.
   Replies follow the visitor's language (NEXT_LOCALE).
   ══════════════════════════════════════════════════════════════ */

import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";
import { getLocale } from "@/lib/i18n/server";
import { NEWSLETTER_MESSAGES, parseNewsletterEmail, type NewsletterState, type NewsletterStatus } from "@/lib/validations/newsletter";
import { createRateLimiter } from "@/components/layout/shell-rules";

const byIp = createRateLimiter({ limit: 6, windowMs: 10 * 60 * 1000 });
const byEmail = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

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

    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
    if (!byIp.hit(`ip:${ip}`) || !byEmail.hit(`email:${email}`)) return reply("too_many");

    const rawSource = String(formData.get("source") ?? "footer");
    const source = SOURCES.has(rawSource) ? rawSource : "footer";

    const db = getServiceClient();
    const { error } = await db.from("newsletter_subscribers").insert({ email, locale, source });
    if (!error) return reply("subscribed");

    if (error.code === "23505") {
      const { data: back, error: updateError } = await db
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: null, locale })
        .eq("email", email)
        .not("unsubscribed_at", "is", null)
        .select("id");
      if (updateError) console.error("[newsletter] resubscribe:", updateError.message);
      return reply(back && back.length ? "resubscribed" : "already");
    }

    console.error("[newsletter] insert:", error.message);
    return reply("error");
  } catch (err) {
    console.error("[newsletter] unexpected:", err instanceof Error ? err.message : err);
    return reply("error");
  }
}
