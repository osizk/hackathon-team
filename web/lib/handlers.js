// What the server does, shared by the local server (server.js) and the Vercel functions (api/).
// Every route that can call ElevenLabs checks the passcode first (only when AGENT_OS_PASSCODE is set,
// i.e. on the deployed site; locally there is none).
import { timingSafeEqual } from 'node:crypto';
import { route } from './router.js';
import { elevenTts, ttsReady } from './tts.js';
import { liveReady, signedUrl } from './live-session.js';
import { createImageService } from './images.js';
import { createRunLog, createConsoleLog } from './runlog.js';

export const PASSCODE_HEADER = 'x-agent-os-passcode';

export function passcodeOk(env, given) {
  const want = env.AGENT_OS_PASSCODE;
  if (!want) return true;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(want));
  return a.length === b.length && timingSafeEqual(a, b);
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// opts: { env, logDir (local JSONL) | console log, imagesDir, inlineImages (Vercel: no disk cache) }
export function createHandlers({ env = process.env, logDir = null, imagesDir, inlineImages = false } = {}) {
  const runLog = logDir ? createRunLog(logDir) : createConsoleLog();
  const images = createImageService({ env, dir: imagesDir, inline: inlineImages });
  const guard = (headers) => {
    if (!passcodeOk(env, headers[PASSCODE_HEADER])) throw new HttpError(401, 'passcode required');
  };

  return {
    runLog,
    images,
    health: (headers = {}) => ({
      brain: liveReady(env) ? 'elevenlabs-agent' : 'keywords',
      tts: ttsReady(env),
      passcode: Boolean(env.AGENT_OS_PASSCODE),
      authorized: passcodeOk(env, headers[PASSCODE_HEADER]),
    }),
    async session(headers) {
      guard(headers);
      if (!liveReady(env)) return { live: false, reason: 'no ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID' };
      try {
        return { live: true, signedUrl: await signedUrl(env) };
      } catch (err) {
        runLog.server('error', { where: 'signed url', message: err.message });
        return { live: false, reason: err.message };
      }
    },
    route: async ({ text, context, spec, stage, saved } = {}) => route(text, context || null, { spec, stage, saved }),
    async tts(headers, { text } = {}) {
      guard(headers);
      if (!ttsReady(env)) throw new HttpError(503, 'no ElevenLabs key');
      return elevenTts(String(text).slice(0, 400), env);
    },
    async image(headers, { prompt, scene } = {}) {
      guard(headers);
      const out = await images.get(prompt, String(scene || 'default'));
      if (out.error && !out.quiet) runLog.server('error', { where: 'image', message: out.error });
      return out;
    },
    async log(headers, { events } = {}) {
      guard(headers);
      return { written: runLog.browser(events) };
    },
  };
}
