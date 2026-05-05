import { test, expect } from '@playwright/test';

test.describe('Authentication & Security', () => {
  test('Unauthenticated user cannot access /admin and is redirected', async ({ page }) => {
    // Attempt to access admin dashboard directly without logging in
    await page.goto('/admin');

    // The user should be intercepted by middleware or client guard and redirected to /login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    
    // Verify login page is visible by checking for the email input
    const emailInput = page.locator('input[type="email"], input#login-email').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test('User can successfully log in and log out', async ({ page }) => {
    // Go to login page
    await page.goto('/login');

    // Fill in credentials
    await page.locator('input[type="email"], input#login-email').fill('abdelrahman.samy.creator@gmail.com');
    await page.locator('input[type="password"], input#login-password').fill('%%49737722Sa%%');
    
    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for the redirect and user profile trigger to be visible (indicates successful login)
    // The profile dropdown trigger has id="user-profile-dropdown-trigger"
    const profileTrigger = page.locator('#user-profile-dropdown-trigger');
    await expect(profileTrigger).toBeVisible({ timeout: 15000 });

    // Open user dropdown menu
    await profileTrigger.click();
    
    // Wait for the menu to appear and click the Logout button
    const logoutBtn = page.locator('button[type="submit"]').filter({ hasText: /Logout|Log Out|تسجيل الخروج/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Verify successful logout by ensuring the profile trigger is gone or user is redirected to login
    await expect(profileTrigger).not.toBeVisible({ timeout: 10000 });
  });
});
