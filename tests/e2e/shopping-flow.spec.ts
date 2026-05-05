import { test, expect } from '@playwright/test';

test.describe('Shopping Flow (E2E)', () => {
  // Extended timeout for this multi-step E2E flow
  test.setTimeout(90_000);


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
      // Wait for the PDP main CTA button to load to guarantee the page is ready
      const mainBtn = page.locator('button.h-12').first();
      await expect(mainBtn).toBeVisible({ timeout: 15000 });

      // Automatically select the first available option for any variant (Size, Color, etc.)
      const radiogroups = page.locator('div[role="radiogroup"]');
      const groupCount = await radiogroups.count();
      for (let i = 0; i < groupCount; i++) {
        const group = radiogroups.nth(i);
        const availableOptions = group.locator('button:not([disabled])');
        if (await availableOptions.count() > 0) {
          await availableOptions.first().click();
        }
      }

      // Find the main "Add to Cart" button on the PDP.
      // We use a stable class locator (.flex-1.h-12) because the button's text changes during animation.
      const addToCartBtn = page.locator('button.flex-1.h-12').first();
      await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
      
      // Click to add
      await addToCartBtn.click();

      // Wait for success indication (button text changes to "Added to cart!")
      await expect(addToCartBtn).toHaveText(/Added|تمت الإضافة/i, { timeout: 5000 });
    });

    // =========================================================================
    // 3. CART & CHECKOUT INITIATION
    // =========================================================================
    await test.step('Proceed to checkout from cart', async () => {
      // Use client-side navigation by clicking the cart icon in the header
      const cartHeaderLink = page.locator('header a[href="/cart"]').first();
      await cartHeaderLink.click();

      // Verify cart has loaded
      const checkoutLink = page.locator('a[href="/checkout"]').first();
      await expect(checkoutLink).toBeVisible({ timeout: 10000 });
      
      // Proceed to checkout
      await checkoutLink.click();
      
      // Handle potential redirect to login if unauthenticated
      await page.waitForURL(/.*(\/checkout|\/login)/, { timeout: 10000 });
      if (page.url().includes('/login')) {
        // Wait for the login form to be fully rendered before filling
        const emailInput = page.locator('input#login-email');
        await expect(emailInput).toBeVisible({ timeout: 10000 });
        
        // Fill in credentials
        await emailInput.fill('abdelrahman.samy.creator@gmail.com');
        await page.locator('input#login-password').fill('%%49737722Sa%%');
        
        // Submit login form
        await page.locator('button[type="submit"]').first().click();
      }

      await expect(page).toHaveURL(/.*\/checkout/, { timeout: 15000 });
    });

    // =========================================================================
    // 4. CHECKOUT FORM (COD) — Multi-Step Wizard
    // =========================================================================
    await test.step('Fill Step 1: Contact Information', async () => {
      // Wait for the checkout page to fully render (contact step is step 1)
      const firstNameInput = page.locator('#checkout-firstName');
      await expect(firstNameInput).toBeVisible({ timeout: 15000 });

      // Fill Contact Information
      await firstNameInput.fill(customerName);
      await page.locator('#checkout-lastName').fill('Doe');
      await page.locator('#checkout-email').fill('test@shiftsouq.com');

      // Phone field uses react-phone-number-input, find the actual input inside it
      const phoneInput = page.locator('.PhoneInputInput');
      await phoneInput.fill('1000000000');

      // Submit Contact step → advance to Shipping
      await page.getByRole('button', { name: /Continue to Shipping|متابعة إلى الشحن/i }).click();
    });

    await test.step('Fill Step 2: Shipping Address', async () => {
      // Wait for the shipping step to appear
      const govSelector = page.locator('#checkout-city');
      await expect(govSelector).toBeVisible({ timeout: 10000 });

      // Select a governorate from the custom dropdown
      // Click the governorate selector to open the dropdown
      const govDropdown = page.locator('text=/Select governorate|اختر المحافظة/i').first();
      await govDropdown.click();

      // Select "Cairo" from the dropdown
      const cairoOption = page.getByRole('button', { name: /^Cairo$|^القاهرة$/i }).first();
      await expect(cairoOption).toBeVisible({ timeout: 5000 });
      await cairoOption.click();

      // Fill city and address
      await page.locator('#checkout-city').fill('Nasr City');
      await page.locator('#checkout-address').fill('123 Test Street, Building 4');

      // Submit Shipping step → advance to Payment
      await page.getByRole('button', { name: /Continue to Payment|متابعة إلى الدفع/i }).click();
    });

    await test.step('Select COD and place order', async () => {
      // Wait for Payment step to render
      const codButton = page.getByRole('button', { name: /Cash on Delivery|الدفع عند الاستلام/i });
      await expect(codButton).toBeVisible({ timeout: 10000 });

      // Select Cash on Delivery
      await codButton.click();

      // Click "Place Order"
      const placeOrderBtn = page.getByRole('button', { name: /Place Order|تأكيد الطلب/i });
      await expect(placeOrderBtn).toBeVisible();
      await placeOrderBtn.click();
    });

    // =========================================================================
    // 5. SUCCESS VERIFICATION
    // =========================================================================
    await test.step('Verify order success page', async () => {
      // Wait for navigation to the success page
      await expect(page).toHaveURL(/.*\/checkout\/success/, { timeout: 20000 });
      
      // Look for confirmation text
      const successMessage = page.getByText(/Thank you|Order Confirmed|شكراً لك|تم تأكيد الطلب/i).first();
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });
});
