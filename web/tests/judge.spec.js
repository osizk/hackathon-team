import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

// A judge alone: no presenter, no keys. What this is, sentences to tap, a text input, a way home.

test('first run: a hint of what this is, four suggestions, the input next to the mic, no presenter controls', async ({ page }) => {
  await home(page);
  await expect(page.locator('[data-testid=intro]')).toContainText('Agent OS');
  await expect(page.locator('[data-testid=suggest] button')).toHaveCount(4);
  await expect(page.locator('[data-testid=composer] #mic')).toBeVisible();
  await expect(page.locator('#fallbackInput')).toBeVisible();
  await expect(page.locator('[data-testid=presenter]')).toHaveCount(0);
  await expect(page.locator('[data-testid=home-btn]')).toBeHidden();
  // Presenter hotkeys do nothing for a judge.
  await page.locator('[data-testid=intro]').click();
  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'home');
});

for (const [kind, scene, check] of [
  ['scene', 'shopping', '.scene-shopping'],
  ['generated', 'generated', '[data-testid=g-checklist], .g-checklist'],
  ['urgent', 'generated', 'a[href="tel:1669"], .g-steps'],
  ['search', 'training', '.scene-training'],
]) {
  test(`suggestion "${kind}" routes to ${scene} and the home button folds back`, async ({ page }) => {
    await home(page);
    await page.click(`[data-testid=suggest] button[data-kind=${kind}]`);
    await expect(page.locator('body')).toHaveAttribute('data-scene', scene, { timeout: 10_000 });
    await expect(page.locator(check).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid=home-btn]')).toBeVisible();
    await page.click('[data-testid=home-btn]');
    await expectHome(page);
  });
}

test('typed text works like speech, and the input stays visible inside a scene', async ({ page }) => {
  await home(page);
  await say(page, 'flight');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'flight', { timeout: 10_000 });
  await expect(page.locator('#fallbackInput')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expectHome(page);
});
