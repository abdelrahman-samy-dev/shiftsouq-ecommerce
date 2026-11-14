import "server-only";

/* ══════════════════════════════════════════════════════════════
   Password-reset marker cookie (RECOVERY_COOKIE)
   ──────────────────────────────────────────────────────────────
   /auth/callback sets it after a real password-reset link (the
   session's sign-in method is "recovery"); /reset-password and
   resetPasswordAction let a new password be set without the
   current one only while it is valid for the signed-in account.

   Value: "<userId>.<expiresAtSeconds>.<signature>", where the
   signature is HMAC-SHA256 over "<userId>.<expires>" with a key
   derived from SUPABASE_SERVICE_ROLE_KEY (no extra secret to
   manage; rotating the service key invalidates every marker).
   Checked in constant time; expired or altered values are refused.
   ══════════════════════════════════════════════════════════════ */

import { createHmac, timingSafeEqual } from "crypto";

/** How long a reset link's marker lets a new password be set. */
export const RECOVERY_TTL_SECONDS = 15 * 60;

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const signature = (payload: string, key: Buffer | string) => createHmac("sha256", key).update(payload).digest("base64url");

/** Signs a marker for `userId` valid for `ttlSeconds` from `now` (ms). */
export function signRecoveryValue(userId: string, key: Buffer | string, now = Date.now(), ttlSeconds = RECOVERY_TTL_SECONDS): string {
  if (!USER_ID.test(userId)) throw new Error("invalid user id");
  const payload = `${userId.toLowerCase()}.${Math.floor(now / 1000) + ttlSeconds}`;
  return `${payload}.${signature(payload, key)}`;
}

/** The user id a marker was issued for, or null when it is malformed, altered or expired. */
export function verifyRecoveryValue(value: string | null | undefined, key: Buffer | string, now = Date.now()): string | null {
  if (!value || typeof value !== "string" || value.length > 200) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!USER_ID.test(userId) || !/^\d{1,12}$/.test(exp)) return null;
  const expected = Buffer.from(signature(`${userId}.${exp}`, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) * 1000 <= now) return null;
  return userId;
}

/** Server key for the marker, derived from the service role key (never the key itself). */
function recoveryKey(): Buffer {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createHmac("sha256", service).update("shiftsouq:recovery-cookie:v1").digest();
}

/** Cookie value for a user who just opened a password-reset link. */
export function recoveryCookieValue(userId: string): string {
  return signRecoveryValue(userId, recoveryKey());
}

/** True when the marker is valid and was issued for this user. */
export function isRecoveryFor(value: string | null | undefined, userId: string | null | undefined): boolean {
  if (!userId) return false;
  try {
    const owner = verifyRecoveryValue(value, recoveryKey());
    return !!owner && owner === userId.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * True when a session's access token says it was created by a password-reset
 * link (sign-in method "recovery"). The token comes straight from the auth
 * server in exchangeCodeForSession, so its payload is only decoded here.
 */
export function isRecoverySession(accessToken: string | null | undefined): boolean {
  try {
    const payload = JSON.parse(Buffer.from(String(accessToken).split(".")[1] ?? "", "base64url").toString("utf8")) as {
      amr?: { method?: string }[];
    };
    return Array.isArray(payload.amr) && payload.amr.some((m) => m?.method === "recovery");
  } catch {
    return false;
  }
}
