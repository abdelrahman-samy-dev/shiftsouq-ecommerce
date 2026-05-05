import { test, expect } from '@playwright/test';

test.describe('Shopping Flow (E2E)', () => {
  // Use a unique name to identify this specific test run if needed
  const customerName = `Test Customer ${Date.now().toString().slice(-4)}`;

  test('Customer can search, view product details, add to cart, and checkout via COD', async ({ page }) => {
    // =========================================================================
    // 1. NAVIGATION & PRODUCT SELECTION
    // =========================================================================
    await test.step('Navigate to shop and open a product', async () => {
      // Navigate directly to the global shop page
      await page.goto('/shop');

      // Wait for the product grid to load by checking for product links
      const firstProductLink = page.locator('a[href^="/product/"]').first();
      await expect(firstProductLink).toBeVisible({ timeout: 15000 });
      
      // Store the URL for verification
      const productUrl = await firstProductLink.getAttribute('href');
      
      // Click the product to view details
      await firstProductLink.click();

      // Verify we are on the product details page
      await expect(page).toHaveURL(new RegExp(productUrl as string), { timeout: 10000 });
    });

    // =========================================================================
    // 2. ADD TO CART
    // =========================================================================
    await test.step('Add product to cart', async () => {
      // Find the "Add to Cart" button (handling both English and Arabic labels)
      const addToCartBtn = page.locator('button').filter({ hasText: /Add to Cart|أضف إلى السلة/i }).first();
      await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
      
      // Click to add
      await addToCartBtn.click();

      // Usually a toast notification appears or a mini-cart opens. We can just proceed to the cart page.
      // Small delay to allow state to update
      await page.waitForTimeout(1500); 
    });

    // =========================================================================
    // 3. CART & CHECKOUT INITIATION
    // =========================================================================
    await test.step('Proceed to checkout from cart', async () => {
      // Go to the Cart page
      await page.goto('/cart');

      // Verify cart has loaded
      const checkoutLink = page.locator('a[href="/checkout"]').first();
      await expect(checkoutLink).toBeVisible({ timeout: 10000 });
      
      // Proceed to checkout
      await checkoutLink.click();
      await expect(page).toHaveURL(/.*\/checkout/, { timeout: 10000 });
    });

    // =========================================================================
    // 4. CHECKOUT FORM (COD)
    // =========================================================================
    await test.step('Fill checkout details and select COD', async () => {
      // Fill Contact Information
      await page.getByPlaceholder(/First Name|الاسم الأول/i).fill(customerName);
      await page.getByPlaceholder(/Last Name|اسم العائلة/i).fill('Doe');
      await page.getByPlaceholder(/Phone|رقم الهاتف/i).fill('+201000000000');
      
      // Fill Shipping Address
      await page.getByPlaceholder(/Address|العنوان/i).fill('123 Test Street, Building 4');
      await page.getByPlaceholder(/City|المدينة/i).fill('Cairo');

      // Select Cash on Delivery (COD) payment method
      // Depending on UI, it could be a radio button or a clickable card. 
      // We look for the text associated with COD and click its container or input.
      const codOption = page.locator('label').filter({ hasText: /Cash on Delivery|الدفع عند الاستلام/i }).first();
      if (await codOption.isVisible()) {
        await codOption.click();
      }

      // Submit the Order
      const placeOrderBtn = page.locator('button[type="submit"]').filter({ hasText: /Place Order|Complete Order|تأكيد الطلب/i }).first();
      await expect(placeOrderBtn).toBeVisible();
      await placeOrderBtn.click();
    });

    // =========================================================================
    // 5. SUCCESS VERIFICATION
    // =========================================================================
    await test.step('Verify order success page', async () => {
      // Wait for navigation to the success page
      await expect(page).toHaveURL(/.*\/checkout\/success/, { timeout: 15000 });
      
      // Look for confirmation text
      const successMessage = page.locator('text=/Thank you|Order Confirmed|شكراً لك|تم تأكيد الطلب/i').first();
      await expect(successMessage).toBeVisible();
    });
  });
});
