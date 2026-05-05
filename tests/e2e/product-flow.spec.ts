import { test, expect } from '@playwright/test';

test.describe('End-to-End Product Flow', () => {
  // Extended timeout for this multi-step admin E2E flow
  test.setTimeout(90_000);

  // Generate a unique product name starting with the ID to avoid SKU collisions
  const uniqueId = Date.now().toString().slice(-8);
  const testProductNameEN = `${uniqueId} E2E Product`;
  const testProductNameAR = `${uniqueId} منتج E2E`;
  const testPrice = '999.99';

  test('Admin can create a product and it appears on the storefront', async ({ page }) => {
    // Listen for any alert/confirm dialogs (the ProductModal uses alert() on errors)
    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss();
    });

    // =========================================================================
    // 1. ADMIN LOGIN — Navigate to /login?redirect=/admin/products
    //    This avoids a separate page.goto after login (which was causing
    //    the server to crash with a segfault under load).
    // =========================================================================
    await test.step('Log into Admin Dashboard', async () => {
      await page.goto('/login?redirect=/admin/products');

      // Wait for the login form to fully render
      const emailInput = page.locator('input#login-email');
      await expect(emailInput).toBeVisible({ timeout: 10000 });

      // Fill in admin credentials
      await emailInput.fill('abdelrahman.samy.creator@gmail.com');
      await page.locator('input#login-password').fill('%%49737722Sa%%');

      // Submit login form
      await page.locator('button[type="submit"]').first().click();

      // loginAction reads ?redirect=/admin/products and redirects there
      await expect(page).toHaveURL(/\/admin\/products/, { timeout: 15000 });
    });

    // =========================================================================
    // 2. CREATE PRODUCT
    // =========================================================================
    await test.step('Create a new product in Admin Dashboard', async () => {
      // Wait for the products page to load
      const addProductBtn = page.getByRole('button', { name: /Add Product/i });
      await expect(addProductBtn).toBeVisible({ timeout: 15000 });

      // Click "Add Product" to open the slide-over modal
      await addProductBtn.click();

      // Wait for the slide-over panel to appear
      const productForm = page.locator('form#productForm');
      await expect(productForm).toBeVisible({ timeout: 5000 });

      // ── Fill English Name ──
      await page.getByPlaceholder('e.g. Wireless Headphones').fill(testProductNameEN);

      // ── Fill Arabic Name ──
      await page.getByPlaceholder('مثال: سماعات لاسلكية').fill(testProductNameAR);

      // ── Fill Base Price ──
      await page.getByPlaceholder('0.00').first().fill(testPrice);

      // ── Select Category ──
      // Pick the first real category (index 1, skipping the "Select a category" placeholder)
      const categorySelect = page.locator('form#productForm select').first();
      await expect(categorySelect).toBeVisible();
      const firstOption = categorySelect.locator('option').nth(1);
      const categoryValue = await firstOption.getAttribute('value');
      if (categoryValue && categoryValue !== '' && categoryValue !== 'ADD_NEW') {
        await categorySelect.selectOption(categoryValue);
      } else {
        // No categories exist — create one inline
        await categorySelect.selectOption({ value: 'ADD_NEW' });
        await page.getByPlaceholder('Category Name (EN)').fill('E2E Test Category');
        await page.getByPlaceholder('اسم الفئة (AR)').fill('فئة اختبار E2E');
        await page.locator('button').filter({ hasText: /Save Category/i }).click();
        await expect(page.getByPlaceholder('Category Name (EN)')).not.toBeVisible({ timeout: 10000 });
      }

      // ── Fill Stock Quantity ──
      // When there are no variants, a global stock input appears with placeholder "0".
      // Use click + clear + type to ensure React's onChange fires properly.
      const stockInput = productForm.locator('input[type="number"][placeholder="0"]');
      await expect(stockInput).toBeVisible({ timeout: 5000 });
      await stockInput.click();
      await stockInput.fill('50');

      // ── Save Product ──
      // The save button uses form="productForm" but is outside the <form>.
      // Add noValidate to bypass any native validation, then submit.
      await page.evaluate(() => {
        const form = document.getElementById('productForm') as HTMLFormElement;
        if (form) {
          form.noValidate = true;
          form.requestSubmit();
        }
      });

      // Wait for the server action to complete.
      // The modal calls onClose() on success, making the form disappear.
      // On error, it calls alert(). We capture dialogs above for debugging.
      await expect(productForm).not.toBeVisible({ timeout: 30000 });

      // If a dialog appeared, it means the server action failed
      if (dialogMessages.length > 0) {
        throw new Error(`Product creation failed with error: ${dialogMessages.join(', ')}`);
      }

      // Verify product name appears in the products table
      await expect(page.getByText(testProductNameEN).first()).toBeVisible({ timeout: 10000 });
    });

    // =========================================================================
    // 3. VERIFY ON STOREFRONT
    // =========================================================================
    await test.step('Verify product appears on the public shop page', async () => {
      await page.goto('/shop');

      // Wait for the shop grid to load and find the newly created product
      const newProductCard = page.getByText(testProductNameEN).first();
      await expect(newProductCard).toBeVisible({ timeout: 15000 });
    });
  });
});
