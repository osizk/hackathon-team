import { expect } from '@playwright/test';

// presenter: true turns on the team's hotkeys and clock panel (?presenter=1); judges never see them.
export async function home(page, { presenter = false } = {}) {
  await page.goto(presenter ? '/?test=1&presenter=1' : '/?test=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
}

// Type into the text input next to the mic, as a judge would.
export async function say(page, text) {
  await expect(page.locator('#fallbackInput')).toBeVisible();
  await page.fill('#fallbackInput', text);
  await page.keyboard.press('Enter');
}

export async function expectHome(page) {
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'home', { timeout: 10_000 });
  await expect(page.locator('#stage')).not.toHaveClass(/open/);
  await expect(page.locator('#stage .scene')).toHaveCount(0);
}
