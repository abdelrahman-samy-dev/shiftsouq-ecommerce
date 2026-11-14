import { describe, expect, it } from "vitest";
import { availableTransitions, checkTransition, countsAsRevenue, type OrderState } from "@/lib/admin/orders";
import { csvCell, toCsv } from "@/lib/admin/csv";
import { cleanSearchTerm, ilikeAny, phoneDigits } from "@/lib/admin/search";
import { promoInputSchema, promoErrorKey, promoState } from "@/lib/admin/promos";
import { adminProductSchema, isAllowedImageUrl, productErrorKey } from "@/lib/admin/products";

const o = (status: OrderState["status"], payment_status: OrderState["payment_status"], payment_method: OrderState["payment_method"]): OrderState => ({
  status,
  payment_status,
  payment_method,
});

describe("order transitions", () => {
  it("moves one step at a time", () => {
    expect(checkTransition(o("pending", "unpaid", "cod"), "confirmed")).toEqual({ ok: true, patch: { status: "confirmed" } });
    expect(checkTransition(o("pending", "unpaid", "cod"), "shipped")).toEqual({ ok: false, error: "not_next_step" });
    expect(checkTransition(o("delivered", "paid", "cod"), "pending")).toEqual({ ok: false, error: "not_next_step" });
  });
  it("COD delivered records the cash", () => {
    expect(checkTransition(o("shipped", "unpaid", "cod"), "delivered")).toEqual({ ok: true, patch: { status: "delivered", payment_status: "paid" } });
  });
  it("unpaid card / wallet orders cannot move forward", () => {
    for (const m of ["card", "wallet"] as const) {
      expect(checkTransition(o("pending", "unpaid", m), "confirmed")).toEqual({ ok: false, error: "awaiting_online_payment" });
      expect(checkTransition(o("processing", "failed", m), "shipped")).toEqual({ ok: false, error: "awaiting_online_payment" });
      expect(availableTransitions(o("pending", "unpaid", m))).toEqual(["cancelled"]);
    }
    expect(checkTransition(o("processing", "paid", "card"), "shipped").ok).toBe(true);
  });
  it("cancel only before shipping and only when no money was taken", () => {
    expect(checkTransition(o("processing", "unpaid", "cod"), "cancelled").ok).toBe(true);
    expect(checkTransition(o("shipped", "unpaid", "cod"), "cancelled")).toEqual({ ok: false, error: "cancel_after_shipping" });
    expect(checkTransition(o("confirmed", "paid", "card"), "cancelled")).toEqual({ ok: false, error: "cancel_paid" });
  });
  it("refund only for paid orders", () => {
    expect(checkTransition(o("confirmed", "paid", "card"), "refunded")).toEqual({ ok: true, patch: { status: "refunded", payment_status: "refunded" } });
    expect(checkTransition(o("delivered", "unpaid", "cod"), "refunded").ok).toBe(true); // legacy COD delivered
    expect(checkTransition(o("pending", "unpaid", "cod"), "refunded")).toEqual({ ok: false, error: "refund_unpaid" });
  });
  it("final states stay final; junk is rejected", () => {
    expect(checkTransition(o("cancelled", "unpaid", "cod"), "confirmed")).toEqual({ ok: false, error: "final" });
    expect(checkTransition(o("refunded", "refunded", "card"), "cancelled")).toEqual({ ok: false, error: "final" });
    expect(checkTransition(o("pending", "unpaid", "cod"), "paid")).toEqual({ ok: false, error: "invalid_status" });
  });
  it("revenue counts paid online + COD delivered, not cancelled/refunded/unpaid", () => {
    expect(countsAsRevenue(o("confirmed", "paid", "card"))).toBe(true);
    expect(countsAsRevenue(o("delivered", "paid", "cod"))).toBe(true);
    expect(countsAsRevenue(o("delivered", "unpaid", "cod"))).toBe(true);
    expect(countsAsRevenue(o("shipped", "unpaid", "cod"))).toBe(false);
    expect(countsAsRevenue(o("pending", "unpaid", "card"))).toBe(false);
    expect(countsAsRevenue(o("refunded", "refunded", "card"))).toBe(false);
    expect(countsAsRevenue(o("cancelled", "failed", "card"))).toBe(false);
  });
});

describe("csv", () => {
  it("neutralises formulas in text cells", () => {
    for (const bad of ["=1+1", "+2010", "-cmd", "@SUM(A1)", "\tx", "\r=x", "  =x"]) expect(csvCell(bad).startsWith(`"'`)).toBe(true);
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('""');
    expect(toCsv([{ a: 1, b: "=x" }])).toBe('"a","b"\r\n1,"\'=x"');
  });
});

describe("search", () => {
  it("strips filter syntax", () => {
    expect(cleanSearchTerm("x%,status.eq.delivered)")).toBe("x status.eq.delivered");
    expect(cleanSearchTerm('a"b(c)*')).toBe("a b c");
    expect(cleanSearchTerm("محمد أحمد")).toBe("محمد أحمد");
    expect(ilikeAny(["a", "b"], "x y")).toBe('a.ilike."%x y%",b.ilike."%x y%"');
  });
  it("normalises Egyptian phone numbers", () => {
    expect(phoneDigits("010 1234 5678")).toBe("1012345678");
    expect(phoneDigits("+20 10 1234 5678")).toBe("1012345678");
    expect(phoneDigits("00201012345678")).toBe("1012345678");
    expect(phoneDigits("SS-2026")).toBeNull();
  });
});

describe("promo input", () => {
  const base = { code: " save10 ", discount_type: "percentage", discount_value: "10", min_order_amount: "", max_uses: "", expires_at: null, is_active: true };
  it("uppercases and accepts empty optionals", () => {
    const r = promoInputSchema.safeParse(base);
    expect(r.success && r.data).toMatchObject({ code: "SAVE10", discount_value: 10, min_order_amount: null, max_uses: null });
  });
  it("rejects bad values", () => {
    const key = (v: object) => {
      const r = promoInputSchema.safeParse({ ...base, ...v });
      return r.success ? "ok" : promoErrorKey(r.error);
    };
    expect(key({ discount_value: "150" })).toBe("percentage_over_100");
    expect(key({ discount_type: "fixed", discount_value: "150" })).toBe("ok");
    expect(key({ discount_value: "0" })).toBe("discount_value");
    expect(key({ discount_value: "-1" })).toBe("discount_value");
    expect(key({ code: "a b" })).toBe("code");
    expect(key({ max_uses: "0" })).toBe("max_uses");
    expect(key({ max_uses: "1.5" })).toBe("max_uses");
    expect(key({ min_order_amount: "-3" })).toBe("min_order_amount");
    expect(key({ expires_at: "tomorrow" })).toBe("expires_at");
  });
  it("state", () => {
    const p = { id: "x", code: "A", discount_type: "fixed" as const, discount_value: 1, min_order_amount: 0, max_uses: 2, current_uses: 2, expires_at: null, is_active: true, created_at: null };
    expect(promoState(p)).toBe("used_up");
    expect(promoState({ ...p, is_active: false })).toBe("inactive");
    expect(promoState({ ...p, current_uses: 0, expires_at: "2020-01-01T00:00:00Z" })).toBe("expired");
  });
});

describe("product input", () => {
  const payload = {
    name_en: "Aviator Sunglasses",
    name_ar: "نظارات شمسية طيار",
    description_en: "x",
    description_ar: "",
    base_price: "350",
    sale_price: "",
    category_id: "33333333-0000-0000-0000-000000000004",
    stock: "0",
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80"],
    variants: [{ id: "c023226b-5726-434a-b500-2c39b27b77f2", sku: "AVS-GLD-OS", stock: "23", price_override: "", size: "OS", color_en: "Gold" }],
  };
  it("accepts what the edit form sends", () => {
    const r = adminProductSchema.safeParse(payload);
    if (!r.success) console.log(r.error.issues, productErrorKey(r.error));
    expect(r.success).toBe(true);
  });
  it("rejects bad input", () => {
    const key = (v: object) => {
      const r = adminProductSchema.safeParse({ ...payload, ...v });
      return r.success ? "ok" : productErrorKey(r.error);
    };
    expect(key({ sale_price: "400" })).toBe("sale_price");
    expect(key({ images: ["https://evil.example.com/a.png"] })).toBe("image_url");
    expect(key({ images: ["javascript:alert(1)"] })).toBe("image_url");
    expect(key({ variants: [{ ...payload.variants[0], stock: "-1" }] })).toBe("stock");
    expect(key({ variants: [payload.variants[0], { ...payload.variants[0], id: null }] })).toBe("duplicate_sku");
    expect(key({ category_id: "nope" })).toBe("category");
  });
  it("image hosts", () => {
    expect(isAllowedImageUrl("https://abc.supabase.co/storage/v1/object/public/x.png", "https://abc.supabase.co")).toBe(true);
    expect(isAllowedImageUrl("https://other.supabase.co/storage/v1/object/public/x.png", "https://abc.supabase.co")).toBe(false);
    expect(isAllowedImageUrl("https://abc.supabase.co/rest/v1/x", "https://abc.supabase.co")).toBe(false);
    expect(isAllowedImageUrl("http://images.unsplash.com/a")).toBe(false);
  });
});
