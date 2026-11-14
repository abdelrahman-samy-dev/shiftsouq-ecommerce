import { describe, expect, it } from "vitest";
import {
  addressSchema,
  checkoutTotals,
  deliveryEta,
  deliverySchema,
  formatAddress,
  formatEgyptianMobile,
  formatMoney,
  freeShippingProgress,
  normalizeEmail,
  normalizeOrderNumber,
  paymentOptions,
  paymentUnavailableMessage,
  promoErrorMessage,
  COD_MAX_AMOUNT,
} from "@/components/checkout/checkout-rules";
import { DEFAULT_SETTINGS, normalizeSettings, type ShippingSettings } from "@/lib/settings/types";
import { governorateName, isKnownGovernorate } from "@/lib/checkout/shipping";
import { lineKey, maxQuantity, reconcileCart } from "@/lib/checkout/cart-sync";
import { orderTimeline } from "@/components/orders/order-rules";
import { emailsMatch } from "@/lib/checkout/secure-compare";

const rates = (over: Partial<ShippingSettings> = {}): ShippingSettings => ({ ...DEFAULT_SETTINGS.shipping, ...over });

describe("delivery from the store settings", () => {
  it("charges the owner's zone fee, the default fee elsewhere, and nothing above the free threshold", () => {
    const r = rates({ defaultFee: 80, freeThreshold: 1500, zones: { ...DEFAULT_SETTINGS.shipping.zones, cairo: 35, aswan: 120 } });
    expect(checkoutTotals(500, 0, "cairo", r)).toMatchObject({ shipping: 35, total: 535 });
    expect(checkoutTotals(500, 0, "aswan", r)).toMatchObject({ shipping: 120, total: 620 });
    expect(checkoutTotals(1500, 0, "aswan", r)).toMatchObject({ shipping: 0, total: 1500 });
    // The discount counts: 1600 − 200 = 1400 is below the threshold again.
    expect(checkoutTotals(1600, 200, "cairo", r)).toMatchObject({ afterDiscount: 1400, shipping: 35, total: 1435 });
  });

  it("never ships free when the threshold is 0, and asks for a governorate first", () => {
    const r = rates({ freeThreshold: 0 });
    expect(checkoutTotals(100_000, 0, "giza", r).shipping).toBe(50);
    expect(checkoutTotals(100_000, 0, null, r)).toMatchObject({ shipping: null, total: 100_000 });
    expect(freeShippingProgress(100_000, 0)).toEqual({ qualifies: false, remaining: 0, percent: 0 });
  });

  it("reads the settings row the admin saves (snake_case JSON) over the defaults", () => {
    const s = normalizeSettings({
      shipping: { default_fee: 90, free_threshold: 2000, zones: { cairo: 40 }, eta_days: { min: 1, max: 3 } },
      payments: { cod: true, card: false, wallet: true },
    });
    expect(s.shipping).toMatchObject({ defaultFee: 90, freeThreshold: 2000, etaDays: { min: 1, max: 3 } });
    expect(s.shipping.zones.cairo).toBe(40);
    expect(s.shipping.zones.giza).toBe(50); // untouched zones keep their default
    expect(s.payments).toEqual({ cod: true, card: false, wallet: true });
    expect(freeShippingProgress(500, s.shipping.freeThreshold)).toEqual({ qualifies: false, remaining: 1500, percent: 25 });
  });

  it("describes the delivery time from the ETA setting", () => {
    expect(deliveryEta({ min: 2, max: 5 }, "en")).toBe("Delivery in 2–5 working days");
    expect(deliveryEta({ min: 1, max: 1 }, "en")).toBe("Delivery in 1 working day");
    expect(deliveryEta({ min: 2, max: 5 }, "ar")).toBe("التوصيل خلال 2 إلى 5 أيام عمل");
  });
});

describe("payment methods on offer", () => {
  const all = { cod: true, card: true, wallet: true };

  it("disables what the owner switched off, what the gateway can't take, and COD above the ceiling", () => {
    expect(paymentOptions({ enabled: { ...all, card: false }, gateway: { card: true, wallet: true }, total: 100 }).card).toEqual({
      method: "card",
      available: false,
      reason: "store_off",
    });
    expect(paymentOptions({ enabled: all, gateway: { card: true, wallet: false }, total: 100 }).wallet.reason).toBe("gateway");
    expect(paymentOptions({ enabled: all, gateway: { card: true, wallet: true }, total: COD_MAX_AMOUNT + 1 }).cod.reason).toBe("cod_limit");
    expect(paymentOptions({ enabled: all, gateway: { card: true, wallet: true }, total: COD_MAX_AMOUNT }).cod.available).toBe(true);
  });

  it("explains each reason in both languages", () => {
    expect(paymentUnavailableMessage("store_off", "en")).toMatch(/doesn't offer/);
    expect(paymentUnavailableMessage("cod_limit", "ar")).toContain("10,000 ج.م");
    expect(paymentUnavailableMessage(null, "en")).toBe("");
    expect(promoErrorMessage("rate_limited", "en")).toMatch(/too many/i);
    expect(promoErrorMessage("rate_limited", "ar")).toMatch(/محاولات كثيرة/);
  });
});

describe("formatting", () => {
  it("shows Arabic prices with Western digits", () => {
    expect(formatMoney(1250, "ar")).toBe("1,250 ج.م");
    expect(formatMoney(1250, "en")).toBe("EGP 1,250");
  });

  it("formats phones, addresses, emails and order numbers", () => {
    expect(formatEgyptianMobile("+201012345678")).toBe("010 1234 5678");
    expect(formatEgyptianMobile("123")).toBe("123");
    expect(formatAddress({ address: "12 Abbas St", apartment: "Floor 3", city: "Nasr City", governorate: "cairo" }, "en")).toBe(
      "12 Abbas St, Floor 3, Nasr City, Cairo",
    );
    expect(formatAddress({ address: "12 شارع عباس", city: "مدينة نصر", governorate: "cairo" }, "ar")).toBe("12 شارع عباس، مدينة نصر، القاهرة");
    expect(normalizeEmail("  Mona@Example.COM ")).toBe("mona@example.com");
    expect(normalizeOrderNumber(" ss-20261114-1a2b3c ")).toBe("SS-20261114-1A2B3C");
    expect(governorateName("port-said", "ar")).toBe("بور سعيد");
    expect(isKnownGovernorate("__proto__")).toBe(false);
  });
});

describe("delivery and address forms", () => {
  const delivery = { firstName: "Mona", lastName: "Ali", governorate: "giza", city: "Dokki", address: "5 Tahrir St", apartment: "", postalCode: "", notes: "" };

  it("accepts a complete delivery and rejects an unknown governorate in Arabic", () => {
    expect(deliverySchema("en").safeParse(delivery).success).toBe(true);
    const r = deliverySchema("ar").safeParse({ ...delivery, governorate: "atlantis" });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContain("يرجى اختيار المحافظة");
  });

  it("validates saved addresses like checkout (Egyptian mobile, governorate, address)", () => {
    const a = { label: "Home", fullName: "Mona Ali", phone: "01012345678", governorate: "cairo", city: "Maadi", address: "9 Road 9", apartment: "", postalCode: "", isDefault: true };
    expect(addressSchema("en").safeParse(a).success).toBe(true);
    expect(addressSchema("en").safeParse({ ...a, phone: "0223456789" }).success).toBe(false);
    expect(addressSchema("en").safeParse({ ...a, fullName: "M" }).success).toBe(false);
  });
});

describe("bag re-validation", () => {
  const line = (cartKey: string, price: number, quantity: number) => ({ cartKey, productId: cartKey, variantId: "v", price, quantity });

  it("updates prices, lowers quantities to the stock left and flags lines that can't be bought", () => {
    const lines = [line("a", 120, 1), line("b", 200, 3), line("c", 99, 1), line("d", 50, 1)];
    const status = {
      [lineKey("a", "v")]: { available: true, price: 110, stock: 10 },
      [lineKey("b", "v")]: { available: true, price: 200, stock: 2 },
      [lineKey("c", "v")]: { available: false, price: null, stock: 0 },
      [lineKey("d", "v")]: { available: true, price: 50, stock: 0 },
    };
    const r = reconcileCart(lines, status);
    expect(r.fixes).toEqual([
      { cartKey: "a", price: 110 },
      { cartKey: "b", quantity: 2 },
    ]);
    expect(r.blocked).toEqual(["c", "d"]);
    expect(r.notices).toContainEqual({ kind: "price_changed", cartKey: "a", from: 120, to: 110 });
    expect(r.notices).toContainEqual({ kind: "low_stock", cartKey: "b", left: 2, from: 3 });
    expect(r.notices.filter((n) => n.kind === "unavailable")).toHaveLength(2);
  });

  it("leaves unchanged and unknown lines alone, and caps the stepper at the stock", () => {
    expect(reconcileCart([line("a", 120, 1)], { [lineKey("a", "v")]: { available: true, price: 120, stock: 5 } })).toEqual({
      notices: [],
      fixes: [],
      blocked: [],
    });
    expect(reconcileCart([line("x", 1, 1)], {}).fixes).toEqual([]);
    expect(maxQuantity({ available: true, price: 1, stock: 3 })).toBe(3);
    expect(maxQuantity({ available: true, price: 1, stock: 500 })).toBe(99);
    expect(maxQuantity(undefined)).toBe(99);
  });
});

describe("order status timeline", () => {
  it("marks the steps before the status done and the status current", () => {
    const t = orderTimeline("shipped");
    expect(t.ended).toBeNull();
    expect(t.steps.map((s) => s.state)).toEqual(["done", "done", "done", "current", "upcoming"]);
    expect(orderTimeline("delivered").steps.every((s) => s.state === "done")).toBe(true);
    expect(orderTimeline("pending").steps[0].state).toBe("current");
  });

  it("shows cancelled and refunded orders as ended", () => {
    expect(orderTimeline("cancelled").ended).toBe("cancelled");
    expect(orderTimeline("refunded").ended).toBe("refunded");
  });
});

describe("guest tracking email check", () => {
  it("matches emails case-insensitively and never matches an empty email", () => {
    expect(emailsMatch("Mona@Example.com", " mona@example.com")).toBe(true);
    expect(emailsMatch("mona@example.com", "mona@example.co")).toBe(false);
    expect(emailsMatch("", "")).toBe(false);
    expect(emailsMatch(null, null)).toBe(false);
  });
});
