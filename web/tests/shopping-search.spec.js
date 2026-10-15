import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

test('real shopping shows safe source cards and never starts checkout', async ({ page }) => {
  let query;
  await page.route('**/api/search', (route) => {
    query = route.request().postDataJSON().query;
    return route.fulfill({ json: { results: [
      { title: '<img src=x onerror=alert(1)>', url: 'https://shop.example/headphones', content: 'Headphones ฿990. Check delivery at the store.' },
      { title: 'Unsafe', url: 'javascript:alert(1)', content: 'x' },
    ] } });
  });
  await home(page);
  await page.getByTestId('shopping-search').click();
  await page.getByLabel('อยากหาสินค้าอะไร').fill('หูฟัง งบ 1500');
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await expect(page.locator('.product-result')).toHaveCount(1);
  expect(query).toContain('หูฟัง งบ 1500');
  await expect(page.locator('.product-result a')).toHaveAttribute('href', 'https://shop.example/headphones');
  await expect(page.locator('.product-result a')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.product-result a')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.product-result img')).toHaveCount(0);
  await expect(page.getByTestId('checkout')).toHaveCount(0);
  await page.waitForTimeout(650);
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'shopping');
});

test('a spoken product request searches once; failure is retryable', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/search', (route) => {
    calls++;
    return route.fulfill({ json: calls === 1 ? { error: 'search rate limited' } : { results: [] } });
  });
  await home(page);
  await say(page, 'หาหูฟัง งบ 1500');
  await expect(page.locator('.scene-shopping [role=status]')).toContainText('ค้นหาไม่สำเร็จ');
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await expect(page.locator('.scene-shopping [role=status]')).toContainText('ยังไม่พบผลลัพธ์');
  expect(calls).toBe(2);
});

test('closing during search cancels rendering and controls fit a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  let release;
  await page.route('**/api/search', async (route) => {
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({ json: { results: [] } }).catch(() => {});
  });
  await home(page);
  await page.getByTestId('shopping-search').click();
  await page.getByLabel('อยากหาสินค้าอะไร').fill('phone');
  await page.getByRole('button', { name: 'ค้นหา', exact: true }).click();
  await expect.poll(() => typeof release).toBe('function');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('home-btn').click(); release();
  await expectHome(page);
});
