import { test, expect } from '@playwright/test';
import { home, say } from './helpers.js';

// A live-configured site whose daily limit is used up (server on 5177, limits 0, fake key).
const LIMITED = 'http://localhost:5177';

test('no passcode: the app starts straight away and the routes answer without one', async ({ page, request }) => {
  await home(page);
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await expect(page.locator('[data-testid=notice]')).toBeHidden();
  expect((await request.get('/api/agent/session')).status()).toBe(200);
});

test('daily limit used up: the page starts offline, says so, and the offline brain still works', async ({ page, request }) => {
  expect(await (await request.get(`${LIMITED}/api/health`)).json()).toMatchObject({ brain: 'elevenlabs-agent', offline: 'limit' });
  const session = await (await request.get(`${LIMITED}/api/agent/session`)).json();
  expect(session).toMatchObject({ live: false, offline: 'limit' });
  const tts = await request.post(`${LIMITED}/api/tts`, { data: { text: 'x' } });
  expect(tts.status()).toBe(429);
  expect(await tts.json()).toMatchObject({ offline: 'limit' });

  await page.goto(`${LIMITED}/?test=1`);
  await expect(page.locator('body')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('body')).toHaveAttribute('data-offline', 'limit');
  await expect(page.locator('body')).toHaveAttribute('data-brain', 'keywords');
  await expect(page.locator('[data-testid=notice]')).toBeVisible();
  await expect(page.locator('[data-testid=notice]')).toContainText('Offline mode');
  await say(page, 'this week is hectic');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'shopping', { timeout: 10_000 });
});

test('limit reached mid-run: a session answer that says offline switches the page by itself', async ({ page }) => {
  await page.route('**/api/health', (r) => r.fulfill({ json: { brain: 'elevenlabs-agent', tts: false, offline: null } }));
  await page.route('**/api/agent/session', (r) => r.fulfill({ json: { live: false, reason: 'daily sessions limit reached', offline: 'limit' } }));
  await home(page);
  await expect(page.locator('body')).toHaveAttribute('data-brain', 'agent-ready');
  await say(page, 'this week is hectic');
  await expect(page.locator('body')).toHaveAttribute('data-offline', 'limit');
  await expect(page.locator('[data-testid=notice]')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-brain', 'keywords');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'shopping', { timeout: 10_000 });
});
