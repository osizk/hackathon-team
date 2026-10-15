import { test, expect } from '@playwright/test';

// The deployed site has a passcode (AGENT_OS_PASSCODE); this server on 5177 runs with one.
const GATED = 'http://localhost:5177';

test('passcode gate: routes that can call ElevenLabs refuse without it; the page asks once', async ({ page, request }) => {
  for (const [method, path] of [['get', '/api/agent/session'], ['post', '/api/tts'], ['post', '/api/image'], ['post', '/api/log']]) {
    const res = await request[method](`${GATED}${path}`, method === 'post' ? { data: {} } : undefined);
    expect(res.status(), path).toBe(401);
  }
  expect(await (await request.get(`${GATED}/api/health`)).json()).toMatchObject({ passcode: true, authorized: false });

  await page.goto(`${GATED}/?test=1`);
  await expect(page.locator('[data-testid=gate]')).toBeVisible();
  await page.fill('[data-testid=gate] input', 'wrong');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid=gate] small')).toBeVisible();
  await page.fill('[data-testid=gate] input', 'u-topia-2026');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('[data-testid=gate]')).toHaveCount(0);
  const ok = await page.evaluate(async () => (await fetch('/api/agent/session', { headers: { 'x-agent-os-passcode': sessionStorage.getItem('agentos.passcode') } })).status);
  expect(ok).toBe(200);
});

test('no passcode locally: the app starts straight away', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('[data-testid=gate]')).toHaveCount(0);
});
