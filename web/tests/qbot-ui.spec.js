import { test, expect } from '@playwright/test';
import { home } from './helpers.js';

test('Q-Bot removes the suggestion cards and demo captions while retaining the composer', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
  await expect(page).toHaveTitle('Q-Bot');
  await expect(page.locator('.intro')).toHaveText('Q-Bot');
  await expect(page.locator('#suggest, .secretary-shortcuts [role=status]')).toHaveCount(0);
  await expect(page.locator('.secretary-shortcuts button')).toHaveCount(3);
  await expect(page.locator('.secretary-shortcuts button').first()).toBeHidden();
  await expect(page.locator('#fallbackInput')).toBeHidden();
  await expect(page.locator('.send')).toBeHidden();
  await expect(page.locator('#mic')).toBeHidden();
  await page.locator('.intro h1').click();
  await expect(page.locator('body')).toHaveClass(/started/);
  await expect(page.locator('#fallbackInput')).toBeVisible();
  await expect(page.locator('.send')).toBeVisible();
  await expect(page.locator('#mic')).toBeVisible();
  await expect(page.locator('.interaction-panel')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.interaction-panel')).toHaveCSS('border-top-width', '0px');
});

test('language switches live, preserves user data and open task state, and survives reload', async ({ page }) => {
  await home(page);
  await page.locator('#fallbackInput').fill('ข้อความของฉัน');
  await page.getByTestId('secretary-email').click();
  await page.getByTestId('import-email').click();
  await page.locator('.secretary-task input').first().check();
  await page.locator('[data-language=en]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('secretary-today')).toHaveText('Today');
  await expect(page.getByTestId('secretary-email')).toHaveText('Email → Tasks');
  await expect(page.locator('.secretary-title')).toHaveText('Email to tasks');
  await expect(page.locator('.secretary-task input').first()).toBeChecked();
  await expect(page.locator('#fallbackInput')).toHaveValue('ข้อความของฉัน');
  await expect(page.locator('#fallbackInput')).toHaveAttribute('placeholder', 'Type here');
  await page.getByTestId('home-btn').click();
  await page.getByTestId('secretary-demo').click();
  await expect(page.getByRole('combobox', { name: 'Event' })).toBeVisible();
  await page.getByTestId('close-demo').click();
  await page.locator('[data-language=th]').click();
  await page.getByTestId('secretary-demo').click();
  await expect(page.getByRole('combobox', { name: 'เหตุการณ์' })).toBeVisible();
  await page.getByTestId('close-demo').click();
  await page.locator('[data-language=en]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('secretary-demo')).toHaveText('Test notifications');
});

for (const width of [320, 390]) {
  test(`capsule shortcuts form two rows at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 812 });
    await home(page);
    await expect(page.locator('#mascot')).toHaveAttribute('data-ready', '1');
    for (const lang of ['th', 'en']) {
      await page.locator(`[data-language=${lang}]`).click();
      const [today, email, notices] = await Promise.all(['secretary-today', 'secretary-email', 'secretary-demo'].map((id) => page.getByTestId(id).boundingBox()));
      expect(Math.abs(today.y - email.y)).toBeLessThan(1);
      expect(notices.y).toBeGreaterThanOrEqual(today.y + today.height);
      expect(Math.abs(notices.x + notices.width / 2 - width / 2)).toBeLessThan(1);
      await expect(page.getByTestId('secretary-today')).toHaveCSS('border-radius', '999px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`qbot-${lang}.png`) });
    }
  });
}
