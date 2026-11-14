import "server-only";

/* ══════════════════════════════════════════════════════════════
   Rate limits for public endpoints
   ──────────────────────────────────────────────────────────────
   Checkout (orders, promo codes), guest order tracking, sign-in,
   sign-up, forgotten password and the newsletter can be used
   without an account, so they are limited per client and per
   target:

   • the client key is a SHA-256 of the caller's IP (never stored
     raw), or the signed-in user's id. The IP comes from headers
     the hosting proxy sets itself (x-vercel-forwarded-for,
     x-real-ip), and only then from the LAST x-forwarded-for hop
     (the one added by our proxy) — the first hop is whatever the
     browser sent;
   • counters live in the database (rate_limit_hit(), migrations
     20261114070000_checkout.sql and 20261114080000_security_fixes.sql)
     so every server instance shares them; if that call fails, a
     per-instance memory counter takes over instead of letting
     everything through;
   • "count first, refund on success": a call that turns out fine
     (a promo code that works, a correct password) gives its hit
     back, so only failures add up — and concurrent guesses can't
     all slip through a check made before counting.
   ══════════════════════════════════════════════════════════════ */

import { createHash } from "crypto";
import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";

export interface Limit {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** Wrong promo codes: 10 per 15 minutes per client. Codes that work are refunded. */
export const PROMO_LIMIT: Limit = { limit: 10, windowSeconds: 15 * 60 };
/** Guest order lookups: 8 per 15 minutes per client… */
export const TRACK_CLIENT_LIMIT: Limit = { limit: 8, windowSeconds: 15 * 60 };
/** …and 5 per hour per order number, so one order's email can't be guessed from many addresses. */
export const TRACK_ORDER_LIMIT: Limit = { limit: 5, windowSeconds: 60 * 60 };

/** Orders (each one reserves stock): 5 per hour per account, 10 per hour per guest IP (shared mobile IPs)… */
export const ORDER_ACCOUNT_LIMIT: Limit = { limit: 5, windowSeconds: 60 * 60 };
export const ORDER_IP_LIMIT: Limit = { limit: 10, windowSeconds: 60 * 60 };
/** …and 5 per hour per phone number. */
export const ORDER_PHONE_LIMIT: Limit = { limit: 5, windowSeconds: 60 * 60 };
/** At most this many orders waiting for payment / confirmation per phone or email. */
export const MAX_OPEN_UNPAID_ORDERS = 3;

/** Wrong passwords: 10 per 15 minutes per client, 8 per 15 minutes per account email. */
export const LOGIN_CLIENT_LIMIT: Limit = { limit: 10, windowSeconds: 15 * 60 };
export const LOGIN_EMAIL_LIMIT: Limit = { limit: 8, windowSeconds: 15 * 60 };
/** New accounts: 5 per hour per client, 3 per hour per email. */
export const REGISTER_CLIENT_LIMIT: Limit = { limit: 5, windowSeconds: 60 * 60 };
export const REGISTER_EMAIL_LIMIT: Limit = { limit: 3, windowSeconds: 60 * 60 };
/** Reset links: 5 per 15 minutes per client, 3 per hour per email. */
export const RESET_CLIENT_LIMIT: Limit = { limit: 5, windowSeconds: 15 * 60 };
export const RESET_EMAIL_LIMIT: Limit = { limit: 3, windowSeconds: 60 * 60 };

/** Newsletter sign-ups: 6 per 10 minutes per client, 3 per 10 minutes per address. */
export const NEWSLETTER_CLIENT_LIMIT: Limit = { limit: 6, windowSeconds: 10 * 60 };
export const NEWSLETTER_EMAIL_LIMIT: Limit = { limit: 3, windowSeconds: 10 * 60 };

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/**
 * The caller's IP from request headers: what the hosting proxy itself sets
 * (x-vercel-forwarded-for, x-real-ip) first, else the last x-forwarded-for
 * hop. "unknown" when there is none. Pure, for tests.
 */
export function ipFromHeaders(get: (name: string) => string | null | undefined): string {
  const first = (v: string | null | undefined) => v?.split(",")[0]?.trim() || "";
  const last = (v: string | null | undefined) => v?.split(",").map((s) => s.trim()).filter(Boolean).pop() || "";
  return first(get("x-vercel-forwarded-for")) || first(get("x-real-ip")) || last(get("x-forwarded-for")) || "unknown";
}

/** The caller's IP as seen by the hosting proxy, or "unknown". */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return ipFromHeaders((name) => h.get(name));
}

/** Stable, privacy-preserving key for "this client": the user id when signed in, else a hash of the IP. */
export async function clientKey(userId?: string | null): Promise<string> {
  return userId ? `u:${userId}` : `ip:${sha(await clientIp())}`;
}

/** Key for a target (an order number, an email…), hashed so the table holds no personal data. */
export const targetKey = (value: string) => `t:${sha(value.trim().toLowerCase())}`;

/* ── Memory fallback (one server instance) ───────────────────── */

const memory = new Map<string, { start: number; hits: number }>();

function memoryHit(key: string, { limit, windowSeconds }: Limit, cost: number): boolean {
  const now = Date.now();
  const cur = memory.get(key);
  const fresh = !cur || now - cur.start >= windowSeconds * 1000;
  if (cost < 0) {
    if (!fresh) memory.set(key, { start: cur.start, hits: Math.max(0, cur.hits + cost) });
    return true;
  }
  const before = fresh ? 0 : cur.hits;
  memory.set(key, { start: fresh ? now : cur.start, hits: before + cost });
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (now - v.start > 86_400_000) memory.delete(k);
  }
  return before < limit;
}

/**
 * Counts `cost` hits for `bucket:key` and says whether the call may go ahead
 * (the window had room before this call). `cost: 0` only checks; a negative
 * cost gives hits back (see refundRateLimit).
 */
export async function rateLimit(bucket: string, key: string, rule: Limit, cost = 1): Promise<boolean> {
  const full = `${bucket}:${key}`;
  try {
    const { data, error } = await getServiceClient().rpc("rate_limit_hit", {
      p_key: full,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
      p_cost: cost,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error("[rateLimit] database counter unavailable, using memory:", err instanceof Error ? err.message : err);
    return memoryHit(full, rule, cost);
  }
}

/** Gives back one hit counted by rateLimit() for a call that turned out fine. */
export async function refundRateLimit(bucket: string, key: string, rule: Limit): Promise<void> {
  await rateLimit(bucket, key, rule, -1);
}
