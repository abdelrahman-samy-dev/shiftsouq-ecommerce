import { test, expect } from "@playwright/test";
import { ACCOUNTS, addTestProductToCart, chooseOption, fillCheckoutDetails, login } from "./fixtures";

/** Set when the server runs with PAYMOB_MOCK=1 (local `next dev`), so card payments use the test panel. */
const mockPayments = process.env.E2E_MOCK_PAYMENTS === "1";

test.describe("checkout", () => {
  test.setTimeout(120_000);

  test("guests check out with cash on delivery, see the receipt and track the order", async ({ page }) => {
    const email = `guest.${Date.now()}@example.com`;
    await addTestProductToCart(page);
    await fillCheckoutDetails(page, email);

    // Summary before placing: 490 (sale price) + 50 delivery to Cairo.
    await expect(page.getByText("EGP 540").filter({ visible: true }).first()).toBeVisible();
    await chooseOption(page, /cash on delivery/i);
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=SS-\d{8}-[0-9A-F]{6}/, { timeout: 30_000 });
    const orderNumber = new URL(page.url()).searchParams.get("order")!;
    await expect(page.getByText(orderNumber).first()).toBeVisible();
    await expect(page.getByText("EGP 540").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create account/i })).toBeVisible();

    // Tracking needs the order's email: a wrong one gets the same "not found" as a wrong number.
    await page.goto(`/track?order=${orderNumber}`);
    await page.locator("#track-email").fill("someone.else@example.com");
    await page.getByRole("button", { name: /track order/i }).click();
    await expect(page.getByText(/couldn't find an order/i)).toBeVisible();
    await page.locator("#track-email").fill(email.toUpperCase());
    await page.getByRole("button", { name: /track order/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();
    await expect(page.getByText(/order placed/i).first()).toBeVisible();
  });

  test("signed-in buyers check out and find the order in My orders", async ({ page }) => {
    await login(page, "buyer");
    await addTestProductToCart(page);
    await fillCheckoutDetails(page, ACCOUNTS.buyer.email);
    await chooseOption(page, /cash on delivery/i);
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=/, { timeout: 30_000 });
    const orderNumber = new URL(page.url()).searchParams.get("order")!;
    await page.goto("/orders");
    await expect(page.getByText(orderNumber).first()).toBeVisible();
  });

  test("card payment: a declined payment can be retried on the same order", async ({ page }) => {
    await login(page, "buyer");
    await addTestProductToCart(page);
    await fillCheckoutDetails(page);
    const card = page.getByRole("radio", { name: /credit \/ debit card/i });

    if (!mockPayments) {
      // Production build without Paymob keys: card must not be offered.
      await expect(card).toBeDisabled();
      return;
    }

    await chooseOption(page, /credit \/ debit card/i);
    await page.getByRole("button", { name: /place order/i }).click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    // A declined payment keeps the buyer on checkout…
    await panel.getByRole("button", { name: /decline/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(/payment didn't go through/i).first()).toBeVisible();

    // …and retrying pays the same order.
    await page.getByRole("button", { name: /try the payment again/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /approve/i }).click();
    await expect(page).toHaveURL(/\/checkout\/success\?order=/, { timeout: 30_000 });
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });
});
