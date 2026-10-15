import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

test('home has mascot, mic and no chat box', async ({ page }) => {
  await home(page);
  await expect(page.locator('#mascot')).toBeVisible();
  await expect(page.locator('#mic')).toBeVisible();
  await expect(page.locator('#fallback')).toBeHidden();
  await expect(page.locator('textarea, input:visible')).toHaveCount(0);
  const health = await (await page.request.get('/api/health')).json();
  expect(health).toEqual({ brain: 'keywords', tts: false, passcode: false, authorized: true });
});

test('payment: Allow pays and folds back home', async ({ page }) => {
  await home(page);
  await say(page, 'pay for it');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'payment');
  await expect(page.locator('#stage')).toHaveClass(/open/);
  await expect(page.locator('[data-testid=pay-total]')).toHaveText('฿849');
  await expect(page.locator('[data-testid=pay-success]')).toBeHidden();
  await expect(page.locator('.pay-rules .ok')).toHaveCount(3);
  await page.click('[data-testid=allow]');
  await expect(page.locator('[data-testid=pay-success]')).toBeVisible();
  await expectHome(page);
});

test('payment: Deny folds back home without paying', async ({ page }) => {
  await home(page);
  await say(page, 'checkout');
  await page.click('[data-testid=deny]');
  await expect(page.locator('[data-testid=pay-success]')).toBeHidden();
  await expectHome(page);
});

test('payment: saying allow does not pay', async ({ page }) => {
  await home(page);
  await page.keyboard.press('p');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'payment');
  await say(page, 'allow');
  await expect(page.locator('[data-testid=allow]')).toHaveClass(/nudge/);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid=pay-success]')).toBeHidden();
  await expect(page.locator('.scene-payment')).not.toHaveClass(/paid/);
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'payment');
  await page.keyboard.press('Escape');
  await expectHome(page);
});
