// Link to the always-on agent on the server.
// - Tells the server what the page is doing (scene open, agent talking, user talking).
// - Listens on SSE; when the agent decides to speak first, opens that scene if the page is idle.
// - Hidden presenter control: tap the clock 3 times (or Shift+T / Shift+F / Shift+R) to fire a feed event.

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});

function presence() {
  const b = document.body;
  return { scene: b.dataset.scene || 'home', talking: b.classList.contains('speaking'), listening: b.classList.contains('listening') };
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
    post('/api/agent/presence', p);
  };
  new MutationObserver(report).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-scene'] });
  report();
}

export const fireFeed = (event) => post('/api/feeds/event', { event });

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

export function connectAgent({ onProactive }) {
  watchPresence();
  presenterPanel();
  if (!('EventSource' in window)) return;
  const es = new EventSource('/api/agent/stream');
  es.addEventListener('hello', () => { document.body.dataset.agent = 'on'; });
  es.addEventListener('proactive', (e) => {
    const msg = JSON.parse(e.data);
    // Never speak over an open scene or while anyone talks: tell the agent to try later.
    if (!idle()) return post('/api/agent/ack', { id: msg.id, ok: false });
    post('/api/agent/ack', { id: msg.id, ok: true });
    console.info(`[agent] speaks first: ${msg.scene} (${msg.via}: ${msg.reason})`);
    onProactive(msg.scene);
  });
  es.onerror = () => { document.body.dataset.agent = 'reconnecting'; };
}
