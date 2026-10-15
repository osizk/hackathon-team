// The always-on agent, running in the page (no long-running server needed, so it deploys on Vercel).
// - Watches what the page is doing (scene open, agent talking, user talking) for the never-speak-over guard.
// - Offline: when the rules decide to speak first, opens that scene if the page is idle.
// - Live agent: feed changes go into the conversation; the agent decides whether to speak.
// - Presenter control, only with ?presenter=1: tap the clock 3 times (or Shift+T / Shift+F / Shift+R) to fire a feed event.
// URL options: ?script=off stops the demo script; ?tick=<ms> changes how often it looks (default 3000).
import { createFeeds, DEMO_SCRIPT } from './feeds.js';
import { createAgentLoop } from './agent-loop.js';
import { logEvent } from './log.js';
import { TEST, PRESENTER } from './timing.js';

const params = new URLSearchParams(location.search);
let loop = null;

function presence() {
  const b = document.body;
  return {
    scene: b.dataset.scene || 'home',
    talking: b.classList.contains('speaking'),
    listening: b.classList.contains('listening'),
    live: b.dataset.brain === 'agent', // feed changes then go to the live agent
  };
}
const idle = () => {
  const p = presence();
  return p.scene === 'home' && !p.talking && !p.listening;
};

function watchPresence() {
  let last = '';
  const report = () => {
    const p = presence();
    const key = JSON.stringify(p);
    if (key === last) return;
    last = key;
    loop.setPresence(p);
  };
  new MutationObserver(report).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-scene', 'data-brain'] });
  report();
}

export function fireFeed(event) {
  return loop?.fire(event) ?? false;
}

function presenterPanel() {
  const panel = document.createElement('div');
  panel.className = 'presenter';
  panel.hidden = true;
  panel.dataset.testid = 'presenter';
  const events = [
    ['sleep-synced', 'Sleep synced (training)'],
    ['flight-delayed', 'Flight delayed'],
    ['email-shopping', 'New email'],
    ['reset', 'Reset feeds'],
  ];
  for (const [event, label] of events) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.event = event;
    btn.addEventListener('click', () => { fireFeed(event); panel.hidden = true; });
    panel.append(btn);
  }
  document.getElementById('phone').append(panel);

  let taps = [];
  document.getElementById('clock').addEventListener('click', () => {
    const now = Date.now();
    taps = [...taps.filter((t) => now - t < 800), now];
    if (taps.length >= 3) { panel.hidden = !panel.hidden; taps = []; }
  });
  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || e.target.closest('input')) return;
    const event = { T: 'sleep-synced', F: 'flight-delayed', R: 'reset' }[e.key];
    if (event) { e.preventDefault(); fireFeed(event); }
  });
}

export function connectAgent({ onProactive, onFeed }) {
  const scriptOff = TEST || params.get('script') === 'off';
  loop = createAgentLoop({
    feeds: createFeeds(),
    script: scriptOff ? [] : DEMO_SCRIPT,
    tickMs: Number(params.get('tick')) || (TEST ? 300 : 3000),
    log: (msg) => console.info(msg),
    onEvent: (type, data) => logEvent(type, data),
    emit: (event, data) => {
      if (event === 'feed') return onFeed?.(data.text);
      if (event !== 'proactive') return;
      // Never speak over an open scene or while anyone talks: tell the loop to try later.
      if (!idle()) return loop.ack({ id: data.id, ok: false });
      loop.ack({ id: data.id, ok: true });
      console.info(`[agent] speaks first: ${data.scene} (${data.via}: ${data.reason})`);
      onProactive(data.scene);
    },
  });
  watchPresence();
  if (PRESENTER) presenterPanel();
  document.body.dataset.agent = 'on';
  return loop;
}
