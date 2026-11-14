import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test.describe("access control and hardening", () => {
  test("visitors are sent to login from the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("customers cannot open the admin area", async ({ page }) => {
    await login(page, "buyer");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /no access|access denied|لا تملك صلاحية/i })).toBeVisible();
  });

  test("admins can open the admin area", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("the payment webhook rejects unsigned calls", async ({ request }) => {
    const res = await request.post("/api/checkout/paymob/callback", {
      data: { type: "TRANSACTION", obj: { id: 1, success: true, amount_cents: 100, order: { merchant_order_id: crypto.randomUUID() } } },
    });
    expect(res.status()).toBe(403);
  });

  test("the test-payment endpoint can't confirm someone else's order", async ({ request }) => {
    const res = await request.post("/api/checkout/paymob/mock", { data: { success: true } });
    expect(res.status()).toBe(404);
  });

  test("pages are served with security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
