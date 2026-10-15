import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUsage, memoryStore, upstashStore, storeFor, visitorId, limits, LimitError, LIMIT_DEFAULTS } from './usage.js';

const a = { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' };
const b = { 'x-forwarded-for': '2.2.2.2' };

test('limits: env numbers, defaults when unset or empty, 0 allowed', () => {
  assert.deepEqual(limits({}), LIMIT_DEFAULTS);
  assert.equal(limits({ USAGE_SESSIONS_PER_DAY: '' }).USAGE_SESSIONS_PER_DAY, LIMIT_DEFAULTS.USAGE_SESSIONS_PER_DAY);
  assert.equal(limits({ USAGE_SESSIONS_PER_DAY: '0' }).USAGE_SESSIONS_PER_DAY, 0);
  assert.equal(limits({ USAGE_CALLS_PER_VISITOR: '7' }).USAGE_CALLS_PER_VISITOR, 7);
});

test('visitorId: first forwarded address, hashed, never the raw IP', () => {
  assert.equal(visitorId(a), visitorId({ 'x-forwarded-for': '1.1.1.1' }));
  assert.notEqual(visitorId(a), visitorId(b));
  assert.equal(visitorId(a).includes('1.1.1.1'), false);
  assert.equal(visitorId({ 'x-real-ip': '3.3.3.3' }).length, 16);
});

test('per visitor limit, then the site limit', async () => {
  const usage = createUsage({ env: { USAGE_SESSIONS_PER_DAY: '3', USAGE_SESSIONS_PER_VISITOR: '2' }, store: memoryStore() });
  await usage.take('sessions', a);
  await usage.take('sessions', a);
  await assert.rejects(usage.take('sessions', a), (e) => e instanceof LimitError && e.scope === 'visitor');
  assert.equal(await usage.siteFull(), true); // 3 counted (the refused one too)
  await assert.rejects(usage.take('sessions', b), (e) => e.scope === 'site');
  await usage.take('calls', b); // calls count apart from sessions
});

test('a new UTC day starts from zero', async () => {
  let now = new Date('2026-10-16T23:59:00Z');
  const usage = createUsage({ env: { USAGE_SESSIONS_PER_VISITOR: '1' }, store: memoryStore(), now: () => now });
  await usage.take('sessions', a);
  await assert.rejects(usage.take('sessions', a));
  now = new Date('2026-10-17T00:01:00Z');
  await usage.take('sessions', a);
});

test('a store outage allows the call (the demo must not break)', async () => {
  const usage = createUsage({ env: { USAGE_SESSIONS_PER_DAY: '0' }, store: { kind: 'x', incr: async () => { throw new Error('down'); }, get: async () => { throw new Error('down'); } } });
  await usage.take('sessions', a);
  assert.equal(await usage.siteFull(), false);
});

test('upstash store: one pipeline call with INCR and EXPIRE per key, bearer token', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    return { ok: true, json: async () => [{ result: 4 }, { result: 1 }, { result: 2 }, { result: 1 }] };
  };
  const store = upstashStore({ url: 'https://x.upstash.io/', token: 't0k', fetchImpl });
  assert.deepEqual(await store.incr(['k1', 'k2']), [4, 2]);
  assert.equal(calls[0].url, 'https://x.upstash.io/pipeline');
  assert.equal(calls[0].opts.headers.authorization, 'Bearer t0k');
  assert.deepEqual(calls[0].body, [['INCR', 'k1'], ['EXPIRE', 'k1', 172800], ['INCR', 'k2'], ['EXPIRE', 'k2', 172800]]);
});

test('storeFor: Upstash or Vercel KV names, else memory', () => {
  assert.equal(storeFor({}).kind, 'memory');
  assert.equal(storeFor({ UPSTASH_REDIS_REST_URL: 'https://x', UPSTASH_REDIS_REST_TOKEN: 't' }).kind, 'upstash');
  assert.equal(storeFor({ KV_REST_API_URL: 'https://x', KV_REST_API_TOKEN: 't' }).kind, 'upstash');
});
