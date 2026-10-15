// The live brain: an ElevenLabs agent (Thai voice and speech to text inside the agent).
// The browser joins with the official JS SDK through a signed URL from our server, so the key
// never reaches the page. The agent changes the UI only through client tools (agent-tools.js).
// One voice: while connected, every app line is said by the agent (voice.js setLiveVoice).
// If anything fails, the app keeps its offline brain: keyword router, cached MP3s, canned pages.
import { createToolHandlers } from './agent-tools.js';
import { showSubtitle, setLiveVoice } from './voice.js';
import { logEvent } from './log.js';
import { apiFetch, goOffline, onOffline } from './api.js';

// @elevenlabs/client, pinned. jsDelivr's +esm build is one self-contained ES module.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.26.0/+esm';
// The SDK asks the mic for these too; we check the browser really applies them and log it.
const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

let conversation = null;
let starting = null;
let mode = 'listening';
let modeWaiters = [];
let silenced = false;
export const live = { available: false, connected: false, search: false };

const setBrain = (brain) => { document.body.dataset.brain = brain; };
export const stripTags = (text) => String(text).replace(/\[[^\]]{1,30}\]\s*/g, '').trim();

export async function checkLive() {
  try {
    const health = await (await apiFetch('/api/health')).json();
    live.available = health.brain === 'elevenlabs-agent' && !health.offline;
    live.search = Boolean(health.search);
    if (health.offline) goOffline(health.offline);
  } catch {
    live.available = false;
  }
  setBrain(live.available ? 'agent-ready' : 'keywords');
  return live.available;
}

// ElevenLabs closes the conversation with a quota message when the credit runs out.
const OUT_OF_CREDIT = /quota|credit|insufficient/i;

// Limit reached or credit gone: end the live conversation; the offline brain takes over.
onOffline((reason) => {
  logEvent('offline', { reason });
  live.available = false;
  const ending = conversation;
  conversation = null;
  starting = null;
  live.connected = false;
  setLiveVoice(null);
  setBrain('keywords');
  ending?.endSession?.().catch?.(() => {});
});

function setMode(next) {
  if (next === mode) return;
  mode = next;
  const speaking = mode === 'speaking';
  document.body.classList.toggle('speaking', speaking);
  logEvent(speaking ? 'audio_start' : 'audio_end', { source: 'agent', id: 'agent' });
  // The user is holding the mic: the agent must not be heard (it would talk into the mic).
  if (speaking && document.body.classList.contains('listening')) silenceAgent();
  if (!speaking && silenced) {
    // The interrupted turn is over: the next turn may be heard again.
    silenced = false;
    conversation?.setVolume({ volume: 1 });
  }
  modeWaiters = modeWaiters.filter((w) => !w(mode));
}

// Resolves when the agent reaches `want` mode, or after `ms`.
const waitMode = (want, ms) =>
  new Promise((resolve) => {
    if (mode === want) return resolve(true);
    const timer = setTimeout(() => resolve(false), ms);
    modeWaiters.push((m) => (m === want ? (clearTimeout(timer), resolve(true), true) : false));
  });

// Let the agent finish the sentence it is saying before a scene grows (it speaks first, then acts).
export async function afterAgentSentence(maxMs = 4000) {
  if (!live.connected) return;
  if (mode !== 'speaking') await waitMode('speaking', 600);
  if (mode === 'speaking') await waitMode('listening', maxMs);
}

// An app line said by the agent's own voice (one voice, never two).
async function sayThroughAgent(text, line, onStart) {
  conversation?.sendUserMessage(`[scene event${line ? `: ${line}` : ''}] Say this to the user in one short sentence, then stop: "${text}"`);
  const started = await waitMode('speaking', 6000);
  onStart?.();
  if (started) await waitMode('listening', 15000);
}

// Wrap each tool so the agent always gets a text result, even if a handler throws.
function wrapTools(handlers) {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, fn]) => [
      name,
      async (params) => {
        let out;
        try {
          out = String(await fn(params || {}));
        } catch (err) {
          out = `error: ${err.message}`;
        }
        console.info(`[agent tool] ${name}`, params, '->', out);
        logEvent('tool', { name, params, result: out });
        return out;
      },
    ]),
  );
}

async function checkMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC });
  const settings = stream.getAudioTracks?.()[0]?.getSettings?.() || {};
  stream.getTracks?.().forEach((t) => t.stop());
  const applied = Object.fromEntries(Object.keys(MIC).map((k) => [k, settings[k] ?? 'unsupported']));
  logEvent('mic', { state: 'settings', ...applied });
  console.info('[voice] mic settings', applied);
  return applied;
}

// Start the conversation on a user gesture (the mic needs one).
export function startLive(ui) {
  if (conversation) return Promise.resolve(conversation);
  if (!live.available) return Promise.reject(new Error('live agent not configured'));
  if (starting) return starting;
  starting = (async () => {
    const session = await (await apiFetch('/api/agent/session')).json();
    if (session.offline) goOffline(session.offline);
    if (!session.live) throw new Error(session.reason || 'no live session');
    const { Conversation } = await import(SDK_URL);
    await checkMic();
    conversation = await Conversation.startSession({
      signedUrl: session.signedUrl,
      connectionType: 'websocket',
      clientTools: wrapTools(createToolHandlers(ui)),
      onConnect: () => { live.connected = true; setBrain('agent'); },
      onDisconnect: (details) => {
        if (OUT_OF_CREDIT.test(`${details?.reason ?? ''} ${details?.message ?? ''}`)) goOffline('credit');
        live.connected = false;
        conversation = null;
        starting = null;
        setLiveVoice(null);
        setMode('listening');
        setBrain(live.available ? 'agent-ready' : 'keywords');
      },
      onError: (message) => {
        console.warn('[agent]', message);
        logEvent('error', { where: 'agent', message: String(message).slice(0, 300) });
        if (OUT_OF_CREDIT.test(String(message))) goOffline('credit');
      },
      onMessage: ({ source, message }) => {
        if (!message) return;
        if (source === 'ai') {
          // v3 voices take audio tags like [happy]; they are for the voice, not the subtitle.
          showSubtitle(stripTags(message), 3200);
          logEvent('agent_reply', { text: stripTags(message) });
        } else {
          showSubtitle(`“${message}”`, 1400);
          logEvent('stt', { text: message, final: true });
        }
      },
      onModeChange: (m) => setMode(m?.mode ?? m),
    });
    conversation.setMicMuted(true);
    live.connected = true;
    setBrain('agent');
    setLiveVoice(sayThroughAgent);
    return conversation;
  })().catch((err) => {
    console.warn('[agent] live agent unavailable, offline brain stays on:', err.message);
    logEvent('error', { where: 'live start', message: err.message });
    starting = null;
    live.available = false;
    setBrain('keywords');
    throw err;
  });
  return starting;
}

// Hold-to-talk pressed: the agent goes silent at once (volume 0), then the mic opens.
// The user's speech interrupts the agent's turn on the server; volume comes back on the next turn.
export function silenceAgent() {
  if (!conversation || mode !== 'speaking' || silenced) return;
  silenced = true;
  conversation.setVolume({ volume: 0 });
  conversation.sendUserActivity?.();
}

export const setMic = (on) => conversation?.setMicMuted(!on);
export const sendText = (text) => conversation?.sendUserMessage(text);
export const sendContext = (text) => conversation?.sendContextualUpdate(text);
// A feed change: a contextual update alone does not give the agent a turn, so this sends it as a
// marked message; the agent then speaks first or calls skip_turn.
export const sendFeed = (text) => conversation?.sendUserMessage(`${text} (This is a feed update, not the user speaking.)`);
