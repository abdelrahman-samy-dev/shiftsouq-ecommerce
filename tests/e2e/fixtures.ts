import { expect, type Page } from "@playwright/test";

/** Throwaway accounts that exist only in the local test database. */
export const ACCOUNTS = {
  buyer: { email: "e2e.buyer@shiftsouq.local", password: "E2e-Buyer-12345", firstName: "Test", lastName: "Buyer", role: "customer" },
  admin: { email: "e2e.admin@shiftsouq.local", password: "E2e-Admin-12345", firstName: "Test", lastName: "Admin", role: "admin" },
} as const;

/** Seeded product: base price 150, on sale for 120. */
export const TEST_PRODUCT_SLUG = "classic-navy-polo";

export async function login(page: Page, who: keyof typeof ACCOUNTS) {
  const { email, password } = ACCOUNTS[who];
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("form button[type=submit]").first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

/** Opens the product page, picks options if the buyer has to, and adds one to the cart. */
export async function addTestProductToCart(page: Page) {
  await page.goto(`/product/${TEST_PRODUCT_SLUG}`);
  for (const group of await page.locator("[role=radiogroup]").all()) {
    const chosen = await group.locator("button[aria-pressed=true], [aria-checked=true]").count();
    if (!chosen) await group.locator("button:not([disabled])").first().click();
  }
  await page.getByRole("button", { name: /add to cart/i }).first().click();
  await expect(page.getByRole("button", { name: /added to cart/i }).first()).toBeVisible();
}

/** Fills the contact and shipping steps of checkout (Cairo → EGP 50 shipping). */
export async function fillCheckoutDetails(page: Page) {
  await page.goto("/checkout");
  await page.locator("input[name=firstName]").fill("Test");
  await page.locator("input[name=lastName]").fill("Buyer");
  await page.locator("input[name=email]").fill(ACCOUNTS.buyer.email);
  const phone = page.locator("input[type=tel]").first();
  await phone.fill("");
  await phone.pressSequentially("1012345678");
  await page.getByRole("button", { name: /continue to shipping/i }).click();

  await page.locator("label[for=checkout-governorate] + div").click();
  await page.getByRole("button", { name: /^cairo$/i }).click();
  await page.locator("input[name=city]").fill("Nasr City");
  await page.locator("input[name=address]").fill("12 Abbas El Akkad St");
  await page.getByRole("button", { name: /continue to payment/i }).click();
}
