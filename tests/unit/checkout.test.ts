import { createHmac } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { FREE_SHIPPING_THRESHOLD, shippingFee } from "@/lib/checkout/shipping";
import { paymentSecondsLeft, safeEqual, signedPaymobOrderId, verifyPaymobHmac } from "@/lib/payments/paymob";

describe("shipping fee", () => {
  it("charges by governorate and is free above the threshold", () => {
    expect(shippingFee("cairo", 100)).toBe(50);
    expect(shippingFee("aswan", 100)).toBe(100);
    expect(shippingFee("cairo", FREE_SHIPPING_THRESHOLD)).toBe(0);
  });
  it("falls back to the default fee for unknown places (never free by accident)", () => {
    expect(shippingFee("__proto__", 10)).toBe(100);
    expect(shippingFee("atlantis", 10)).toBe(100);
  });
});

describe("Paymob helpers", () => {
  const SECRET = "test-secret";
  const txn = {
    amount_cents: 15000,
    created_at: "2026-11-14T10:00:00",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 123,
    integration_id: 456,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 789, merchant_order_id: "11111111-2222-3333-4444-555555555555__1731576000000" },
    owner: 1,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
  };
  const sign = (t: typeof txn) =>
    createHmac("sha512", SECRET)
      .update(
        [
          t.amount_cents, t.created_at, t.currency, t.error_occured, t.has_parent_transaction, t.id, t.integration_id,
          t.is_3d_secure, t.is_auth, t.is_capture, t.is_refunded, t.is_standalone_payment, t.is_voided, t.order.id,
          t.owner, t.pending, t.source_data.pan, t.source_data.sub_type, t.source_data.type, t.success,
        ].join(""),
      )
      .digest("hex");

  beforeAll(() => {
    process.env.PAYMOB_HMAC_SECRET = SECRET;
  });

  it("accepts a correctly signed transaction", () => {
    expect(verifyPaymobHmac(txn, sign(txn))).toBe(true);
  });
  it("rejects a tampered amount or missing signature", () => {
    expect(verifyPaymobHmac({ ...txn, amount_cents: 1 }, sign(txn))).toBe(false);
    expect(verifyPaymobHmac(txn, "")).toBe(false);
    expect(verifyPaymobHmac(txn, null)).toBe(false);
  });
  it("reads Paymob's signed order id (never merchant_order_id)", () => {
    expect(signedPaymobOrderId(txn)).toBe("789");
    expect(signedPaymobOrderId({ order: { merchant_order_id: txn.order.merchant_order_id } })).toBeNull();
    expect(signedPaymobOrderId({ order: "789", merchant_order_id: "x" }, true)).toBe("789");
    expect(signedPaymobOrderId({ order: "1;drop" }, true)).toBeNull();
  });
  it("verifies the flat redirect query, where Paymob names the order id `order`", () => {
    // The GET response callback flattens the transaction into query parameters.
    const flat: Record<string, string> = {
      amount_cents: "15000",
      created_at: txn.created_at,
      currency: "EGP",
      error_occured: "false",
      has_parent_transaction: "false",
      id: "123",
      integration_id: "456",
      is_3d_secure: "true",
      is_auth: "false",
      is_capture: "false",
      is_refunded: "false",
      is_standalone_payment: "true",
      is_voided: "false",
      order: "789",
      owner: "1",
      pending: "false",
      "source_data.pan": "2346",
      "source_data.sub_type": "MasterCard",
      "source_data.type": "card",
      success: "true",
      merchant_order_id: txn.order.merchant_order_id,
    };
    expect(verifyPaymobHmac(flat, sign(txn), true)).toBe(true);
    // Older shape with an "order.id" key keeps working.
    const { order, ...rest } = flat;
    expect(verifyPaymobHmac({ ...rest, "order.id": order }, sign(txn), true)).toBe(true);
    // Another order id breaks the signature; merchant_order_id isn't signed, so changing it doesn't matter.
    expect(verifyPaymobHmac({ ...flat, order: "790" }, sign(txn), true)).toBe(false);
    expect(verifyPaymobHmac({ ...flat, merchant_order_id: "someone-else" }, sign(txn), true)).toBe(true);
  });
  it("gives the payment key only what is left of the 60-minute window", () => {
    const now = Date.parse("2026-11-14T12:00:00Z");
    expect(paymentSecondsLeft("2026-11-14T12:00:00Z", now)).toBe(3600);
    expect(paymentSecondsLeft("2026-11-14T11:30:00Z", now)).toBe(1800);
    expect(paymentSecondsLeft("2026-11-14T10:00:00Z", now)).toBe(0);
    expect(paymentSecondsLeft(null, now)).toBe(0);
    expect(paymentSecondsLeft("not a date", now)).toBe(0);
  });
  it("compares secrets in constant time", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
