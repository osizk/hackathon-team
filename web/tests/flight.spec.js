import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

test('flight hotkey: agent speaks first, spoken yes re-routes, folds home', async ({ page }) => {
  await home(page, { presenter: true });
  await page.keyboard.press('f');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'flight');
  await expect(page.locator('[data-testid=old-flight] .pill')).toHaveText('ล่าช้า 2 ชม.');
  await expect(page.locator('.tl-new')).toBeHidden();
  await say(page, 'yes change it');
  await expect(page.locator('[data-testid=flight-done]')).toBeVisible();
  await expect(page.locator('.tl-new')).toBeVisible();
  await expectHome(page);
});

test('flight: Yes button works too', async ({ page }) => {
  await home(page, { presenter: true });
  await say(page, 'is my flight ok');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'flight');
  await page.click('[data-testid=yes]');
  await expect(page.locator('[data-testid=flight-done]')).toBeVisible();
  await expectHome(page);
});

test('flight: spoken no keeps the old flight', async ({ page }) => {
  await home(page, { presenter: true });
  await page.keyboard.press('f');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'flight');
  await say(page, 'ไม่เอา');
  await expectHome(page);
  await expect(page.locator('[data-testid=flight-done]')).toHaveCount(0);
});
