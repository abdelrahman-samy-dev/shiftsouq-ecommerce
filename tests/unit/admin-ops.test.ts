import { describe, expect, it } from "vitest";
import {
  averageOrderValue,
  fillDailySeries,
  isKpiPeriod,
  niceMax,
  percentChange,
  periodRange,
  tzOffsetMs,
  zonedDate,
  zonedMidnight,
} from "@/lib/admin/kpi";
import {
  GOVERNORATE_KEYS,
  isHeroImage,
  isSafeLink,
  mergeSettingsJson,
  sameJson,
  settingsErrors,
  settingsSchema,
  settingsToRow,
  settingsToValues,
  type SettingsValues,
} from "@/lib/admin/settings-schema";
import { checkOwnershipTransfer, checkRoleChange, temporaryPassword, wouldRemoveLastOwner } from "@/lib/admin/team";
import { activeNavItem, ADMIN_NAV, entityHref } from "@/lib/admin/nav";
import { formatAmount, formatPercent, getAdminText } from "@/lib/admin/i18n";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings/types";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";

const TZ = "Africa/Cairo";

/* ── KPI periods ─────────────────────────────────────────────── */

describe("KPI periods (store time)", () => {
  it("Cairo offset follows summer time", () => {
    expect(tzOffsetMs(new Date("2026-01-15T12:00:00Z"), TZ)).toBe(2 * 3600_000);
    expect(tzOffsetMs(new Date("2026-07-15T12:00:00Z"), TZ)).toBe(3 * 3600_000);
  });

  it("local midnight is the right instant in winter and summer", () => {
    expect(zonedMidnight(2026, 11, 14, TZ).toISOString()).toBe("2026-11-13T22:00:00.000Z");
    expect(zonedMidnight(2026, 7, 1, TZ).toISOString()).toBe("2026-06-30T21:00:00.000Z");
    // Day overflow rolls into the previous month.
    expect(zonedMidnight(2026, 11, 0, TZ).toISOString()).toBe("2026-10-30T22:00:00.000Z");
  });

  it("the calendar day is taken in Cairo, not UTC", () => {
    // 23:30 UTC on the 13th is already the 14th in Cairo.
    expect(zonedDate(new Date("2026-11-13T23:30:00Z"), TZ)).toEqual({ y: 2026, m: 11, d: 14 });
  });

  it("today: from local midnight to now; previous: yesterday until the same hour", () => {
    const now = new Date("2026-11-14T10:00:00Z"); // 12:00 in Cairo
    const r = periodRange("today", now, TZ);
    expect(r.from.toISOString()).toBe("2026-11-13T22:00:00.000Z");
    expect(r.to).toBe(now);
    expect(r.prevFrom.toISOString()).toBe("2026-11-12T22:00:00.000Z");
    expect(r.prevTo.toISOString()).toBe("2026-11-13T10:00:00.000Z");
  });

  it("7 and 30 days include today and compare with an equally long period before", () => {
    const now = new Date("2026-11-14T10:00:00Z");
    const w = periodRange("7d", now, TZ);
    expect(w.from.toISOString()).toBe("2026-11-07T22:00:00.000Z");
    expect(w.prevFrom.toISOString()).toBe("2026-10-31T22:00:00.000Z");
    expect(w.prevTo.getTime() - w.prevFrom.getTime()).toBe(w.to.getTime() - w.from.getTime());
    const m = periodRange("30d", now, TZ);
    expect(m.from.toISOString()).toBe("2026-10-15T21:00:00.000Z"); // 16 Oct is still summer time (UTC+3) in Egypt
    expect(m.prevTo.getTime()).toBeLessThanOrEqual(m.from.getTime() + 3600_000);
  });

  it("period names are validated", () => {
    expect(isKpiPeriod("7d")).toBe(true);
    expect(isKpiPeriod("90d")).toBe(false);
    expect(isKpiPeriod(undefined)).toBe(false);
  });

  it("percent change handles zero and missing history", () => {
    expect(percentChange(150, 100)).toBeCloseTo(0.5);
    expect(percentChange(50, 100)).toBeCloseTo(-0.5);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(Number.NaN, 1)).toBeNull();
  });

  it("average order value never divides by zero", () => {
    expect(averageOrderValue(900, 3)).toBe(300);
    expect(averageOrderValue(900, 0)).toBe(0);
  });

  it("daily series has no gaps and ends today", () => {
    const now = new Date("2026-11-14T10:00:00Z");
    const s = fillDailySeries([{ day: "2026-11-12", revenue: 120, orders: 2 }], 5, now, TZ);
    expect(s.map((p) => p.day)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
    expect(s[2]).toEqual({ day: "2026-11-12", revenue: 120, orders: 2 });
    expect(s[4].revenue).toBe(0);
  });

  it("chart axis rounds up to clean numbers", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(4526)).toBe(5000);
    expect(niceMax(5206)).toBe(10000);
    expect(niceMax(180)).toBe(200);
    expect(niceMax(2100)).toBe(2500);
  });
});

/* ── Settings validation ─────────────────────────────────────── */

const valid = (): SettingsValues => settingsToValues(DEFAULT_SETTINGS);

describe("settings schema", () => {
  it("accepts the default settings", () => {
    expect(settingsSchema.safeParse(valid()).success).toBe(true);
  });

  it("covers all 27 checkout governorates", () => {
    expect(GOVERNORATE_KEYS).toHaveLength(27);
    expect([...GOVERNORATE_KEYS].sort()).toEqual(GOVERNORATES.map((g) => g.value).sort());
    expect(Object.keys(valid().shipping.zones).sort()).toEqual([...GOVERNORATE_KEYS].sort());
  });

  it("reports errors by field path with short codes", () => {
    const v = valid();
    v.contact.email = "not-an-email";
    v.social.instagram = "http://instagram.com/x";
    v.shipping.defaultFee = -5;
    v.shipping.etaDays = { min: 5, max: 2 };
    v.payments = { cod: false, card: false, wallet: false };
    v.announcement = [{ en: "Hello", ar: "" }];
    v.home.hero.ctaHref = "//evil.example";
    v.home.hero.image = "https://evil.example/x.jpg";
    v.inventory.lowStockThreshold = 2.5;
    const r = settingsSchema.safeParse(v);
    expect(r.success).toBe(false);
    const errors = settingsErrors(r.error!);
    expect(errors["contact.email"]).toBe("email");
    expect(errors["social.instagram"]).toBe("url");
    expect(errors["shipping.defaultFee"]).toBe("number");
    expect(errors["shipping.etaDays.max"]).toBe("eta");
    expect(errors["payments"]).toBe("payments");
    expect(errors["announcement.0.ar"]).toBe("required");
    expect(errors["home.hero.ctaHref"]).toBe("link");
    expect(errors["home.hero.image"]).toBe("image");
    expect(errors["inventory.lowStockThreshold"]).toBe("number");
  });

  it("rejects unknown governorates and too many messages", () => {
    const v = valid();
    v.shipping.zones = { ...v.shipping.zones, atlantis: 10 };
    v.announcement = Array.from({ length: 9 }, () => ({ en: "a", ar: "ب" }));
    const errors = settingsErrors(settingsSchema.safeParse(v).error!);
    expect(errors["shipping.zones.atlantis"]).toBeDefined();
    expect(errors["announcement"]).toBe("too_many");
  });

  it("links: store paths or https only", () => {
    expect(isSafeLink("/shop")).toBe(true);
    expect(isSafeLink("/category/shoes?sort=new")).toBe(true);
    expect(isSafeLink("//evil.example")).toBe(false);
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("http://example.com")).toBe(false);
    expect(isSafeLink("https://example.com/sale")).toBe(true);
    expect(isHeroImage("/images/hero.jpg")).toBe(true);
    expect(isHeroImage("https://images.unsplash.com/photo-1")).toBe(true);
    expect(isHeroImage("https://example.com/a.jpg")).toBe(false);
  });

  it("writes the store_settings JSON that the storefront reads back", () => {
    const v = valid();
    v.shipping.defaultFee = 75;
    v.shipping.zones.cairo = 40;
    v.shipping.freeThreshold = 1200;
    v.home.hero.image = "/images/hero.jpg";
    v.home.hero.title = { en: "New season", ar: "موسم جديد" };
    v.contact.whatsapp = "+20 100 123 4567";
    v.home.hero.tone = "dark";
    v.home.hero.align = "right";
    const parsed = settingsSchema.parse(v);
    const row = settingsToRow(parsed);
    expect(row.home.hero).toMatchObject({ tone: "dark", align: "right" });
    // Hero look comes from the extras reader; defaults are light text on the left.
    expect(settingsToValues(DEFAULT_SETTINGS).home.hero).toMatchObject({ tone: "light", align: "left" });
    expect(settingsToValues(DEFAULT_SETTINGS, { tone: "dark", align: "right" }).home.hero).toMatchObject({ tone: "dark", align: "right" });
    const bad = settingsSchema.safeParse({ ...v, home: { hero: { ...v.home.hero, tone: "neon" } } });
    expect(settingsErrors(bad.error!)["home.hero.tone"]).toBeDefined();
    expect(row.shipping).toMatchObject({ default_fee: 75, free_threshold: 1200 });
    expect(row.shipping.zones.cairo).toBe(40);
    expect(row.contact.whatsapp).toBe("+201001234567");
    const back = normalizeSettings({ ...row, updated_at: "2026-11-14T10:00:00Z" });
    expect(back.shipping.defaultFee).toBe(75);
    expect(back.shipping.zones.cairo).toBe(40);
    expect(back.home.hero?.title.ar).toBe("موسم جديد");
    expect(back.contact.address).toEqual(DEFAULT_SETTINGS.contact.address);
    expect(settingsToValues(back).shipping.zones.cairo).toBe(40);
  });
});

describe("settings save keeps keys the form does not edit", () => {
  it("deep-merges objects, replaces arrays and values", () => {
    const stored = {
      hero: { image: "/old.jpg", alt_en: "Man in a white T-shirt", credit: { photographer: "A. B." } },
      eta_days: { min: 2, max: 5 },
      eta_days_by_zone: { cairo: { min: 1, max: 2 } },
      list: [1, 2, 3],
    };
    const next = { hero: { image: "/new.jpg", title_en: "New" }, eta_days: { min: 1, max: 3 }, list: [9] };
    expect(mergeSettingsJson(stored, next)).toEqual({
      hero: { image: "/new.jpg", alt_en: "Man in a white T-shirt", credit: { photographer: "A. B." }, title_en: "New" },
      eta_days: { min: 1, max: 3 },
      eta_days_by_zone: { cairo: { min: 1, max: 2 } },
      list: [9],
    });
    expect(mergeSettingsJson(null, { a: 1 })).toEqual({ a: 1 });
  });

  it("compares stored JSON without caring about key order", () => {
    expect(sameJson({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameJson({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(sameJson(null, undefined)).toBe(true);
  });
});

/* ── Team rules ──────────────────────────────────────────────── */

describe("team rules", () => {
  const base = { actorId: "owner", targetId: "t1" };

  it("only the owner changes roles", () => {
    expect(checkRoleChange({ ...base, actorRole: "admin", targetRole: "customer", newRole: "admin" })).toEqual({ ok: false, error: "owner_only" });
    expect(checkRoleChange({ ...base, actorRole: "customer", targetRole: "customer", newRole: "admin" })).toEqual({ ok: false, error: "owner_only" });
    expect(checkRoleChange({ ...base, actorRole: "super_admin", targetRole: "customer", newRole: "admin" })).toEqual({ ok: true });
    expect(checkRoleChange({ ...base, actorRole: "super_admin", targetRole: "admin", newRole: "customer" })).toEqual({ ok: true });
  });

  it("nobody changes their own role or the owner's, and owner is not assignable", () => {
    expect(checkRoleChange({ actorId: "owner", targetId: "owner", actorRole: "super_admin", targetRole: "super_admin", newRole: "admin" })).toEqual({
      ok: false,
      error: "self",
    });
    expect(checkRoleChange({ ...base, actorRole: "super_admin", targetRole: "super_admin", newRole: "admin" })).toEqual({ ok: false, error: "owner_role" });
    expect(checkRoleChange({ ...base, actorRole: "super_admin", targetRole: "admin", newRole: "super_admin" })).toEqual({ ok: false, error: "invalid_role" });
    expect(checkRoleChange({ ...base, actorRole: "super_admin", targetRole: "admin", newRole: "admin" })).toEqual({ ok: false, error: "same_role" });
  });

  it("ownership goes only from the owner to an admin who can sign in", () => {
    const t = { ...base, actorRole: "super_admin" as const, targetRole: "admin" as const, targetHasAccount: true };
    expect(checkOwnershipTransfer(t)).toEqual({ ok: true });
    expect(checkOwnershipTransfer({ ...t, actorRole: "admin" })).toEqual({ ok: false, error: "owner_only" });
    expect(checkOwnershipTransfer({ ...t, targetRole: "customer" })).toEqual({ ok: false, error: "not_admin" });
    expect(checkOwnershipTransfer({ ...t, targetHasAccount: false })).toEqual({ ok: false, error: "no_account" });
    expect(checkOwnershipTransfer({ ...t, targetId: "owner" })).toEqual({ ok: false, error: "self" });
  });

  it("knows when the last owner would go", () => {
    expect(wouldRemoveLastOwner([{ id: "a", hasAccount: true }], "a")).toBe(true);
    expect(wouldRemoveLastOwner([{ id: "a", hasAccount: true }, { id: "b", hasAccount: false }], "a")).toBe(true);
    expect(wouldRemoveLastOwner([{ id: "a", hasAccount: true }, { id: "b", hasAccount: true }], "a")).toBe(false);
  });

  it("temporary passwords are 4 readable groups without bias-prone characters", () => {
    let i = 0;
    const seq = (n: number) => Uint8Array.from({ length: n }, () => i++ % 256);
    const pw = temporaryPassword(seq);
    expect(pw).toMatch(/^[A-HJ-NP-Za-km-z2-9]{4}(-[A-HJ-NP-Za-km-z2-9]{4}){3}$/);
  });
});

/* ── Navigation and formatting ───────────────────────────────── */

describe("admin navigation", () => {
  it("groups match the brief and link to the catalogue pages", () => {
    expect(ADMIN_NAV.map((g) => g.id)).toEqual(["overview", "sales", "catalogue", "engagement", "store"]);
    const hrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
    for (const h of ["/admin/products", "/admin/categories", "/admin/collections", "/admin/inventory", "/admin/promos"]) expect(hrefs).toContain(h);
  });

  it("finds the active section for nested pages", () => {
    expect(activeNavItem("/admin")?.id).toBe("overview");
    expect(activeNavItem("/admin/orders/123/print")?.id).toBe("orders");
    expect(activeNavItem("/admin/customers/abc")?.id).toBe("customers");
    expect(activeNavItem("/admin/ordersx")).toBeNull();
  });

  it("links audit entries to their pages", () => {
    expect(entityHref("orders", "o-1")).toBe("/admin/orders/o-1");
    expect(entityHref("profiles", "p-1", "team.role")).toBe("/admin/team");
    expect(entityHref("store_settings", null)).toBe("/admin/settings");
    expect(entityHref("unknown", "x")).toBeNull();
  });

  it("money and percentages use Western digits in Arabic", () => {
    expect(formatAmount(1250, "ar")).toBe("1,250 ج.م");
    expect(formatAmount(1250, "en")).toBe("EGP 1,250");
    expect(formatPercent(0.123, "ar")).toBe("12%");
    expect(formatPercent(-0.05, "en")).toBe("5%");
  });

  it("Arabic and English admin text have the same keys", () => {
    const keys = (o: unknown, p = ""): string[] =>
      o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`])) : [];
    expect(keys(getAdminText("ar")).sort()).toEqual(keys(getAdminText("en")).sort());
  });
});
