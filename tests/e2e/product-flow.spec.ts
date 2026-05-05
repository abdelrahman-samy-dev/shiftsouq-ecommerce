import { test, expect } from '@playwright/test';

test.describe('End-to-End Product Flow', () => {
  // Generate a unique product name starting with the ID to avoid SKU collisions (SKU uses first 8 chars of slug)
  const uniqueId = Date.now().toString().slice(-8);
  const testProductNameEN = `${uniqueId} E2E Product`;
  const testProductNameAR = `${uniqueId} منتج E2E`;
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
      await page.locator('input[type="email"], input#login-email').fill('abdelrahman.samy.creator@gmail.com');
      await page.locator('input[type="password"], input#login-password').fill('%%49737722Sa%%');

      // Submit login form
      await page.locator('button[type="submit"]').click();

      // Wait for navigation to complete (e.g. redirect to /admin or home)
      // Playwright automatically waits for navigations when appropriate, but we can verify url
      await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
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

      // Create a new category to ensure a valid category exists and is selected
      const categorySelect = page.locator('select').first();
      await categorySelect.selectOption({ value: 'ADD_NEW' });

      // Fill the inline category form
      await page.getByPlaceholder('Category Name (EN)').fill('E2E Test Category EN');
      await page.getByPlaceholder('اسم الفئة (AR)').fill('فئة اختبار E2E');
      
      // Click the Save Category button inside the inline form
      await page.locator('button:has-text("Save Category")').click();
      
      // Wait for the inline form to close (meaning the category was saved and selected)
      await expect(page.getByPlaceholder('Category Name (EN)')).not.toBeVisible({ timeout: 10000 });

      // Fill stock (assuming no variants for this simple test)
      // Look for the required input with placeholder "0" that handles stock
      await page.locator('input[type="number"][placeholder="0"]').fill('50');

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
