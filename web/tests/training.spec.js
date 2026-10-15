import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

test('training hotkey: form fills itself, submits, confetti, folds home', async ({ page }) => {
  await home(page);
  await page.keyboard.press('t');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'training');
  await expect(page.locator('[data-testid=sleep-score]')).toHaveText('86');
  await expect(page.locator('[data-testid=race-form]')).toBeVisible();
  await expect(page.locator('[data-field=email]')).toHaveValue('ploy@example.com');
  await expect(page.locator('[data-testid=race-done]')).toBeVisible();
  await expect(page.locator('.confetti i').first()).toBeAttached();
  await expectHome(page);
});

test('fallback text "training" routes to the training scene', async ({ page }) => {
  await home(page);
  await say(page, 'how is my training');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'training');
  await page.keyboard.press('Escape');
  await expectHome(page);
});
