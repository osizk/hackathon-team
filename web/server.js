// Agent OS demo server: serves public/ and two small routes.
//   POST /api/route  { text, context } -> agent action (Claude if ANTHROPIC_API_KEY, else keywords)
//   POST /api/tts    { text }          -> audio/mpeg from ElevenLabs (if ELEVENLABS_API_KEY)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.js';
import { route } from './lib/router.js';
import { elevenTts, ttsReady } from './lib/tts.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(join(here, '..', '.env'));

const PUBLIC = join(here, 'public');
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
      return send(res, 200, { brain: process.env.ANTHROPIC_API_KEY ? 'claude' : 'keywords', tts: ttsReady() });
    }
    if (url.pathname === '/api/route' && req.method === 'POST') {
      const { text, context, spec, stage, saved } = await readJson(req);
      return send(res, 200, await route(text, context || null, process.env, fetch, { spec, stage, saved }));
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
  console.log(`Agent OS on http://localhost:${PORT}  brain=${process.env.ANTHROPIC_API_KEY ? 'claude' : 'keywords'} tts=${ttsReady() ? 'elevenlabs' : 'browser'}`);
});
