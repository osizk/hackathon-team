import { expect } from '@playwright/test';

export async function home(page) {
  await page.goto('/?test=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
}

// Type into the hidden fallback input, as a presenter would if the mic failed.
export async function say(page, text) {
  await page.keyboard.press('/');
  await expect(page.locator('#fallbackInput')).toBeVisible();
  await page.fill('#fallbackInput', text);
  await page.keyboard.press('Enter');
}

export async function expectHome(page) {
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'home', { timeout: 10_000 });
  await expect(page.locator('#stage')).not.toHaveClass(/open/);
  await expect(page.locator('#stage .scene')).toHaveCount(0);
}
