// The always-on agent: a loop in the page that watches the feeds every few seconds and
// decides by itself when to speak and which scene to open. (It runs in the browser, so the
// app needs no long-running server: it deploys as static files plus small functions.)
// It never speaks while a scene is open, while the agent talks, or while the user talks.
// Offline, simple rules decide and the page opens the scene. When the page runs the live
// ElevenLabs agent, feed changes go into the conversation as contextual updates instead,
// and the agent decides whether to speak.
import { decide as defaultDecide, PROACTIVE } from './brain.js';
import { LINES } from './lines.js';

// emit(event, data): 'proactive' { id, scene, line, say } offline, or 'feed' { changed, text } when live.
// The page answers a 'proactive' with ack({ id, ok }).
export function createAgentLoop({ feeds, script = [], tickMs = 3000, decide = defaultDecide, log = console.log, onEvent = () => {}, emit = () => {} }) {
  let presence = { scene: 'home', talking: false, listening: false, live: false };
  let seen = feeds.versions();
  let handled = {};
  let retry = false;
  let pending = null; // push waiting for the page's ack
  let nextId = 1;
  let deciding = false;
  const timers = new Set();
  const scriptDone = new Set();

  const busy = () => presence.scene !== 'home' || presence.talking || presence.listening;

  const push = (event, data) => emit(event, data);

  async function tick() {
    if (deciding || pending || busy()) return;
    const now = feeds.versions();
    const changed = Object.keys(now).filter((k) => now[k] !== seen[k]);
    if (!changed.length && !retry) return;
    if (presence.live) {
      seen = now;
      retry = false;
      const text = describeChanges(feeds.get(), changed);
      log(`[agent] feeds changed: ${changed.join(', ')} -> contextual update to the live agent`);
      push('feed', { changed, text });
      onEvent('push', { kind: 'feed', changed, presence });
      return;
    }
    deciding = true;
    try {
      const d = await decide(feeds.get(), changed, handled);
      seen = now;
      retry = false;
      log(`[agent] feeds changed: ${changed.join(', ') || '(retry)'} -> ${d.speak ? `speak, open ${d.scene}` : 'wait'} (${d.via}: ${d.reason})`);
      onEvent('decision', { changed, speak: d.speak, scene: d.scene, via: d.via, reason: d.reason });
      if (d.speak && PROACTIVE[d.scene] && !busy()) {
        pending = { id: nextId++, scene: d.scene, line: PROACTIVE[d.scene], say: LINES[PROACTIVE[d.scene]], reason: d.reason, via: d.via };
        push('proactive', pending);
        onEvent('push', { kind: 'proactive', scene: d.scene, presence });
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
    setPresence(next) {
      const prev = presence;
      presence = { scene: String(next.scene || 'home'), talking: Boolean(next.talking), listening: Boolean(next.listening), live: Boolean(next.live) };
      // Demo script: a scene closing schedules the next feed event.
      if (presence.scene === 'home' && prev.scene !== 'home') {
        script.forEach((step, i) => {
          if (step.afterScene === prev.scene && !scriptDone.has(i)) {
            scriptDone.add(i);
            const t = setTimeout(() => { timers.delete(t); feeds.fire(step.event); log(`[script] ${step.event}`); onEvent('feed_event', { event: step.event, by: 'script' }); }, step.delaySec * 1000);
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
      onEvent('feed_event', { event, by: 'presenter' });
      if (event === 'reset') seen = feeds.versions();
      return ok;
    },
    status: () => ({ presence, handled, pending, feeds: feeds.get() }),
    stop() {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    },
  };
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const toHhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Why a flight change matters: the new landing time against the user's calendar that day.
export function flightReason(feeds) {
  const f = feeds.flight;
  const lands = toHhmm(toMin(f.arrive) + f.delayMinutes);
  const meeting = feeds.calendar.events.find((e) => e.day === f.day);
  const clash = meeting && toMin(lands) > toMin(meeting.time);
  return {
    lands,
    clash: Boolean(clash),
    why: clash
      ? `it now lands at ${lands} instead of ${f.arrive}, after the ${meeting.time} ${meeting.title} (it clashes)`
      : `it now lands at ${lands}; nothing on the calendar clashes`,
  };
}

// One plain sentence per changed feed for the live agent, each with its concrete reason
// ("Why it matters: ..."), so the agent can say why it speaks first, or why it stays quiet.
export function describeChanges(feeds, changed) {
  const say = {
    email: () => {
      const m = feeds.email.messages.at(-1);
      const why = m.kind === 'shopping' ? 'it is a shopping list the user may want bought' : `it is only a ${m.kind} email; nothing needs the user now`;
      return `New email from ${m.from}: "${m.subject}" (${m.kind}). Why it matters: ${why}.`;
    },
    calendar: () => `Calendar: ${feeds.calendar.events.map((e) => `${e.day} ${e.time} ${e.title}`).join('; ')}. Why it matters: the schedule changed.`,
    health: () =>
      feeds.health.synced
        ? `Sleep data synced: sleep score ${feeds.health.sleepScore}.${feeds.health.raceOpen ? ` Sign-up for the ${feeds.health.race} is open.` : ''} ` +
          `Why it matters: ${feeds.health.raceOpen ? `sleep score ${feeds.health.sleepScore} means the user is rested enough to train, and the ${feeds.health.race} sign-up just opened` : 'only a sleep score; nothing to act on'}.`
        : 'Health data reset.',
    flight: () => {
      const f = feeds.flight;
      if (f.status !== 'delayed') return `Flight ${f.code} is on time.`;
      const { why, clash } = flightReason(feeds);
      return (
        `Flight ${f.code} ${f.day} at ${f.depart} (${f.from} to ${f.to}) is delayed ${f.delayMinutes} minutes${f.cause ? ` (${f.cause})` : ''}. ` +
        `Why it matters: ${why}.${clash && f.faster ? ` A faster flight, ${f.faster.code}, lands at ${f.faster.arrive} and has a seat.` : ''}`
      );
    },
  };
  return `[feed update] ${changed.map((k) => say[k]?.() || `${k} changed.`).join(' ')}`.trim();
}
