// Agent OS demo server: serves public/ and a few small routes.
//   GET  /api/agent/session                     -> { live, signedUrl } to join the ElevenLabs agent (if configured)
//   POST /api/route           { text, context } -> offline brain: keyword router (used when the live agent is not)
//   POST /api/tts             { text }          -> audio/mpeg from ElevenLabs (if ELEVENLABS_API_KEY)
//   GET  /api/agent/stream                      -> SSE: the always-on agent speaks first ('proactive')
//   POST /api/agent/presence  { scene, talking, listening } -> what the page is doing now
//   POST /api/agent/ack       { id, ok }        -> page opened the pushed scene (or was busy)
//   POST /api/feeds/event     { event }         -> presenter nudges a fake feed (e.g. flight-delayed)
//   GET  /api/agent/status                      -> feeds and agent state, for the presenter
//   POST /api/image           { prompt, scene } -> { url } or { error }: a picture for a generated page
//   GET  /api/image/<key>.png                   -> a cached picture
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.js';
import { route } from './lib/router.js';
import { elevenTts, ttsReady } from './lib/tts.js';
import { liveReady, signedUrl } from './lib/live-session.js';
import { createImageService } from './lib/images.js';
import { createFeeds, DEMO_SCRIPT } from './lib/feeds.js';
import { createAgentLoop } from './lib/agent-loop.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(join(here, '..', '.env'));

const PUBLIC = join(here, 'public');
const images = createImageService({ dir: join(here, '.cache', 'images') });
const agent = createAgentLoop({
  feeds: createFeeds(),
  script: process.env.AGENT_SCRIPT === 'off' ? [] : DEMO_SCRIPT,
  tickMs: Number(process.env.AGENT_TICK_MS || 3000),
});
const PORT = Number(process.env.PORT || 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webp': 'image/webp',
};

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 60_000) throw new Error('body too large');
  }
  return body ? JSON.parse(body) : {};
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/health') {
      return send(res, 200, { brain: liveReady() ? 'elevenlabs-agent' : 'keywords', tts: ttsReady() });
    }
    if (url.pathname === '/api/agent/session') {
      if (!liveReady()) return send(res, 200, { live: false, reason: 'no ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID' });
      try {
        return send(res, 200, { live: true, signedUrl: await signedUrl() });
      } catch (err) {
        console.warn(`[agent] no live session, using offline brain: ${err.message}`);
        return send(res, 200, { live: false, reason: err.message });
      }
    }
    if (url.pathname === '/api/route' && req.method === 'POST') {
      const { text, context, spec, stage, saved } = await readJson(req);
      return send(res, 200, await route(text, context || null, { spec, stage, saved }));
    }
    if (url.pathname === '/api/agent/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      agent.addClient(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { clearInterval(ping); agent.removeClient(res); });
      return;
    }
    if (url.pathname === '/api/agent/presence' && req.method === 'POST') {
      agent.setPresence(await readJson(req));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/agent/ack' && req.method === 'POST') {
      agent.ack(await readJson(req));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/feeds/event' && req.method === 'POST') {
      const { event } = await readJson(req);
      return send(res, agent.fire(String(event)) ? 200 : 400, { ok: true });
    }
    if (url.pathname === '/api/agent/status') return send(res, 200, agent.status());
    if (url.pathname === '/api/image' && req.method === 'POST') {
      const { prompt, scene } = await readJson(req);
      const out = await images.get(prompt, String(scene || 'default'));
      if (out.error) console.warn(`[image] ${out.error}`);
      return send(res, 200, out);
    }
    if (url.pathname.startsWith('/api/image/')) {
      const file = images.file(url.pathname.slice('/api/image/'.length));
      if (!file) return send(res, 404, { error: 'not found' });
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=86400' });
      return res.end(await readFile(file));
    }
    if (url.pathname === '/api/tts' && req.method === 'POST') {
      if (!ttsReady()) return send(res, 503, { error: 'no ElevenLabs key' });
      const { text } = await readJson(req);
      return send(res, 200, await elevenTts(String(text).slice(0, 400)), 'audio/mpeg');
    }
    const path = normalize(url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname));
    const file = join(PUBLIC, path);
    if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR') return send(res, 404, { error: 'not found' });
    console.error(`[server] ${req.method} ${url.pathname}: ${err.message}`);
    send(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Agent OS on http://localhost:${PORT}  brain=${liveReady() ? 'elevenlabs-agent' : 'keywords'} tts=${ttsReady() ? 'elevenlabs' : 'browser'} script=${process.env.AGENT_SCRIPT === 'off' ? 'off' : 'on'}`);
});
