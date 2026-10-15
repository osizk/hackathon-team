// Agent OS: one home screen. The agent answers by voice and by growing a
// full-screen scene out of the home; when the task is done it folds back.
import { LINES } from './lines.js';
import { SCENE_DEFAULTS } from './data.js';
import { SCENES } from './scenes/index.js';
import { savedIndex } from './scenes/generated.js';
import { initVoice, speak, showSubtitle, interruptAll } from './voice.js';
import { logEvent } from './log.js';
import { apiFetch, passcodeGate } from './api.js';
import { createListener } from './stt.js';
import { connectAgent, fireFeed } from './agent-link.js';
import { live, checkLive, startLive, setMic, sendText, sendContext, sendFeed, silenceAgent, afterAgentSentence } from './live-agent.js';
import { T, TEST, wait } from './timing.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
let open = null; // { name, el, ctl }

if (TEST) document.body.classList.add('test');

function makeAgent(token) {
  const alive = () => open === token;
  return {
    alive,
    wait,
    lines: LINES,
    // Speak a fixed line by id, or free text.
    say: (lineOrText) => (alive() ? speak(LINES[lineOrText] ? { line: lineOrText, text: LINES[lineOrText] } : { text: lineOrText }) : Promise.resolve()),
    open: (name, data) => alive() && openScene(name, data),
    // Same as the user saying it (chips and buttons on generated pages).
    request: (text) => alive() && handleUserText(text),
    close: () => alive() && closeScene(),
  };
}

export function openScene(name, data = {}) {
  const mount = SCENES[name];
  if (!mount) return;
  const el = document.createElement('div');
  el.className = `scene scene-${name}`;
  el.dataset.scene = name;

  logEvent('scene_open', { name, swap: Boolean(open) });
  if (open) {
    // Scene to scene: the old one slides up, the new one rises under it.
    const old = open.el;
    old.classList.add('leaving');
    setTimeout(() => old.remove(), T(650));
    el.classList.add('entering');
  } else {
    stage.classList.add('open');
  }
  stage.appendChild(el);
  document.body.classList.add('scene-open');
  document.body.dataset.scene = name;

  const token = { name, el, ctl: {} };
  open = token;
  token.ctl = mount(el, { ...SCENE_DEFAULTS[name], ...data }, makeAgent(token)) || {};
}

export function closeScene() {
  if (!open) return;
  const { el, name } = open;
  // Tell the live agent, so it does not act on a page that is gone.
  if (live.connected) sendContext(`[screen] The ${name} page was closed. The agent home is showing.`);
  logEvent('scene_close', { name });
  open = null;
  stage.classList.remove('open');
  document.body.classList.remove('scene-open');
  document.body.dataset.scene = 'home';
  setTimeout(() => el.remove(), T(750));
}

// Speak first, then act: the agent starts its sentence about what it will do, and the scene
// grows while that sentence plays (never before it starts).
async function sayThenOpen({ line, text }, name, data) {
  let talking;
  await new Promise((started) => { talking = speak({ line, text, onStart: started }); });
  await wait(name === 'shopping' ? 1400 : 900);
  openScene(name, data);
  await talking;
}

// The agent speaks first (always-on feed event offline, or a presenter hotkey).
async function proactive(name) {
  if (open) closeScene();
  const line = { flight: 'flight_intro', training: 'train_intro', shopping: 'shop_intro', payment: 'pay_ask' }[name];
  if (!SCENES[name]) return;
  await sayThenOpen({ line, text: LINES[line] }, name);
}

async function routeText(text) {
  const res = await apiFetch('/api/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, context: open?.name || null, saved: savedIndex(), ...(open?.ctl.state?.() || {}) }),
  });
  if (!res.ok) throw new Error(`route ${res.status}`);
  return res.json();
}

// What the live agent's client tools may do to the screen.
const toolUi = {
  current: () => open,
  // The agent says what it will do first; the scene grows when that sentence ends.
  openScene: async (name, data) => {
    await afterAgentSentence();
    if (open) { closeScene(); await wait(750); }
    openScene(name, data);
  },
  closeScene: () => closeScene(),
  action: (name, extra = {}) => open?.ctl.onAction?.(name, extra, Promise.resolve()),
  nudgeAllow: () => open?.ctl.onAction?.('button-only'),
};

// What the user said (voice or fallback text) -> agent action.
export async function handleUserText(text) {
  text = text.trim();
  if (!text) return;
  // Live agent: it hears the text and answers through its tools.
  if (live.connected) {
    showSubtitle(`“${text}”`, 1200);
    sendText(text);
    return;
  }
  showSubtitle(`“${text}”`, 1200);
  document.body.classList.add('thinking');
  let res;
  const t0 = Date.now();
  try {
    res = await routeText(text);
    logEvent('route', { via: res.via, scene: res.scene || null, action: res.action || null, ms: Date.now() - t0 });
    if (res.say) logEvent('agent_reply', { text: res.say });
  } catch (err) {
    console.warn('[agent]', err.message);
    res = { scene: null, line: 'unsure', say: LINES.unsure };
  } finally {
    document.body.classList.remove('thinking');
  }
  document.body.dataset.via = res.via || '';

  if (res.action) {
    const talking = res.say ? speak({ line: res.line, text: res.say }) : Promise.resolve();
    open?.ctl.onAction?.(res.action, res, talking);
    await talking;
    return;
  }
  if (res.scene && SCENES[res.scene]) {
    if (open) closeScene();
    await sayThenOpen({ line: res.line, text: res.say }, res.scene, res.data);
    return;
  }
  if (res.say) await speak({ line: res.line, text: res.say });
}

// Hidden fallback input for the presenter: "/" or "`" shows it, Escape hides it.
function setupFallback() {
  const form = $('fallback');
  const input = $('fallbackInput');
  const show = () => { form.hidden = false; input.focus(); };
  const hide = () => { form.hidden = true; input.blur(); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    hide();
    logEvent('user_text', { text });
    if (live.available && !live.connected) await startLive(toolUi).catch(() => {});
    handleUserText(text);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  return { show };
}

// Presenter hotkeys (not while typing): / text input, f flight, t training, s shopping, p payment, h or Escape home.
// The always-on agent normally opens flight and training by itself; f and t are a last-resort fallback.
function setupHotkeys(fallback) {
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const actions = {
      '/': () => fallback.show(),
      '`': () => fallback.show(),
      f: () => proactive('flight'),
      t: () => proactive('training'),
      s: () => proactive('shopping'),
      p: () => proactive('payment'),
      h: () => closeScene(),
      Escape: () => closeScene(),
    };
    const run = actions[e.key];
    if (run) { e.preventDefault(); run(); }
  });
}

function setupMic(fallback) {
  const mic = $('mic');
  const listener = createListener({
    onInterim: (t) => showSubtitle(`“${t}”`, 0),
    onFinal: (t) => { logEvent('stt', { text: t, final: true }); handleUserText(t); },
    onError: (err) => { console.warn('[stt]', err); if (err === 'not-allowed') fallback.show(); },
  });
  // Live agent: holding the mic unmutes it; the agent does its own speech to text.
  // Offline: the browser's speech recognition (th-TH) listens while the mic is held.
  const start = async (e) => {
    e.preventDefault();
    // Stop every voice first, so the mic never hears the agent.
    interruptAll();
    silenceAgent();
    document.body.classList.add('listening');
    logEvent('mic', { state: 'down' });
    if (live.available) {
      try {
        await startLive(toolUi);
        silenceAgent(); // e.g. its greeting, if this press started the conversation
        if (document.body.classList.contains('listening')) setMic(true);
        return;
      } catch { /* fall back to browser listening */ }
    }
    if (listener) listener.start();
    else { document.body.classList.remove('listening'); fallback.show(); }
  };
  const stop = () => {
    if (!document.body.classList.contains('listening')) return;
    document.body.classList.remove('listening');
    logEvent('mic', { state: 'up' });
    if (live.connected) setMic(false);
    else listener?.stop();
  };
  mic.addEventListener('pointerdown', start);
  mic.addEventListener('pointerup', stop);
  mic.addEventListener('pointerleave', stop);
  mic.addEventListener('pointercancel', stop);
  window.addEventListener('keydown', (e) => { if (e.key === ' ' && !e.repeat && !e.target.closest('input')) start(e); });
  window.addEventListener('keyup', (e) => { if (e.key === ' ' && !e.target.closest('input')) stop(); });
}

function tickClock() {
  const d = new Date();
  $('clock').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// The mascot greets once, after the first tap (browsers block sound before a gesture).
// Always the saved greet line (same voice as the live agent, whose first message is empty), so
// there is exactly one greeting whether or not the live agent connects later.
function setupGreeting() {
  let greeted = false;
  const first = (e) => {
    if (greeted) return;
    greeted = true;
    document.body.classList.add('started');
    window.removeEventListener('pointerdown', first, true);
    window.removeEventListener('keydown', first, true);
    if (e.target.closest?.('#mic, input, form, .presenter') || (e.type === 'keydown' && e.key !== 'Enter')) return; // the user is about to talk or type
    logEvent('greet', { via: 'local' });
    speak({ line: 'greet', text: LINES.greet });
  };
  window.addEventListener('pointerdown', first, true);
  window.addEventListener('keydown', first, true);
}

async function boot() {
  await passcodeGate();
  tickClock();
  setInterval(tickClock, 15000);
  const fallback = setupFallback();
  setupHotkeys(fallback);
  setupMic(fallback);
  setupGreeting();
  logEvent('page_open', { test: TEST });
  await initVoice();
  document.body.dataset.scene = 'home';
  await checkLive();
  connectAgent({ onProactive: (scene) => proactive(scene), onFeed: (text) => live.connected && sendFeed(text) });
  document.body.dataset.ready = '1';
  // For tests and the presenter console.
  window.agentOS = { openScene, closeScene, handleUserText, proactive, fireFeed };
}

boot();
