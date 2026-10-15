import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createToolHandlers, TOOL_DEFS } from '../public/js/agent-tools.js';
import { cannedTodo, cannedFirstAid, validateSpec } from '../public/js/genui.js';

function fakeUi(open = null) {
  const log = [];
  let current = open;
  return {
    log,
    ui: {
      current: () => current,
      openScene: (name, data) => { log.push(['open', name, data]); current = { name, ctl: { state: () => ({ spec: data?.spec }) } }; },
      closeScene: () => { log.push(['close']); current = null; },
      action: (name, extra) => log.push(['action', name, extra]),
      nudgeAllow: () => log.push(['nudge']),
    },
  };
}

test('every tool has a handler', () => {
  const h = createToolHandlers(fakeUi().ui);
  for (const t of TOOL_DEFS) assert.equal(typeof h[t.name], 'function', t.name);
});

test('no tool can approve a payment', () => {
  const { ui, log } = fakeUi({ name: 'payment', ctl: {} });
  const out = createToolHandlers(ui).scene_action({ action: 'confirm' });
  assert.match(out, /^refused/);
  assert.deepEqual(log, [['nudge']]);
});

test('open_scene checks the scene and the JSON', () => {
  const { ui, log } = fakeUi();
  const h = createToolHandlers(ui);
  assert.match(h.open_scene({ scene: 'bank_transfer' }), /^error/);
  assert.match(h.open_scene({ scene: 'flight', data_json: '{bad' }), /^error/);
  assert.equal(h.open_scene({ scene: 'flight', data_json: '{"delayMinutes":90}' }), 'opened flight');
  assert.deepEqual(log[0], ['open', 'flight', { delayMinutes: 90 }]);
});

test('render_ui validates the spec; unknown components are dropped', () => {
  const { ui, log } = fakeUi();
  const h = createToolHandlers(ui);
  assert.match(h.render_ui({ spec_json: '{"blocks":[{"type":"script"}]}' }), /^error/);
  const out = h.render_ui({ spec_json: JSON.stringify({ ...cannedTodo(), blocks: [...cannedTodo().blocks, { type: 'html', html: '<b>' }] }) });
  assert.match(out, /ask if the user likes it/);
  assert.equal(log[0][2].spec.blocks.length, 2);
});

test('mark_urgent and keep_scene: first-aid pages are never kept', () => {
  const { ui, log } = fakeUi();
  const h = createToolHandlers(ui);
  h.render_ui({ spec_json: JSON.stringify(cannedTodo()) });
  assert.match(h.keep_scene(), /^kept/);
  assert.equal(h.mark_urgent({ level: 'serious' }), 'marked serious');
  const urgentSpec = log.find((l) => l[1] === 'urgent')[2].spec;
  assert.equal(urgentSpec.blocks[0].number, '1669');
  assert.deepEqual(urgentSpec.proposals, []);

  const first = fakeUi();
  const h2 = createToolHandlers(first.ui);
  h2.render_ui({ spec_json: JSON.stringify(validateSpec(cannedFirstAid())) });
  assert.match(h2.keep_scene(), /^refused/);
});
