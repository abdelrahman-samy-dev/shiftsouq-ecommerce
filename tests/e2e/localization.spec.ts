import { test, expect } from '@playwright/test';

test.describe('Localization & RTL Flow', () => {
  test('User can switch language to Arabic and layout changes to RTL', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for the language switcher to be present
    const languageSwitcher = page.locator('button').filter({ hasText: /English|EN|العربية|AR/i }).first();
    await expect(languageSwitcher).toBeVisible({ timeout: 10000 });
    
    const currentText = await languageSwitcher.innerText();
    
    // If it's already Arabic, we switch to English first to test the toggle, then back to Arabic
    if (currentText.includes('العربية') || currentText.includes('AR')) {
      await languageSwitcher.click();
      await page.getByRole('button', { name: /English/i }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr', { timeout: 10000 });
    }

    // Now switch to Arabic
    await languageSwitcher.click();
    await page.getByRole('button', { name: /العربية/i }).click();

    // Wait for the page to reload and HTML direction to be set to RTL
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 10000 });
    
    // Verify the Language Switcher button now displays Arabic
    const updatedSwitcher = page.locator('button').filter({ hasText: /العربية|AR/i }).first();
    await expect(updatedSwitcher).toBeVisible();
  });
});
