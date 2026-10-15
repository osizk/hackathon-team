// Browser half of the run log: events are buffered and posted to /api/log (server appends to the JSONL).
let buffer = [];
let timer = null;
const session = Math.random().toString(36).slice(2, 8);

function flush() {
  timer = null;
  if (!buffer.length) return;
  const body = JSON.stringify({ events: buffer });
  buffer = [];
  if (navigator.sendBeacon && document.visibilityState === 'hidden') navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
  else fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

const keep = new URLSearchParams(location.search).has('test');
if (keep) window.__runlog = []; // tests read the same events the run log gets

export function logEvent(type, data = {}) {
  const event = { t: Date.now(), type, session, ...data };
  if (keep) window.__runlog.push(event);
  buffer.push(event);
  if (!timer) timer = setTimeout(flush, 400);
}

window.addEventListener('pagehide', flush);
window.addEventListener('error', (e) => logEvent('error', { where: 'window', message: String(e.message).slice(0, 300) }));
window.addEventListener('unhandledrejection', (e) => logEvent('error', { where: 'promise', message: String(e.reason?.message || e.reason).slice(0, 300) }));
