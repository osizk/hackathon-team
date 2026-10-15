import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeeds } from './feeds.js';
import { createAgentLoop } from './agent-loop.js';
import { decide, decideByRules } from './brain.js';

function setup(opts = {}) {
  const pushed = [];
  const loop = createAgentLoop({ feeds: createFeeds(), tickMs: 1e9, log: () => {}, ...opts });
  loop.addClient({ write: (m) => { if (m.startsWith('event: proactive')) pushed.push(JSON.parse(m.split('data: ')[1])); } });
  return { loop, pushed };
}

test('flight delay pushes the flight scene once', async () => {
  const { loop, pushed } = setup();
  await loop.tick();
  assert.equal(pushed.length, 0);
  loop.fire('flight-delayed');
  await loop.tick();
  assert.equal(pushed[0].scene, 'flight');
  assert.equal(pushed[0].line, 'flight_intro');
  loop.ack({ id: pushed[0].id, ok: true });
  loop.fire('flight-delayed');
  await loop.tick();
  assert.equal(pushed.length, 1);
  loop.stop();
});

test('never speaks while a scene is open or someone talks', async () => {
  const { loop, pushed } = setup();
  loop.fire('sleep-synced');
  for (const p of [{ scene: 'payment' }, { scene: 'home', talking: true }, { scene: 'home', listening: true }]) {
    loop.setPresence(p);
    await loop.tick();
  }
  assert.equal(pushed.length, 0);
  loop.setPresence({ scene: 'home' });
  await loop.tick();
  assert.equal(pushed[0].scene, 'training');
  loop.stop();
});

test('busy ack makes it try again later', async () => {
  const { loop, pushed } = setup();
  loop.fire('flight-delayed');
  await loop.tick();
  loop.ack({ id: pushed[0].id, ok: false });
  await loop.tick();
  assert.equal(pushed.length, 2);
  loop.stop();
});

test('script: closing payment schedules the sleep event', async () => {
  const feeds = createFeeds();
  const loop = createAgentLoop({ feeds, tickMs: 1e9, log: () => {}, script: [{ afterScene: 'payment', delaySec: 0, event: 'sleep-synced' }] });
  loop.setPresence({ scene: 'payment' });
  loop.setPresence({ scene: 'home' });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(feeds.get().health.synced, true);
  loop.stop();
});

test('rules wait on a plain email; Claude cannot pick an unknown or handled scene', async () => {
  const feeds = createFeeds();
  feeds.fire('email-shopping');
  assert.equal(decideByRules(feeds.get(), {}).speak, false);
  const fake = (input) => async () => ({ ok: true, json: async () => ({ content: [{ type: 'tool_use', input }] }) });
  const env = { ANTHROPIC_API_KEY: 'x' };
  assert.equal((await decide(feeds.get(), ['email'], {}, env, fake({ speak: true, scene: 'payment', reason: 'x' }))).speak, false);
  assert.equal((await decide(feeds.get(), ['flight'], { flight: true }, env, fake({ speak: true, scene: 'flight', reason: 'x' }))).speak, false);
  const ok = await decide(feeds.get(), ['flight'], {}, env, fake({ speak: true, scene: 'flight', reason: 'delay' }));
  assert.deepEqual([ok.speak, ok.scene, ok.via], [true, 'flight', 'claude']);
});
