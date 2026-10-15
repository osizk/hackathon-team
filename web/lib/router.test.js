import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keywordRoute, route } from './router.js';

test('hectic week opens the shopping scene', () => {
  assert.equal(keywordRoute('this week is hectic').scene, 'shopping');
  assert.equal(keywordRoute('สัปดาห์นี้ยุ่งมาก').scene, 'shopping');
});

test('pay opens the payment scene', () => {
  assert.equal(keywordRoute('pay for it').scene, 'payment');
});

test('voice can never approve a payment', () => {
  for (const said of ['allow', 'yes', 'ok pay now', 'อนุมัติ', 'จ่ายเลย']) {
    const r = keywordRoute(said, 'payment');
    assert.equal(r.action, 'button-only', said);
    assert.equal(r.scene, null, said);
  }
});

test('yes on the flight card confirms, no keeps it', () => {
  assert.equal(keywordRoute('yes change it', 'flight').action, 'confirm');
  assert.equal(keywordRoute('ไม่เอา', 'flight').action, 'decline');
});

test('unknown text only talks', () => {
  const r = keywordRoute('blue elephants');
  assert.equal(r.scene, null);
  assert.equal(r.line, 'unsure');
});

test('no key uses keywords', async () => {
  const r = await route('hectic', null, {});
  assert.equal(r.via, 'keywords');
  assert.equal(r.scene, 'shopping');
});

test('Claude saying confirm on payment is still button-only', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ content: [{ type: 'tool_use', input: { scene: 'none', action: 'confirm' } }] }),
  });
  const r = await route('just pay it', 'payment', { ANTHROPIC_API_KEY: 'x' }, fakeFetch);
  assert.equal(r.via, 'claude');
  assert.equal(r.action, 'button-only');
});

test('Claude failure falls back to keywords', async () => {
  const r = await route('hectic week', null, { ANTHROPIC_API_KEY: 'x' }, async () => { throw new Error('offline'); });
  assert.equal(r.via, 'keywords');
  assert.equal(r.scene, 'shopping');
});
