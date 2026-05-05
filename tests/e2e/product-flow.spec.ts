import { test, expect } from '@playwright/test';

test.describe('End-to-End Product Flow', () => {
  // Generate a unique product name to avoid collisions
  const uniqueId = Date.now().toString().slice(-6);
  const testProductNameEN = `E2E Test Product ${uniqueId}`;
  const testProductNameAR = `منتج اختبار E2E ${uniqueId}`;
  const testPrice = '999.99';

  test('Admin can create a product and it appears on the storefront', async ({ page }) => {
    // =========================================================================
    // 1. ADMIN LOGIN
    // =========================================================================
    await test.step('Log into Admin Dashboard', async () => {
      // Go to login page
      await page.goto('/login');

      // Fill in credentials
      // NOTE: Replace these with your actual seeded admin credentials
      await page.locator('input[type="email"], input#login-email').fill('admin@shiftsouq.com');
      await page.locator('input[type="password"], input#login-password').fill('admin123');

      // Submit login form
      await page.locator('button[type="submit"]').click();

      // Wait for navigation to complete (e.g. redirect to /admin or home)
      // Playwright automatically waits for navigations when appropriate, but we can verify url
      await expect(page).toHaveURL(/.*\/admin.*/, { timeout: 10000 });
    });

    // =========================================================================
    // 2. CREATE PRODUCT
    // =========================================================================
    await test.step('Create a new product in Admin Dashboard', async () => {
      // Navigate to Products page (assuming there's a sidebar link or direct navigation)
      await page.goto('/admin/products');

      // Click "Add Product" button (using text selector)
      await page.getByRole('button', { name: /Add Product/i }).click();

      // Ensure modal is open (checking for the English Name input)
      const modal = page.locator('div[role="dialog"]').or(page.locator('form#productForm'));
      await expect(modal).toBeVisible();

      // Fill basic details
      // Using placeholder locators or label locators based on the component code
      await page.getByPlaceholder('e.g. Wireless Headphones').fill(testProductNameEN);
      await page.getByPlaceholder('مثال: سماعات لاسلكية').fill(testProductNameAR);
      
      // Fill Base Price
      await page.getByPlaceholder('0.00').first().fill(testPrice);

      // Select Category (if there's a select dropdown)
      // Since category relies on DB, we just select the first available valid category.
      // Assuming index 1 is the first real category after "Select a category"
      const categorySelect = page.locator('select').first();
      await categorySelect.selectOption({ index: 1 });

      // Fill stock (assuming no variants for this simple test)
      // Look for the input with placeholder "0" that handles stock
      await page.getByPlaceholder('0').last().fill('50');

      // Save Product
      await page.locator('button[type="submit"]:has-text("Save Product"), button[form="productForm"]').click();

      // Verify modal closes and product appears in the list (wait for network/toast)
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      
      // Verify product name appears in the products table
      await expect(page.getByText(testProductNameEN).first()).toBeVisible();
    });

    // =========================================================================
    // 3. VERIFY ON STOREFRONT
    // =========================================================================
    await test.step('Verify product appears on the public shop page', async () => {
      // Go to shop/storefront
      await page.goto('/shop');

      // Wait for the shop grid to load
      // Searching for the newly created product card by its text
      const newProductCard = page.locator(`text=${testProductNameEN}`).first();
      
      // It should be visible
      await expect(newProductCard).toBeVisible({ timeout: 10000 });
    });
  });
});
