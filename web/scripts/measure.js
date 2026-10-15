// Speed check in Chrome: how fast the page paints, how fast the live agent first speaks, and how
// fast it answers once warm. Same numbers before and after a speed change.
//   node scripts/measure.js [--base http://localhost:5173] [--runs 1] [--offline] [--slow]
// Live runs join the real ElevenLabs agent: each run uses one session of the daily limit.
// --offline only measures the page load (no session). --slow: a phone on 4G (150 ms round trip,
// 9 Mbit/s down), so a local server shows what the network costs.
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('--base', 'http://localhost:5173');
const RUNS = Number(arg('--runs', 1));
const OFFLINE = process.argv.includes('--offline');
const SLOW = process.argv.includes('--slow');
// A turn that opens a prebuilt scene (first suggestion), then two short warm turns.
const WARM = ['สวัสดี วันนี้วันอะไร', 'ขอบคุณนะ'];

// Marks the moment the page changes state: brain, scene, speaking.
function marks() {
  window.__marks = [];
  const mark = (k) => window.__marks.push({ k, t: performance.now() });
  let last = {};
  // Polled (10 ms), since a MutationObserver set up this early misses the parsed body.
  setInterval(() => {
    const b = document.body;
    if (!b) return;
    const now = { brain: b.dataset.brain, scene: b.dataset.scene, speaking: b.classList.contains('speaking'), ready: b.dataset.ready };
    for (const k of Object.keys(now)) if (now[k] !== last[k]) mark(`${k}:${now[k]}`);
    last = now;
  }, 10);
}

const ms = (x) => (x == null ? '-' : `${Math.round(x)} ms`);
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

async function oneRun(browser) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  if (SLOW) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 });
  }
  await page.addInitScript(marks);
  await page.goto(`${BASE}/?script=off`);
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 20000 });
  await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length, null, { timeout: 5000 }).catch(() => {});
  const load = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
    const ready = window.__marks.find((m) => m.k === 'ready:1')?.t;
    return { ttfb: nav.responseStart, fcp, dcl: nav.domContentLoadedEventEnd, ready, brain: document.body.dataset.brain };
  });
  const out = { load };
  if (OFFLINE || load.brain !== 'agent-ready') { await ctx.close(); return out; }

  // Cold: tap the first suggestion, as a judge would. Clock starts at the tap.
  // A real tap (pointerdown, then click); the clock starts at pointerdown, so nothing is fetched ahead.
  await page.evaluate(() => window.addEventListener('pointerdown', () => { window.__tap ??= performance.now(); }, { capture: true }));
  await page.click('#suggest button');
  const tap = await page.evaluate(() => window.__tap);
  const after = (k, from) => page.waitForFunction(([k, from]) => window.__marks.find((m) => m.k.startsWith(k) && m.t > from)?.t, [k, from], { timeout: 40000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
  const connected = await after('brain:agent', tap);
  const spoke = await after('speaking:true', tap);
  const scene = await after('scene:shopping', tap) ?? await after('scene:payment', tap);
  const res = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((r) => /agent\/session|elevenlabs\/client|livekit-client/.test(r.name))
    .map((r) => ({ name: r.name.replace(/^.*\/(npm\/|api\/)/, '$1').slice(0, 40), start: r.startTime, dur: r.duration })));
  out.cold = { connect: connected && connected - tap, voice: spoke && spoke - tap, scene: scene && scene - tap, res: res.map((r) => ({ ...r, start: r.start - tap })) };

  // Warm turns: home, wait for quiet, then type; time from Enter to the agent's voice.
  out.warm = [];
  await page.keyboard.press('Escape');
  for (const text of WARM) {
    await page.waitForTimeout(2500);
    await page.waitForFunction(() => !document.body.classList.contains('speaking'), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.fill('#fallbackInput', text);
    const t = await page.evaluate(() => performance.now());
    await page.keyboard.press('Enter');
    const s = await after('speaking:true', t);
    out.warm.push(s && s - t);
  }
  await ctx.close();
  return out;
}

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const runs = [];
for (let i = 0; i < RUNS; i++) {
  const r = await oneRun(browser);
  runs.push(r);
  console.log(`run ${i + 1}: ttfb ${ms(r.load.ttfb)}, first paint ${ms(r.load.fcp)}, ready ${ms(r.load.ready)} (brain ${r.load.brain})`);
  if (r.cold) {
    console.log(`  cold tap -> connected ${ms(r.cold.connect)}, -> first voice ${ms(r.cold.voice)}, -> scene ${ms(r.cold.scene)}`);
    for (const x of r.cold.res) console.log(`    ${x.name.padEnd(40)} starts +${ms(x.start)}, takes ${ms(x.dur)}`);
    console.log(`  warm reply (Enter -> voice): ${r.warm.map(ms).join(', ')}`);
  }
}
if (RUNS > 1) {
  console.log(`median: first paint ${ms(median(runs.map((r) => r.load.fcp)))}, ready ${ms(median(runs.map((r) => r.load.ready)))}`);
  if (runs[0].cold) {
    console.log(`median cold: connected ${ms(median(runs.map((r) => r.cold?.connect)))}, first voice ${ms(median(runs.map((r) => r.cold?.voice)))}, scene ${ms(median(runs.map((r) => r.cold?.scene)))}`);
    console.log(`median warm reply: ${ms(median(runs.flatMap((r) => r.warm || [])))}`);
  }
}
await browser.close();
