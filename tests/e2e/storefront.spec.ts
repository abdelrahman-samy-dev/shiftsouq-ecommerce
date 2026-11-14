import { test, expect } from "@playwright/test";
import { TEST_PRODUCT_SLUG } from "./fixtures";

test.describe("storefront", () => {
  for (const path of ["/", "/shop", `/product/${TEST_PRODUCT_SLUG}`, "/contact", "/shipping", "/terms"]) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("header and footer links all resolve", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("header a[href^='/'], footer a[href^='/'], nav a[href^='/']")
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!.split("#")[0]))]);
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) {
      const res = await request.get(href, { maxRedirects: 5 });
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  test("the product page shows the sale price", async ({ page }) => {
    await page.goto(`/product/${TEST_PRODUCT_SLUG}`);
    await expect(page.getByText("EGP 120").first()).toBeVisible();
  });

  test("Arabic switches the layout to right-to-left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});
