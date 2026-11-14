import "server-only";

/* ══════════════════════════════════════════════════════════════
   Rate limits for guest-facing checkout endpoints
   ──────────────────────────────────────────────────────────────
   Promo codes and guest order tracking can be used without an
   account, so they are limited per client and per target:

   • the client key is a SHA-256 of the caller's IP (never stored
     raw), or the signed-in user's id;
   • counters live in the database (rate_limit_hit(), migration
     20261114070000_checkout.sql) so every server instance shares
     them; if that call fails, a per-instance memory counter takes
     over instead of letting everything through.
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

/** Wrong promo codes: 10 per 15 minutes per client. Codes that work are never counted. */
export const PROMO_LIMIT: Limit = { limit: 10, windowSeconds: 15 * 60 };
/** Guest order lookups: 8 per 15 minutes per client… */
export const TRACK_CLIENT_LIMIT: Limit = { limit: 8, windowSeconds: 15 * 60 };
/** …and 5 per hour per order number, so one order's email can't be guessed from many addresses. */
export const TRACK_ORDER_LIMIT: Limit = { limit: 5, windowSeconds: 60 * 60 };

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/** The caller's IP as seen by the hosting proxy (first x-forwarded-for hop), or "unknown". */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
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
  const before = fresh ? 0 : cur.hits;
  memory.set(key, { start: fresh ? now : cur.start, hits: before + cost });
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (now - v.start > 86_400_000) memory.delete(k);
  }
  return before < limit;
}

/**
 * Counts `cost` hits for `bucket:key` and says whether the call may go ahead
 * (the window had room before this call). `cost: 0` only checks.
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
