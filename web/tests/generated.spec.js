import { test, expect } from '@playwright/test';
import { home, say, expectHome } from './helpers.js';

const scene = (page) => page.locator('.scene-generated');

test('todo request opens a generated page; a spoken change redraws it; folds home', async ({ page }) => {
  await home(page);
  await say(page, 'help me make a todo list');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'generated');
  await expect(page.locator('[data-testid=g-badge]')).toHaveText('Generated for you');
  await expect(page.locator('.g-checklist li')).toHaveCount(5);
  await expect(page.locator('[data-testid=g-chips] .g-chip')).toHaveCount(3);
  await expect(page.locator('.g-due')).toHaveCount(0);

  await say(page, 'add due dates');
  await expect(scene(page)).toHaveAttribute('data-version', '1');
  await expect(page.locator('.g-due')).toHaveCount(5);

  // Tapping a proposal chip works like saying it.
  await page.click('.g-chip:has-text("Add a progress bar")');
  await expect(page.locator('[data-testid=g-progress]')).toBeVisible();
  await page.locator('.g-checklist li').first().click();
  await expect(page.locator('[data-testid=g-progress] b')).toHaveText('20%');

  await page.keyboard.press('Escape');
  await expectHome(page);
});

test('like it, keep it, then a second todo request opens the saved scene with no generation', async ({ page }) => {
  await home(page);
  await say(page, 'make me a to-do list');
  await expect(page.locator('.g-checklist li')).toHaveCount(5);
  await say(page, 'add due dates');
  await expect(page.locator('.g-due')).toHaveCount(5);
  await say(page, 'I like it');
  await expect(scene(page)).toHaveAttribute('data-stage', 'keep');
  await say(page, 'yes keep it');
  await expectHome(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('agentos.savedScenes')));
  expect(Object.keys(saved)).toEqual(['todo']);

  const routed = page.waitForResponse('**/api/route');
  await say(page, 'todo list for tomorrow');
  const res = await (await routed).json();
  expect(res.via).toBe('saved');
  expect(res.data).toEqual({ savedKind: 'todo' });
  await expect(page.locator('[data-testid=g-badge]')).toHaveText('Saved scene');
  await expect(page.locator('.g-due')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expectHome(page);
});

test('no thanks on keep closes without saving', async ({ page }) => {
  await home(page);
  await say(page, 'todo list');
  await expect(page.locator('.g-checklist li')).toHaveCount(5);
  await say(page, 'perfect');
  await expect(scene(page)).toHaveAttribute('data-stage', 'keep');
  await say(page, 'no thanks');
  await expectHome(page);
  expect(await page.evaluate(() => localStorage.getItem('agentos.savedScenes'))).toBeNull();
});

test('urgent: bleeding finger shows first-aid steps at once, a 1669 button, no like question', async ({ page }) => {
  await home(page);
  await say(page, 'เลือดผมออกที่นิ้วทำไงดี');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'generated');
  await expect(page.locator('[data-testid=g-badge]')).toHaveText('First aid');
  await expect(page.locator('.g-steps li')).toHaveCount(4);
  await expect(page.locator('[data-testid=g-call]')).toHaveAttribute('href', 'tel:1669');
  await expect(page.locator('[data-testid=g-chips]')).toHaveCount(0);
  await expect(scene(page)).toHaveAttribute('data-stage', 'urgent');
  await expect(page.locator('#subtitle')).not.toContainText('ชอบ');
  await say(page, 'I like it');
  await expectHome(page);
  expect(await page.evaluate(() => localStorage.getItem('agentos.savedScenes'))).toBeNull();
});

test('image block: grey frame at once; without a key the frame stays with an icon', async ({ page }) => {
  await home(page);
  await page.evaluate(() => window.agentOS.openScene('generated', {
    spec: { kind: 'trip', title: 'Trip', accent: 'blue', blocks: [{ type: 'image', prompt: 'beach at sunset', caption: 'Hua Hin' }, { type: 'text', text: 'Pack light' }], proposals: [] },
  }));
  await expect(page.locator('[data-testid=g-image]')).toBeVisible();
  await expect(page.locator('[data-testid=g-image] figcaption')).toHaveText('Hua Hin');
  await expect(page.locator('[data-testid=g-image]')).toHaveClass(/failed/);
});

test('image block: picture fades in when the server returns one', async ({ page }) => {
  await page.route('**/api/image', (r) => r.fulfill({ json: { url: '/img/race.svg' } }));
  await home(page);
  await page.evaluate(() => window.agentOS.openScene('generated', {
    spec: { kind: 'run', title: 'Run', blocks: [{ type: 'image', prompt: 'runner' }], proposals: [] },
  }));
  await expect(page.locator('[data-testid=g-image]')).toHaveClass(/loaded/);
});

test('phone width: no sideways scroll, tap targets at least 44 px, one primary button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await home(page);
  const long = 'Supercalifragilisticexpialidocious_registration_https://example.com/a/very/long/path';
  await page.evaluate((long) => window.agentOS.openScene('generated', {
    spec: {
      kind: 'mix', title: `${long} title`, subtitle: long, accent: 'green',
      blocks: [
        { type: 'text', text: `Answer first. ${long}` },
        { type: 'stat', label: 'Saved', value: '12,400 THB' }, { type: 'stat', label: 'Goal', value: '20,000 THB' }, { type: 'stat', label: 'Days', value: 16 },
        { type: 'checklist', items: [{ text: long, due: 'Next week Monday', tag: 'Urgent!!' }, { text: 'Short', tag: 'Low' }] },
        { type: 'chart', bars: ['Saturday morning', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({ label, value: 1000 * (i + 1) })) },
        { type: 'card', title: long, text: long },
        { type: 'field', label: 'Note', placeholder: long },
        { type: 'sources', items: [{ title: long, url: 'https://example.com/a/very/long/path/that/goes/on' }, { title: 'Short', url: 'https://run.example' }] },
        { type: 'button', label: 'Save' }, { type: 'button', label: 'Later' },
      ],
      proposals: [{ id: 'a', label: 'Show by category' }, { id: 'b', label: 'Dark mode' }],
    },
  }), long);
  await expect(scene(page)).toBeVisible();
  await expect(page.locator('.g-lead')).toHaveCount(1);
  await expect(page.locator('.g-stats .g-stat')).toHaveCount(3);
  await expect(page.locator('.g-tag-high')).toHaveText('Urgent!!');
  await expect(page.locator('.g-button:not(.g-button-secondary)')).toHaveCount(1);
  await expect(page.locator('.g-chart b').last()).toHaveText('8,000');

  const m = await page.evaluate(() => {
    const root = document.querySelector('.scene-generated');
    const right = root.getBoundingClientRect().right;
    const tooSmall = [...root.querySelectorAll('button, a, input, .g-checklist li')]
      .map((el) => ({ el: `${el.tagName} ${el.textContent.slice(0, 20)}`, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 || r.width < 44)
      .map(({ el, r }) => `${el} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const wide = [...root.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > right + 1).map((el) => el.className);
    return { sideways: root.scrollWidth - root.clientWidth, page: document.documentElement.scrollWidth - innerWidth, tooSmall, wide };
  });
  expect(m.sideways).toBe(0);
  expect(m.page).toBe(0);
  expect(m.wide).toEqual([]);
  expect(m.tooSmall).toEqual([]);
});
