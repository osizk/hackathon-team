// Agent OS: one home screen. The agent answers by voice and by growing a
// full-screen scene out of the home; when the task is done it folds back.
import { LINES } from './lines.js';
import { SCENE_DEFAULTS } from './data.js';
import { SCENES } from './scenes/index.js';
import { initVoice, speak, showSubtitle } from './voice.js';
import { createListener } from './stt.js';
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
    close: () => alive() && closeScene(),
  };
}

export function openScene(name, data = {}) {
  const mount = SCENES[name];
  if (!mount) return;
  const el = document.createElement('div');
  el.className = `scene scene-${name}`;
  el.dataset.scene = name;

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
  const { el } = open;
  open = null;
  stage.classList.remove('open');
  document.body.classList.remove('scene-open');
  document.body.dataset.scene = 'home';
  setTimeout(() => el.remove(), T(750));
}

// The agent speaks first (presenter hotkey): say the intro and grow the scene.
async function proactive(name) {
  if (open) closeScene();
  const line = { flight: 'flight_intro', training: 'train_intro', shopping: 'shop_intro', payment: 'pay_ask' }[name];
  if (!SCENES[name]) return;
  const talking = speak({ line, text: LINES[line] });
  await wait(name === 'shopping' ? 1400 : 900);
  openScene(name);
  await talking;
}

async function routeText(text) {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, context: open?.name || null }),
  });
  if (!res.ok) throw new Error(`route ${res.status}`);
  return res.json();
}

// What the user said (voice or fallback text) -> agent action.
export async function handleUserText(text) {
  text = text.trim();
  if (!text) return;
  showSubtitle(`“${text}”`, 1200);
  document.body.classList.add('thinking');
  let res;
  try {
    res = await routeText(text);
  } catch (err) {
    console.warn('[agent]', err.message);
    res = { scene: null, line: 'unsure', say: LINES.unsure };
  } finally {
    document.body.classList.remove('thinking');
  }
  document.body.dataset.via = res.via || '';

  if (res.action) {
    open?.ctl.onAction?.(res.action, res);
    if (res.say) await speak({ line: res.line, text: res.say });
    return;
  }
  if (res.scene && SCENES[res.scene]) {
    if (open) closeScene();
    const talking = speak({ line: res.line, text: res.say });
    await wait(res.scene === 'shopping' ? 1400 : 700);
    openScene(res.scene, res.data);
    await talking;
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    hide();
    handleUserText(text);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  return { show };
}

// Presenter hotkeys (not while typing): / text input, f flight, t training, s shopping, p payment, h or Escape home.
function setupHotkeys(fallback) {
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
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
    onFinal: (t) => handleUserText(t),
    onError: (err) => { console.warn('[stt]', err); if (err === 'not-allowed') fallback.show(); },
  });
  if (!listener) {
    mic.addEventListener('click', () => fallback.show());
    return;
  }
  const start = (e) => { e.preventDefault(); document.body.classList.add('listening'); listener.start(); };
  const stop = () => { if (!document.body.classList.contains('listening')) return; document.body.classList.remove('listening'); listener.stop(); };
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

async function boot() {
  tickClock();
  setInterval(tickClock, 15000);
  const fallback = setupFallback();
  setupHotkeys(fallback);
  setupMic(fallback);
  await initVoice();
  document.body.dataset.scene = 'home';
  document.body.dataset.ready = '1';
  // For tests and the presenter console.
  window.agentOS = { openScene, closeScene, handleUserText, proactive };
}

boot();
