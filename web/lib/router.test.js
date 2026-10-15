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
  const r = await route('hectic', null);
  assert.equal(r.via, 'keywords');
  assert.equal(r.scene, 'shopping');
});
