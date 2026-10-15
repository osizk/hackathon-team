// Run log: one local JSONL file per server run under web/logs/ (gitignored: it holds what testers
// said; never commit or upload it). Every line: { t: ms timestamp, src: 'server' | 'browser', type, ... }.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const LOG_TYPES = [
  'run_start', 'page_open', 'mic', 'stt', 'user_text', 'agent_reply', 'tool', 'audio_start', 'audio_end',
  'scene_open', 'scene_close', 'feed', 'feed_event', 'decision', 'push', 'route', 'error', 'greet',
];

export function createRunLog(dir, { now = Date.now } = {}) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `run-${new Date(now()).toISOString().replace(/[:.]/g, '-')}.jsonl`);
  const write = (event) => appendFileSync(file, `${JSON.stringify(event)}\n`);
  write({ t: now(), src: 'server', type: 'run_start' });
  return {
    file,
    server: (type, data = {}) => write({ t: now(), src: 'server', type, ...data }),
    // Browser events: known types only, bounded size, browser time kept (same machine clock).
    browser(events) {
      let n = 0;
      for (const e of Array.isArray(events) ? events.slice(0, 200) : []) {
        if (!e || !LOG_TYPES.includes(e.type)) continue;
        const line = { ...e, t: Number(e.t) || now(), src: 'browser' };
        const text = JSON.stringify(line);
        if (text.length > 4000) continue;
        appendFileSync(file, `${text}\n`);
        n += 1;
      }
      return n;
    },
  };
}
