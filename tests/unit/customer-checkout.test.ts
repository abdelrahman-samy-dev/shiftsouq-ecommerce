import { describe, expect, it } from "vitest";
import { FREE_SHIPPING_THRESHOLD, shippingFee } from "@/lib/checkout/shipping";
import {
  checkoutTotals,
  contactSchema,
  egyptianMobileToE164,
  formatMoney,
  freeShippingProgress,
  normalizeEgyptianMobile,
  promoErrorMessage,
  shippingSchema,
  splitFullName,
  toLatinDigits,
} from "@/components/checkout/checkout-rules";
import { orderCapabilities, PAYMENT_WINDOW_MINUTES } from "@/components/orders/order-rules";

describe("Egyptian mobile numbers", () => {
  it("accepts 11-digit 010/011/012/015 numbers in common spellings", () => {
    for (const n of ["01012345678", "011 2345 6789", "012-3456-7890", "+201512345678", "00201012345678", "201012345678", "(010) 1234 5678"]) {
      expect(normalizeEgyptianMobile(n)).toMatch(/^01[0125]\d{8}$/);
    }
    expect(normalizeEgyptianMobile("+20 101 234 5678")).toBe("01012345678");
  });

  it("accepts Arabic-Indic digits", () => {
    expect(toLatinDigits("٠١٠١٢٣٤٥٦٧٨")).toBe("01012345678");
    expect(normalizeEgyptianMobile("٠١٠١٢٣٤٥٦٧٨")).toBe("01012345678");
  });

  it("rejects landlines, other prefixes, wrong lengths and foreign numbers", () => {
    for (const n of ["0223456789", "01312345678", "0101234567", "010123456789", "1012345678", "+966500000001", "", null, undefined, "abc"]) {
      expect(normalizeEgyptianMobile(n)).toBeNull();
    }
  });

  it("converts to E.164 for the phone field, empty when not Egyptian", () => {
    expect(egyptianMobileToE164("01012345678")).toBe("+201012345678");
    expect(egyptianMobileToE164("+966500000001")).toBe("");
    expect(egyptianMobileToE164(null)).toBe("");
  });
});

describe("checkout totals match the server formula", () => {
  it("adds the governorate fee below the threshold", () => {
    expect(checkoutTotals(120, 0, "cairo")).toMatchObject({ subtotal: 120, discount: 0, shipping: 50, total: 170 });
    expect(checkoutTotals(120, 0, "aswan")).toMatchObject({ shipping: 100, total: 220 });
  });

  it("decides free shipping on the subtotal AFTER the discount (like createOrder)", () => {
    // 520 - 30 = 490 < 500 → shipping is charged again
    const t = checkoutTotals(520, 30, "cairo");
    expect(t.afterDiscount).toBe(490);
    expect(t.shipping).toBe(shippingFee("cairo", 490));
    expect(t.total).toBe(540);
    expect(checkoutTotals(FREE_SHIPPING_THRESHOLD, 0, "giza").shipping).toBe(0);
  });

  it("leaves shipping open until a governorate is chosen, unless the order ships free", () => {
    expect(checkoutTotals(120, 0, null)).toMatchObject({ shipping: null, total: 120 });
    expect(checkoutTotals(600, 0, "")).toMatchObject({ shipping: 0, total: 600 });
    expect(checkoutTotals(120, 0, "__proto__").shipping).toBeNull();
  });

  it("never discounts below zero or adds a negative discount", () => {
    expect(checkoutTotals(40, 100, "cairo")).toMatchObject({ discount: 40, afterDiscount: 0, total: 50 });
    expect(checkoutTotals(40, -5, "cairo").discount).toBe(0);
  });

  it("keeps piastres exact", () => {
    expect(checkoutTotals(125, 12.5, "cairo").total).toBe(162.5);
  });
});

describe("free shipping progress", () => {
  it("reports what is left to reach the threshold", () => {
    expect(freeShippingProgress(120)).toEqual({ qualifies: false, remaining: FREE_SHIPPING_THRESHOLD - 120, percent: 24 });
    expect(freeShippingProgress(FREE_SHIPPING_THRESHOLD)).toEqual({ qualifies: true, remaining: 0, percent: 100 });
    expect(freeShippingProgress(900).percent).toBe(100);
  });
});

describe("promo code messages", () => {
  it("explains each failure in both languages", () => {
    expect(promoErrorMessage("expired", "en")).toMatch(/expired/i);
    expect(promoErrorMessage("used_up", "en")).toMatch(/usage limit/i);
    expect(promoErrorMessage("invalid", "en")).toMatch(/isn't valid/i);
    expect(promoErrorMessage(undefined, "en")).toMatch(/isn't valid/i);
    expect(promoErrorMessage("min_order", "en", 300)).toContain("EGP 300");
    expect(promoErrorMessage("expired", "ar")).toMatch(/صلاحية/);
    expect(promoErrorMessage("min_order", "ar", 300)).toContain("ج.م");
  });
});

describe("checkout form validation", () => {
  const contact = { firstName: "Mona", lastName: "Ali", email: "mona@example.com", phone: "+201012345678" };

  it("accepts a valid contact and rejects a non-Egyptian mobile", () => {
    expect(contactSchema("en").safeParse(contact).success).toBe(true);
    const bad = contactSchema("en").safeParse({ ...contact, phone: "+966500000001" });
    expect(bad.success).toBe(false);
  });

  it("speaks Arabic when the store is in Arabic", () => {
    const r = contactSchema("ar").safeParse({ ...contact, firstName: "", phone: "123" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages.some((m) => /الاسم الأول/.test(m))).toBe(true);
    expect(messages.some((m) => /رقم هاتف محمول مصري/.test(m))).toBe(true);
  });

  it("requires a known governorate and a detailed address", () => {
    const base = { governorate: "cairo", city: "Nasr City", address: "12 Abbas El Akkad St", apartment: "", postalCode: "", saveAddress: false };
    expect(shippingSchema("en").safeParse(base).success).toBe(true);
    const r = shippingSchema("ar").safeParse({ ...base, governorate: "atlantis", address: "x" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toContain("يرجى اختيار المحافظة");
  });
});

describe("helpers", () => {
  it("splits a full name for the contact form", () => {
    expect(splitFullName("Mona Buyer")).toEqual({ firstName: "Mona", lastName: "Buyer" });
    expect(splitFullName("  Ahmed  Mohamed Ali ")).toEqual({ firstName: "Ahmed", lastName: "Mohamed Ali" });
    expect(splitFullName(null)).toEqual({ firstName: "", lastName: "" });
  });

  it("formats money with piastres only when present", () => {
    expect(formatMoney(170, "en")).toBe("EGP 170");
    expect(formatMoney(162.5, "en")).toBe("EGP 162.50");
    expect(formatMoney(170, "ar")).toMatch(/ج\.م$/);
  });
});

describe("what a buyer may do with an order", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  it("lets an unpaid card / wallet order be paid inside its window, and cancelled", () => {
    const c = orderCapabilities({ status: "pending", paymentStatus: "unpaid", paymentMethod: "card", createdAt: minutesAgo(10) }, now);
    expect(c).toMatchObject({ canPay: true, canCancel: true, expired: false });
    expect(Date.parse(c.payBy!)).toBe(now - 10 * 60_000 + PAYMENT_WINDOW_MINUTES * 60_000);
    // A failed attempt can be retried too.
    expect(orderCapabilities({ status: "pending", paymentStatus: "failed", paymentMethod: "wallet", createdAt: minutesAgo(5) }, now).canPay).toBe(true);
  });

  it("stops offering payment once the 60-minute window has passed", () => {
    const c = orderCapabilities({ status: "pending", paymentStatus: "unpaid", paymentMethod: "card", createdAt: minutesAgo(61) }, now);
    expect(c).toMatchObject({ canPay: false, expired: true, payBy: null });
  });

  it("never offers payment or cancellation for paid, cash or progressed orders", () => {
    expect(orderCapabilities({ status: "pending", paymentStatus: "paid", paymentMethod: "card", createdAt: minutesAgo(5) }, now)).toMatchObject({
      canPay: false,
      canCancel: false,
    });
    expect(orderCapabilities({ status: "pending", paymentStatus: "unpaid", paymentMethod: "cod", createdAt: minutesAgo(500) }, now)).toMatchObject({
      canPay: false,
      canCancel: true,
      expired: false,
    });
    for (const status of ["confirmed", "shipped", "cancelled"] as const) {
      expect(orderCapabilities({ status, paymentStatus: "unpaid", paymentMethod: "card", createdAt: minutesAgo(5) }, now)).toMatchObject({
        canPay: false,
        canCancel: false,
      });
    }
  });
});
