import { test, expect } from "@playwright/test";
import { addTestProductToCart, fillCheckoutDetails, login } from "./fixtures";

/** Set when the server runs with PAYMOB_MOCK=1 (local `next dev`), so card payments use the test panel. */
const mockPayments = process.env.E2E_MOCK_PAYMENTS === "1";

test.describe("checkout", () => {
  test.setTimeout(120_000);

  test("checkout requires an account", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/);
  });

  test("cash on delivery: the receipt shows the server's real order and total", async ({ page }) => {
    await login(page, "buyer");
    await addTestProductToCart(page);
    await fillCheckoutDetails(page);

    // Summary before placing: 120 (sale price) + 50 shipping to Cairo.
    await expect(page.getByText("EGP 170").filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /cash on delivery/i }).click();
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=SS-\d{8}-[0-9A-F]{6}/, { timeout: 30_000 });
    const orderNumber = new URL(page.url()).searchParams.get("order")!;
    await expect(page.getByText(orderNumber)).toBeVisible();
    await expect(page.getByText("EGP 170").filter({ visible: true }).first()).toBeVisible();

    // The order is listed in My Orders.
    await page.goto("/orders");
    await expect(page.getByText(orderNumber).first()).toBeVisible();
  });

  test("card payment", async ({ page }) => {
    await login(page, "buyer");
    await addTestProductToCart(page);
    await fillCheckoutDetails(page);
    const card = page.getByRole("button", { name: /credit \/ debit card/i });

    if (!mockPayments) {
      // Production build without Paymob keys: card must not be offered.
      await expect(card).toBeDisabled();
      return;
    }

    await card.click();
    await page.getByRole("button", { name: /place order/i }).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    // A declined payment keeps the buyer on checkout…
    await panel.getByRole("button", { name: /decline/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    // …and retrying pays the same order.
    await page.getByRole("button", { name: /place order/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /approve/i }).click();
    await expect(page).toHaveURL(/\/checkout\/success\?order=/, { timeout: 30_000 });
    await expect(page.getByText(/order placed/i)).toBeVisible();
  });
});
