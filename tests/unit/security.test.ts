/**
 * Security review fixes (2026-11-14) — pure helpers.
 * Database-side checks live in tests/db/security-fixes.test.ts.
 */
import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";
import { isRecoverySession, RECOVERY_TTL_SECONDS, signRecoveryValue, verifyRecoveryValue } from "@/lib/auth/recovery-cookie";
import { ipFromHeaders } from "@/lib/checkout/rate-limit";
import { MAX_ORDER_LINES, orderLimitMessage } from "@/components/checkout/checkout-rules";
import { projectStorageHost } from "@/lib/admin/catalog-images";

describe("open redirects", () => {
  const evil = [
    "/.//evil.example/x",
    "/a/..//evil.example",
    "/./\\evil.example",
    "//evil",
    "/\\evil",
    "https://evil",
    "http://evil.example/x",
    "\\\\evil.example",
    "/%2e//evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
  ];
  it.each(evil)("%j falls back", (payload) => {
    expect(safeRedirectPath(payload, "/fallback")).toBe("/fallback");
  });

  it("keeps real same-site paths", () => {
    expect(safeRedirectPath("/checkout?step=2#pay")).toBe("/checkout?step=2#pay");
    expect(safeRedirectPath("/orders/abc")).toBe("/orders/abc");
    expect(safeRedirectPath("/a/../account")).toBe("/account");
    expect(safeRedirectPath(null, "/account")).toBe("/account");
  });

  it("never returns something a browser reads as another host", () => {
    for (const payload of evil) {
      const out = safeRedirectPath(payload, "/");
      expect(new URL(out, "https://shop.example").host).toBe("shop.example");
    }
  });
});

describe("password-reset marker cookie", () => {
  const KEY = "test-key";
  const USER = "11111111-2222-3333-4444-555555555555";
  const now = Date.parse("2026-11-14T12:00:00Z");

  it("accepts its own value until it expires", () => {
    const value = signRecoveryValue(USER, KEY, now);
    expect(verifyRecoveryValue(value, KEY, now)).toBe(USER);
    expect(verifyRecoveryValue(value, KEY, now + (RECOVERY_TTL_SECONDS - 1) * 1000)).toBe(USER);
    expect(verifyRecoveryValue(value, KEY, now + RECOVERY_TTL_SECONDS * 1000)).toBeNull();
  });

  it("refuses forged values", () => {
    const value = signRecoveryValue(USER, KEY, now);
    const [, exp, sig] = value.split(".");
    // The old format: a bare user id.
    expect(verifyRecoveryValue(USER, KEY, now)).toBeNull();
    // Another user with the same signature, a later expiry, or another key.
    expect(verifyRecoveryValue(`99999999-2222-3333-4444-555555555555.${exp}.${sig}`, KEY, now)).toBeNull();
    expect(verifyRecoveryValue(`${USER}.${Number(exp) + 3600}.${sig}`, KEY, now)).toBeNull();
    expect(verifyRecoveryValue(signRecoveryValue(USER, "attacker-key", now), KEY, now)).toBeNull();
    // Malformed.
    for (const bad of ["", "a.b.c", `${USER}.${exp}`, `${USER}.${exp}.${sig}.x`, `${USER}.soon.${sig}`, null, undefined]) {
      expect(verifyRecoveryValue(bad, KEY, now)).toBeNull();
    }
  });

  it("refuses a value that already expired when it was made", () => {
    expect(verifyRecoveryValue(signRecoveryValue(USER, KEY, now, -1), KEY, now)).toBeNull();
  });

  it("recognises a password-reset session from the token, not from the link", () => {
    const token = (amr: unknown) => `x.${Buffer.from(JSON.stringify({ amr })).toString("base64url")}.y`;
    expect(isRecoverySession(token([{ method: "recovery", timestamp: 1 }]))).toBe(true);
    expect(isRecoverySession(token([{ method: "magiclink", timestamp: 1 }]))).toBe(false);
    expect(isRecoverySession(token([{ method: "password", timestamp: 1 }]))).toBe(false);
    expect(isRecoverySession("not-a-token")).toBe(false);
    expect(isRecoverySession(null)).toBe(false);
  });
});

describe("client IP for rate limits", () => {
  const from = (h: Record<string, string>) => ipFromHeaders((name) => h[name] ?? null);
  it("prefers what the hosting proxy sets over what the browser sends", () => {
    expect(from({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 1.1.1.1" })).toBe("1.1.1.1");
    expect(from({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "6.6.6.6" })).toBe("2.2.2.2");
  });
  it("uses the last x-forwarded-for hop (added by our proxy), not the first", () => {
    expect(from({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" })).toBe("3.3.3.3");
    expect(from({})).toBe("unknown");
  });
});

describe("order limits", () => {
  it("tells the buyer why an order was refused, in both languages", () => {
    for (const code of ["too_many_items", "rate_limited", "too_many_open_orders"]) {
      expect(orderLimitMessage(code, "en")).not.toBe("");
      expect(orderLimitMessage(code, "ar")).not.toBe("");
    }
    expect(orderLimitMessage("too_many_items", "en")).toContain(String(MAX_ORDER_LINES));
    expect(orderLimitMessage("server", "en")).toBe("");
  });
});

describe("images", () => {
  it("allow this project's own Storage host only (https)", () => {
    expect(projectStorageHost("https://abcd.supabase.co")).toBe("abcd.supabase.co");
    expect(projectStorageHost("http://127.0.0.1:54321")).toBeNull();
    expect(projectStorageHost("https://abcd.supabase.co:8443")).toBeNull();
    expect(projectStorageHost("")).toBeNull();
  });
});
