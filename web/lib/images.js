// Pictures for generated pages, from the ElevenLabs Image & Video API (docs checked October 2026):
//   POST /v1/flows/image { model_id, prompt, aspect_ratio } -> { id, status: 'pending' }
//   GET  /v1/flows/image/{id} -> status pending | generating | completed { content_url } | failed
//   content_url is a signed URL, fetched without the key. Poll at most every 2 seconds.
// Cached on disk by prompt, so a revise or a saved scene never pays twice. Calls per scene are capped.
// Any error (no permission, 402 paid_plan_required, timeout) returns { error } and the page keeps its frame.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const IMAGE_MODEL = 'gemini-2.5-flash-image'; // fast; avoids bytedance-* models that need approval
export const MAX_PER_SCENE = 3;
const STYLE = 'Flat friendly illustration, soft pastel colours, simple shapes, no text, no letters.';
const API = 'https://api.elevenlabs.io/v1/flows/image';

export const cleanPrompt = (p) => String(p || '').replace(/\s+/g, ' ').trim().slice(0, 200);
export const promptKey = (p) => createHash('sha256').update(cleanPrompt(p).toLowerCase()).digest('hex').slice(0, 24);

function reasonFor(status, body) {
  const text = JSON.stringify(body || '');
  if (status === 402 || text.includes('paid_plan_required')) return 'paid_plan_required';
  if (status === 401 || status === 403) return 'no permission (Image & Video)';
  if (status === 429) return 'rate limited';
  return `http ${status}`;
}

// inline: true (Vercel) returns the signed content_url instead of caching the file on disk.
export function createImageService({ env = process.env, dir, inline = false, fetchImpl = fetch, pollMs = 2000, timeoutMs = 45000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const memo = new Map(); // inline mode: prompt key -> content_url
  if (!inline) mkdirSync(dir, { recursive: true });
  const inflight = new Map();
  const perScene = new Map();
  // After a plan or permission error, stop calling: every later picture fails fast and quietly.
  let unavailable = null;
  const PERMANENT = ['paid_plan_required', 'no permission (Image & Video)'];

  async function generate(prompt, key) {
    const headers = { 'content-type': 'application/json', 'xi-api-key': env.ELEVENLABS_API_KEY };
    const res = await fetchImpl(API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model_id: IMAGE_MODEL, prompt: `${prompt}. ${STYLE}`, aspect_ratio: '16:9' }),
    });
    const created = await res.json().catch(() => ({}));
    if (!res.ok) return { error: reasonFor(res.status, created) };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(pollMs);
      const r = await fetchImpl(`${API}/${encodeURIComponent(created.id)}`, { headers });
      const job = await r.json().catch(() => ({}));
      if (!r.ok) return { error: reasonFor(r.status, job) };
      if (job.status === 'failed') return { error: `failed: ${job.failure_reason || 'unknown'}` };
      if (job.status === 'completed' && job.content_url && inline) {
        memo.set(key, job.content_url);
        return { url: job.content_url };
      }
      if (job.status === 'completed' && job.content_url) {
        const img = await fetchImpl(job.content_url);
        if (!img.ok) return { error: `download ${img.status}` };
        writeFileSync(join(dir, `${key}.png`), Buffer.from(await img.arrayBuffer()));
        return { url: `/api/image/${key}.png` };
      }
    }
    return { error: 'timeout' };
  }

  return {
    file: (name) => (/^[a-f0-9]{24}\.png$/.test(name) ? join(dir, name) : null),
    unavailable: () => unavailable,
    async get(rawPrompt, scene = 'default') {
      const prompt = cleanPrompt(rawPrompt);
      if (!prompt) return { error: 'empty prompt' };
      const key = promptKey(prompt);
      if (inline && memo.has(key)) return { url: memo.get(key), cached: true };
      if (!inline && existsSync(join(dir, `${key}.png`))) return { url: `/api/image/${key}.png`, cached: true };
      if (inflight.has(key)) return inflight.get(key);
      if (!env.ELEVENLABS_API_KEY) return { error: 'no ELEVENLABS_API_KEY' };
      if (unavailable) return { error: unavailable, quiet: true };
      const used = perScene.get(scene) || 0;
      if (used >= MAX_PER_SCENE) return { error: `cap of ${MAX_PER_SCENE} images per scene` };
      perScene.set(scene, used + 1);
      const job = generate(prompt, key)
        .catch((err) => ({ error: err.name === 'TimeoutError' ? 'timeout' : err.message }))
        .then((out) => {
          if (PERMANENT.includes(out.error)) unavailable = out.error;
          return out;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, job);
      return job;
    },
  };
}
