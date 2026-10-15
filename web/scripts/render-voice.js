// Pre-render every fixed demo line to public/voice/<id>.mp3 with ElevenLabs,
// so the stage voice works even if the Wi-Fi does not.
// Usage: npm run voice            (skips lines already rendered)
//        npm run voice -- --force (renders all again)
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../lib/env.js';
import { elevenTts, ttsReady, voiceSettings } from '../lib/tts.js';
import { LINES } from '../public/js/lines.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(join(here, '..', '..', '.env'));
const out = join(here, '..', 'public', 'voice');
mkdirSync(out, { recursive: true });

if (!ttsReady()) {
  console.error('ELEVENLABS_API_KEY is not set in .env; nothing rendered. The app will use the browser voice.');
  process.exit(1);
}

// A line is rendered again when its text, voice or model changed.
const lockPath = join(out, 'lines.lock.json');
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
const force = process.argv.includes('--force');
const ids = [];
for (const [id, text] of Object.entries(LINES)) {
  const hash = createHash('sha256').update(JSON.stringify([text, voiceSettings()])).digest('hex').slice(0, 16);
  const file = join(out, `${id}.mp3`);
  if (!force && existsSync(file) && lock[id] === hash) {
    console.log(`skip  ${id}`);
  } else {
    writeFileSync(file, await elevenTts(text));
    lock[id] = hash;
    console.log(`voice ${id}: ${text}`);
  }
  ids.push(id);
}
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(ids, null, 2)}\n`);
writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`${ids.length} lines ready in public/voice/`);
