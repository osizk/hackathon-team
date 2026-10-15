import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageService, IMAGE_MODEL, MAX_PER_SCENE } from './images.js';

const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
const png = { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer };
const fresh = () => mkdtempSync(join(tmpdir(), 'agentos-img-'));

function fakeApi(script) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, opts = {}) => {
      calls.push({ url, method: opts.method || 'GET', headers: opts.headers, body: opts.body && JSON.parse(opts.body) });
      return script(url, opts, calls.length);
    },
  };
}

const okScript = (url, opts) => {
  if (opts.method === 'POST') return json(200, { id: 'gen1', status: 'pending' });
  if (url.endsWith('/gen1')) return json(200, { id: 'gen1', status: 'completed', content_url: 'https://cdn.example/x.png' });
  return png;
};

test('create, poll, download, then cache by prompt', async () => {
  const api = fakeApi(okScript);
  const svc = createImageService({ env: { ELEVENLABS_API_KEY: 'k' }, dir: fresh(), fetchImpl: api.fetchImpl, sleep: async () => {} });
  const r = await svc.get('a corgi with a backpack');
  assert.match(r.url, /^\/api\/image\/[a-f0-9]{24}\.png$/);
  assert.equal(api.calls[0].url, 'https://api.elevenlabs.io/v1/flows/image');
  assert.equal(api.calls[0].body.model_id, IMAGE_MODEL);
  assert.equal(api.calls[0].headers['xi-api-key'], 'k');
  assert.equal(api.calls[2].headers, undefined); // signed URL fetched without the key
  const again = await svc.get('A corgi with a backpack ');
  assert.equal(again.cached, true);
  assert.equal(api.calls.length, 3);
});

test('402 paid_plan_required and failed jobs become a quiet error', async () => {
  const paid = fakeApi(() => json(402, { detail: { status: 'paid_plan_required' } }));
  const svc = createImageService({ env: { ELEVENLABS_API_KEY: 'k' }, dir: fresh(), fetchImpl: paid.fetchImpl, sleep: async () => {} });
  assert.deepEqual(await svc.get('x'), { error: 'paid_plan_required' });

  const failed = fakeApi((url, opts) => (opts.method === 'POST' ? json(200, { id: 'g' }) : json(200, { status: 'failed', failure_reason: 'moderated' })));
  const svc2 = createImageService({ env: { ELEVENLABS_API_KEY: 'k' }, dir: fresh(), fetchImpl: failed.fetchImpl, sleep: async () => {} });
  assert.deepEqual(await svc2.get('y'), { error: 'failed: moderated' });
});

test('times out, and caps calls per scene; no key means no call', async () => {
  const slow = fakeApi((url, opts) => (opts.method === 'POST' ? json(200, { id: 'g' }) : json(200, { status: 'generating' })));
  const svc = createImageService({ env: { ELEVENLABS_API_KEY: 'k' }, dir: fresh(), fetchImpl: slow.fetchImpl, sleep: async () => {}, timeoutMs: 5 });
  assert.deepEqual(await svc.get('slow one', 's1'), { error: 'timeout' });
  for (let i = 1; i < MAX_PER_SCENE; i++) await svc.get(`p${i}`, 's1');
  assert.match((await svc.get('one too many', 's1')).error, /cap/);

  const none = fakeApi(() => json(500, {}));
  const svc2 = createImageService({ env: {}, dir: fresh(), fetchImpl: none.fetchImpl });
  assert.deepEqual(await svc2.get('z'), { error: 'no ELEVENLABS_API_KEY' });
  assert.equal(none.calls.length, 0);
});

test('after 402 the service stops calling and answers at once', async () => {
  const paid = fakeApi(() => json(402, { detail: { status: 'paid_plan_required' } }));
  const svc = createImageService({ env: { ELEVENLABS_API_KEY: 'k' }, dir: fresh(), fetchImpl: paid.fetchImpl, sleep: async () => {} });
  await svc.get('first');
  const second = await svc.get('second', 'other-scene');
  assert.deepEqual(second, { error: 'paid_plan_required', quiet: true });
  assert.equal(paid.calls.length, 1);
});
