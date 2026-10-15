import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec, cannedTodo, reviseByKeywords } from './genui.js';
import { keywordRoute, route } from './router.js';

test('validateSpec drops unknown components and keeps strings plain', () => {
  const spec = validateSpec({
    title: 'X',
    accent: 'neon',
    blocks: [{ type: 'script', src: 'evil.js' }, { type: 'html', html: '<img onerror=1>' }, { type: 'text', text: '<b>hi</b>' }],
  });
  assert.equal(spec.blocks.length, 1);
  assert.equal(spec.blocks[0].text, '<b>hi</b>'); // drawn with textContent, so shown as text
  assert.equal(spec.accent, 'orange');
  assert.equal(validateSpec({ blocks: [{ type: 'iframe' }] }), null);
});

test('todo request without a key opens the canned generated page', () => {
  const r = keywordRoute('help me make a todo list');
  assert.equal(r.scene, 'generated');
  assert.equal(r.data.spec.kind, 'todo');
  assert.equal(r.data.spec.proposals.length, 2);
});

test('spoken change revises the spec', () => {
  const spec = cannedTodo();
  const r = reviseByKeywords(spec, 'add due dates please');
  assert.equal(r.action, 'revise');
  assert.ok(r.spec.blocks.find((b) => b.type === 'checklist').items.every((i) => i.due));
  const yes = reviseByKeywords(spec, 'yes both');
  assert.ok(yes.spec.blocks.some((b) => b.type === 'progress'));
  assert.equal(reviseByKeywords(spec, 'เพิ่ม Call mom').spec.blocks[0].items.at(-1).text, 'Call mom');
});

test('like asks to keep; yes keeps; no closes', () => {
  const spec = cannedTodo();
  assert.equal(keywordRoute('I like it', 'generated', { spec }).action, 'accept');
  assert.equal(keywordRoute('ชอบมาก', 'generated', { spec }).action, 'accept');
  assert.equal(keywordRoute('ไม่ชอบ', 'generated', { spec }).action, 'ask');
  assert.equal(keywordRoute('keep it', 'generated', { spec, stage: 'keep' }).action, 'keep');
  assert.equal(keywordRoute('no thanks', 'generated', { spec, stage: 'keep' }).action, 'close');
});

test('a kept page opens at once, without a model call', async () => {
  let called = false;
  const r = await route('todo list for tomorrow', null, { ANTHROPIC_API_KEY: 'x' }, async () => { called = true; }, {
    saved: [{ kind: 'todo', match: ['todo'] }],
  });
  assert.equal(called, false);
  assert.equal(r.via, 'saved');
  assert.equal(r.data.savedKind, 'todo');
});

test('Claude generated spec is validated', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ content: [{ type: 'tool_use', input: { scene: 'generated', say: 'ok', spec: { kind: 'budget', title: 'Budget', blocks: [{ type: 'chart', bars: [{ label: 'Food', value: 40 }] }, { type: 'evil' }] } } }] }),
  });
  const r = await route('plan my budget', null, { ANTHROPIC_API_KEY: 'x' }, fakeFetch);
  assert.equal(r.scene, 'generated');
  assert.equal(r.data.spec.blocks.length, 1);
  assert.ok(r.data.spec.match.includes('budget'));
});
