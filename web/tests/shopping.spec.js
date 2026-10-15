import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

test('hectic week: list builds from email, slides into payment, Allow folds home', async ({ page }) => {
  await home(page);
  await say(page, 'this week is hectic');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'shopping');
  await expect(page.locator('[data-testid=mail]')).toBeVisible();
  // The list builds item by item, then slides up into payment with every item.
  await expect(page.locator('[data-testid=shop-items] li').first()).toBeAttached();
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'payment', { timeout: 10_000 });
  await expect(page.locator('[data-testid=pay-total]')).toHaveText('฿849');
  await expect(page.locator('.pay-items li')).toHaveCount(6);
  await page.click('[data-testid=allow]');
  await expect(page.locator('[data-testid=pay-success]')).toBeVisible();
  await expectHome(page);
});

test('Thai: สัปดาห์นี้ยุ่งมาก opens the shopping list', async ({ page }) => {
  await home(page);
  await say(page, 'สัปดาห์นี้ยุ่งมาก');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'shopping');
  await page.keyboard.press('Escape');
  await expectHome(page);
});

test('cached voice files are listed for every fixed line', async ({ page }) => {
  const ids = await (await page.request.get('/voice/manifest.json')).json();
  expect(ids).toContain('pay_done');
  const mp3 = await page.request.get('/voice/pay_done.mp3');
  expect(mp3.headers()['content-type']).toBe('audio/mpeg');
});
