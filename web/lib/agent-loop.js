// The always-on agent: a loop on the server that watches the feeds every few seconds and
// decides by itself when to speak and which scene to open, pushing to the page over SSE.
// It never speaks while a scene is open, while the agent talks, or while the user talks.
import { decide as defaultDecide, PROACTIVE } from './brain.js';
import { LINES } from '../public/js/lines.js';

export function createAgentLoop({ feeds, script = [], tickMs = 3000, decide = defaultDecide, log = console.log }) {
  const clients = new Set();
  let presence = { scene: 'home', talking: false, listening: false };
  let seen = feeds.versions();
  let handled = {};
  let retry = false;
  let pending = null; // push waiting for the page's ack
  let nextId = 1;
  let deciding = false;
  const timers = new Set();
  const scriptDone = new Set();

  const busy = () => presence.scene !== 'home' || presence.talking || presence.listening;

  function push(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(msg);
  }

  async function tick() {
    if (deciding || pending || !clients.size || busy()) return;
    const now = feeds.versions();
    const changed = Object.keys(now).filter((k) => now[k] !== seen[k]);
    if (!changed.length && !retry) return;
    deciding = true;
    try {
      const d = await decide(feeds.get(), changed, handled);
      seen = now;
      retry = false;
      log(`[agent] feeds changed: ${changed.join(', ') || '(retry)'} -> ${d.speak ? `speak, open ${d.scene}` : 'wait'} (${d.via}: ${d.reason})`);
      if (d.speak && PROACTIVE[d.scene] && !busy()) {
        pending = { id: nextId++, scene: d.scene, line: PROACTIVE[d.scene], say: LINES[PROACTIVE[d.scene]], reason: d.reason, via: d.via };
        push('proactive', pending);
      } else if (d.speak) {
        retry = true;
      }
    } finally {
      deciding = false;
    }
  }

  const interval = setInterval(() => tick().catch((err) => log(`[agent] tick failed: ${err.message}`)), tickMs);

  return {
    tick,
    addClient(res) {
      clients.add(res);
      res.write(`event: hello\ndata: ${JSON.stringify({ tickMs })}\n\n`);
      // A push that never got an ack (page reloaded) is offered again.
      if (pending) {
        pending = null;
        retry = true;
      }
    },
    removeClient: (res) => clients.delete(res),
    setPresence(next) {
      const prev = presence;
      presence = { scene: String(next.scene || 'home'), talking: Boolean(next.talking), listening: Boolean(next.listening) };
      // Demo script: a scene closing schedules the next feed event.
      if (presence.scene === 'home' && prev.scene !== 'home') {
        script.forEach((step, i) => {
          if (step.afterScene === prev.scene && !scriptDone.has(i)) {
            scriptDone.add(i);
            const t = setTimeout(() => { timers.delete(t); feeds.fire(step.event); log(`[script] ${step.event}`); }, step.delaySec * 1000);
            timers.add(t);
          }
        });
      }
    },
    ack({ id, ok }) {
      if (!pending || pending.id !== id) return;
      if (ok) handled[pending.scene] = true;
      else retry = true; // the page was busy; decide again when it is idle
      pending = null;
    },
    fire(event) {
      if (event === 'reset') {
        handled = {};
        pending = null;
        retry = false;
        scriptDone.clear();
        timers.forEach(clearTimeout);
        timers.clear();
      }
      const ok = feeds.fire(event);
      if (event === 'reset') seen = feeds.versions();
      return ok;
    },
    status: () => ({ presence, handled, pending, feeds: feeds.get(), clients: clients.size }),
    stop() {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    },
  };
}
