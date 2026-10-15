import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passcodeOk, createHandlers } from './handlers.js';
import health from '../api/health.js';
import routeFn from '../api/route.js';
import tts from '../api/tts.js';
import session from '../api/agent/session.js';

function call(fn, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 0,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(data) { resolve({ status: this.statusCode, type: this.headers['content-type'], json: data && this.headers['content-type'] === 'application/json' ? JSON.parse(data) : null }); },
    };
    const req = { method, headers, url: '/api/x', body, async *[Symbol.asyncIterator]() {} };
    fn(req, res);
  });
}

test('passcodeOk: open without a passcode, exact match with one', () => {
  assert.equal(passcodeOk({}, undefined), true);
  assert.equal(passcodeOk({ AGENT_OS_PASSCODE: 'abc' }, 'abc'), true);
  assert.equal(passcodeOk({ AGENT_OS_PASSCODE: 'abc' }, 'abd'), false);
  assert.equal(passcodeOk({ AGENT_OS_PASSCODE: 'abc' }, ''), false);
});

test('handlers refuse ElevenLabs routes before any call when the passcode is wrong', async () => {
  let called = false;
  const app = createHandlers({ env: { AGENT_OS_PASSCODE: 'abc', ELEVENLABS_API_KEY: 'k', ELEVENLABS_AGENT_ID: 'a' }, inlineImages: true });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { called = true; throw new Error('no network in tests'); };
  try {
    for (const run of [() => app.session({}), () => app.tts({}, { text: 'x' }), () => app.image({}, { prompt: 'x' }), () => app.log({}, { events: [] })]) {
      await assert.rejects(run, (err) => err.status === 401);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(called, false);
  assert.deepEqual(app.health({}), { brain: 'elevenlabs-agent', tts: true, passcode: true, authorized: false });
});

test('Vercel functions: health, route with a parsed body, method check, passcode 401', async () => {
  const h = await call(health);
  assert.equal(h.status, 200);
  assert.equal(h.json.brain === 'keywords' || h.json.brain === 'elevenlabs-agent', true);

  const r = await call(routeFn, { method: 'POST', body: { text: 'this week is hectic' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.scene, 'shopping');
  assert.equal((await call(routeFn, { method: 'GET' })).status, 405);

  process.env.AGENT_OS_PASSCODE = 'abc';
  try {
    assert.equal((await call(tts, { method: 'POST', body: { text: 'x' } })).status, 401);
    assert.equal((await call(session, { headers: {} })).status, 401);
  } finally {
    delete process.env.AGENT_OS_PASSCODE;
  }
});
