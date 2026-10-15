// What the server does, shared by the local server (server.js) and the Vercel functions (api/).
// Every route that can spend ElevenLabs or Tavily credit checks the daily usage limit first (lib/usage.js).
// When the limit is reached, or ElevenLabs says the credit ran out, the answer carries
// `offline: 'limit' | 'credit'` and the page switches to its offline brain by itself.
import { route } from './router.js';
import { elevenTts, ttsReady } from './tts.js';
import { liveReady, signedUrl, today } from './live-session.js';
import { createImageService } from './images.js';
import { createRunLog, createConsoleLog } from './runlog.js';
import { createUsage, LimitError } from './usage.js';
import { searchReady, tavilySearch } from './search.js';

export class HttpError extends Error {
  // extra: more fields for the JSON error body, e.g. { offline: 'limit' }
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const errorBody = (err) => ({ error: err.message, ...(err.extra || {}) });

// opts: { env, logDir (local JSONL) | console log, imagesDir, inlineImages (Vercel: no disk cache), usage }
export function createHandlers({ env = process.env, logDir = null, imagesDir, inlineImages = false, usage = createUsage({ env }) } = {}) {
  const runLog = logDir ? createRunLog(logDir) : createConsoleLog();
  const images = createImageService({ env, dir: imagesDir, inline: inlineImages });
  // Counts one use; over the limit -> 429 with offline: 'limit'.
  const take = async (kind, headers) => {
    try {
      await usage.take(kind, headers);
    } catch (err) {
      if (!(err instanceof LimitError)) throw err;
      runLog.server('limit', { kind, scope: err.scope });
      throw new HttpError(429, err.message, { offline: 'limit' });
    }
  };
  const outOfCredit = (err, where) => {
    runLog.server('error', { where, message: err.message, outOfCredit: true });
    return new HttpError(429, 'ElevenLabs credit ran out', { offline: 'credit' });
  };

  return {
    runLog,
    images,
    usage,
    async health() {
      return {
        brain: liveReady(env) ? 'elevenlabs-agent' : 'keywords',
        tts: ttsReady(env),
        search: searchReady(env),
        offline: liveReady(env) && (await usage.siteFull()) ? 'limit' : null,
      };
    },
    async session(headers = {}) {
      if (!liveReady(env)) return { live: false, reason: 'no ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID' };
      try {
        await take('sessions', headers);
      } catch (err) {
        return { live: false, reason: err.message, offline: 'limit' };
      }
      try {
        return { live: true, signedUrl: await signedUrl(env), today: today() };
      } catch (err) {
        if (err.outOfCredit) {
          outOfCredit(err, 'signed url');
          return { live: false, reason: 'ElevenLabs credit ran out', offline: 'credit' };
        }
        runLog.server('error', { where: 'signed url', message: err.message });
        return { live: false, reason: err.message };
      }
    },
    route: async ({ text, context, spec, stage, saved } = {}) => route(text, context || null, { spec, stage, saved }),
    async tts(headers = {}, { text } = {}) {
      if (!ttsReady(env)) throw new HttpError(503, 'no ElevenLabs key');
      await take('calls', headers);
      try {
        return await elevenTts(String(text).slice(0, 400), env);
      } catch (err) {
        throw err.outOfCredit ? outOfCredit(err, 'tts') : err;
      }
    },
    // Web search for the live agent's web_search tool. Errors come back as { error } (the agent
    // then answers without it); only the daily limit is a 429 that switches the page offline.
    async search(headers = {}, { query } = {}) {
      if (!searchReady(env)) throw new HttpError(503, 'search is not configured');
      await take('calls', headers);
      try {
        return await tavilySearch(query, env);
      } catch (err) {
        const message = err.name === 'TimeoutError' ? 'search timeout' : err.message;
        runLog.server('error', { where: 'search', message });
        return { error: message };
      }
    },
    async image(headers = {}, { prompt, scene } = {}) {
      if (env.ELEVENLABS_API_KEY && !images.unavailable()) await take('calls', headers);
      const out = await images.get(prompt, String(scene || 'default'));
      if (out.error && !out.quiet) runLog.server('error', { where: 'image', message: out.error });
      return out;
    },
    async log(headers, { events } = {}) {
      return { written: runLog.browser(events) };
    },
  };
}
