// Agent voice. Order: pre-rendered MP3 in /voice/ -> live ElevenLabs via /api/tts -> browser speechSynthesis.
// While the agent talks, the home waveform moves and one subtitle line shows, then fades.
import { T, MUTED } from './timing.js';

let manifest = new Set();
let liveTts = false;
let fadeTimer = null;
let current = null;

const $ = (id) => document.getElementById(id);

export async function initVoice() {
  try {
    const res = await fetch('/voice/manifest.json');
    if (res.ok) manifest = new Set(await res.json());
  } catch { /* no cached voice yet */ }
  try {
    liveTts = (await (await fetch('/api/health')).json()).tts;
  } catch { /* server without health route */ }
}

export function showSubtitle(text, holdMs = 2600) {
  const el = $('subtitle');
  clearTimeout(fadeTimer);
  el.textContent = text;
  el.classList.add('show');
  if (holdMs > 0) fadeTimer = setTimeout(() => el.classList.remove('show'), T(holdMs));
}

const guessMs = (text) => Math.min(9000, 1200 + text.length * 90);

function playAudio(src, text) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    current = audio;
    const guard = setTimeout(resolve, guessMs(text) + 4000);
    audio.onended = () => { clearTimeout(guard); resolve(); };
    audio.onerror = () => { clearTimeout(guard); reject(new Error(`audio failed: ${src}`)); };
    audio.play().catch((err) => { clearTimeout(guard); reject(err); });
  });
}

function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return setTimeout(resolve, guessMs(text));
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'th-TH';
    const thai = speechSynthesis.getVoices().find((v) => v.lang?.startsWith('th'));
    if (thai) u.voice = thai;
    const guard = setTimeout(resolve, guessMs(text) + 1500);
    u.onend = u.onerror = () => { clearTimeout(guard); resolve(); };
    speechSynthesis.speak(u);
  });
}

async function liveSpeak(text) {
  const res = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  try { await playAudio(url, text); } finally { URL.revokeObjectURL(url); }
}

export function stopSpeaking() {
  current?.pause();
  current = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// speak({ line: 'pay_done', text: 'สั่งเรียบร้อย...' }) -> resolves when the agent has finished talking.
export async function speak({ line = null, text = '' } = {}) {
  if (!text) return;
  stopSpeaking();
  document.body.classList.add('speaking');
  showSubtitle(text, 0);
  try {
    if (MUTED) await new Promise((r) => setTimeout(r, T(guessMs(text))));
    else if (line && manifest.has(line)) await playAudio(`/voice/${line}.mp3`, text);
    else if (liveTts) await liveSpeak(text);
    else await browserSpeak(text);
  } catch (err) {
    console.warn('[voice]', err.message, '-> browser voice');
    await browserSpeak(text);
  } finally {
    document.body.classList.remove('speaking');
    showSubtitle(text, 1800);
  }
}
