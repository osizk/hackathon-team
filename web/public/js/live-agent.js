// The live brain: an ElevenLabs agent (Thai voice and speech to text inside the agent).
// The browser joins with the official JS SDK through a signed URL from our server, so the key
// never reaches the page. The agent changes the UI only through client tools (agent-tools.js).
// If anything fails, the app keeps its offline brain: keyword router, cached MP3s, canned pages.
import { createToolHandlers } from './agent-tools.js';
import { showSubtitle } from './voice.js';

// @elevenlabs/client, pinned. jsDelivr's +esm build is one self-contained ES module.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.26.0/+esm';

let conversation = null;
let starting = null;
export const live = { available: false, connected: false };

export const stripTags = (text) => String(text).replace(/\[[^\]]{1,30}\]\s*/g, '').trim();

const setBrain = (brain) => { document.body.dataset.brain = brain; };

export async function checkLive() {
  try {
    live.available = (await (await fetch('/api/health')).json()).brain === 'elevenlabs-agent';
  } catch {
    live.available = false;
  }
  setBrain(live.available ? 'agent-ready' : 'keywords');
  return live.available;
}

// Wrap each tool so the agent always gets a text result, even if a handler throws.
function wrapTools(handlers) {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, fn]) => [
      name,
      async (params) => {
        try {
          const out = await fn(params || {});
          console.info(`[agent tool] ${name}`, params, '->', out);
          return String(out);
        } catch (err) {
          return `error: ${err.message}`;
        }
      },
    ]),
  );
}

// Start the conversation on a user gesture (the mic needs one).
export function startLive(ui) {
  if (conversation) return Promise.resolve(conversation);
  if (!live.available) return Promise.reject(new Error('live agent not configured'));
  if (starting) return starting;
  starting = (async () => {
    const session = await (await fetch('/api/agent/session')).json();
    if (!session.live) throw new Error(session.reason || 'no live session');
    const { Conversation } = await import(SDK_URL);
    await navigator.mediaDevices.getUserMedia({ audio: true });
    conversation = await Conversation.startSession({
      signedUrl: session.signedUrl,
      connectionType: 'websocket',
      clientTools: wrapTools(createToolHandlers(ui)),
      onConnect: () => { live.connected = true; setBrain('agent'); },
      onDisconnect: () => { live.connected = false; conversation = null; starting = null; setBrain(live.available ? 'agent-ready' : 'keywords'); },
      onError: (message) => console.warn('[agent]', message),
      onMessage: ({ source, message }) => {
        if (!message) return;
        // v3 voices take audio tags like [happy]; they are for the voice, not the subtitle.
        if (source === 'ai') showSubtitle(stripTags(message), 3200);
        else showSubtitle(`“${message}”`, 1400);
      },
      onModeChange: (mode) => document.body.classList.toggle('speaking', (mode?.mode ?? mode) === 'speaking'),
    });
    conversation.setMicMuted(true);
    live.connected = true;
    setBrain('agent');
    return conversation;
  })().catch((err) => {
    console.warn('[agent] live agent unavailable, offline brain stays on:', err.message);
    starting = null;
    live.available = false;
    setBrain('keywords');
    throw err;
  });
  return starting;
}

export const setMic = (on) => conversation?.setMicMuted(!on);
export const sendText = (text) => conversation?.sendUserMessage(text);
export const sendContext = (text) => conversation?.sendContextualUpdate(text);
// A feed change: a contextual update alone does not give the agent a turn, so this sends it as a
// marked message; the agent then speaks first or calls skip_turn.
export const sendFeed = (text) => conversation?.sendUserMessage(`${text} (This is a feed update, not the user speaking.)`);
