import { expect, type Page } from "@playwright/test";

/** Throwaway accounts that exist only in the local test database. */
export const ACCOUNTS = {
  buyer: { email: "e2e.buyer@shiftsouq.local", password: "E2e-Buyer-12345", firstName: "Test", lastName: "Buyer", role: "customer" },
  admin: { email: "e2e.admin@shiftsouq.local", password: "E2e-Admin-12345", firstName: "Test", lastName: "Admin", role: "admin" },
} as const;

/** Seeded product (catalog/catalog.json): one colour, sizes XS–XXL, base price 650, on sale for 490. */
export const TEST_PRODUCT_SLUG = "heavyweight-cotton-tee";

export async function login(page: Page, who: keyof typeof ACCOUNTS) {
  const { email, password } = ACCOUNTS[who];
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("main form button[type=submit]").first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

/** Picks a radio card (the radio itself is visually hidden; its label is the target). */
export async function chooseOption(page: Page, name: RegExp) {
  await page.locator("label", { has: page.getByRole("radio", { name }) }).click();
  await expect(page.getByRole("radio", { name })).toBeChecked();
}

/** Opens the product page, picks options if the buyer has to, and adds one to the bag. */
export async function addTestProductToCart(page: Page) {
  await page.goto(`/product/${TEST_PRODUCT_SLUG}`);
  for (const group of await page.locator("[role=radiogroup]").all()) {
    const chosen = await group.locator("button[aria-pressed=true], [aria-checked=true]").count();
    if (!chosen) await group.locator("button:not([disabled])").first().click();
  }
  await page.getByRole("button", { name: /add to (cart|bag)/i }).first().click();
  await expect(page.getByRole("button", { name: /added to (cart|bag)/i }).first()).toBeVisible();
}

/**
 * Fills checkout up to the payment step: contact, then a Cairo delivery address
 * (EGP 50 delivery). Works for guests and for signed-in buyers whose details or
 * saved addresses are already filled in.
 */
export async function fillCheckoutDetails(page: Page, email: string = ACCOUNTS.buyer.email) {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1, name: /checkout/i })).toBeVisible();

  // Contact: open it if it was filled in from the profile, then (re)enter the details.
  const contactEdit = page.getByRole("button", { name: /edit contact/i });
  if (await contactEdit.isVisible()) await contactEdit.click();
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=phone]").fill("01012345678");
  await page.locator("form", { has: page.locator("input[name=email]") }).getByRole("button", { name: /continue/i }).click();

  // Delivery: a new Cairo address (signed-in buyers may have saved ones).
  const deliveryEdit = page.getByRole("button", { name: /edit delivery/i });
  const firstName = page.locator("input[name=firstName]");
  await expect(firstName.or(deliveryEdit).or(page.getByRole("radio", { name: /new address/i })).first()).toBeVisible();
  if (await deliveryEdit.isVisible()) await deliveryEdit.click();
  const newAddress = page.getByRole("radio", { name: /new address/i });
  if (await newAddress.count()) await chooseOption(page, /new address/i);
  await firstName.fill("Test");
  await page.locator("input[name=lastName]").fill("Buyer");
  await page.locator("select[name=governorate]").selectOption("cairo");
  await page.locator("input[name=city]").fill("Nasr City");
  await page.locator("input[name=address]").fill("12 Abbas El Akkad St");
  await page.locator("form", { has: firstName }).getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("button", { name: /place order/i })).toBeVisible();
}
