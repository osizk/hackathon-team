// Create or update the ElevenLabs agent from agent/config.js, and write its id to .env.
// Usage: npm run agent:sync              (needs ELEVENLABS_API_KEY with the Agents write permission)
//        npm run agent:sync -- --dry-run (prints what it would send; no API call)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../lib/env.js';
import { agentConfig, toolConfigs } from '../agent/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(here, '..', '..', '.env');
const API = 'https://api.elevenlabs.io/v1/convai';
loadEnv(ENV_PATH);

// Tool ids live in .env as name:id,name:id (shell-safe, unlike JSON).
export const parseToolIds = (text = '') =>
  Object.fromEntries(String(text).split(',').map((pair) => pair.trim().split(':')).filter(([n, id]) => n && id));
export const formatToolIds = (ids) => Object.entries(ids).map(([n, id]) => `${n}:${id}`).join(',');

// Set or replace KEY=value lines in .env, keeping every other line as it is.
export function setEnvLines(text, values) {
  const lines = text ? text.replace(/\n$/, '').split('\n') : [];
  for (const [key, value] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  return `${lines.join('\n')}\n`;
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

async function syncTools(known) {
  const ids = {};
  const search = Boolean(process.env.TAVILY_API_KEY);
  console.log(`web_search tool: ${search ? 'offered' : 'not offered (no TAVILY_API_KEY)'}`);
  for (const tool of toolConfigs({ search })) {
    const id = known[tool.name];
    if (id) {
      try {
        await call('PATCH', `/tools/${id}`, { tool_config: tool });
        ids[tool.name] = id;
        console.log(`tool  updated ${tool.name}`);
        continue;
      } catch (err) {
        if (![404, 405].includes(err.status)) throw err;
      }
    }
    const created = await call('POST', '/tools', { tool_config: tool });
    ids[tool.name] = created.id;
    console.log(`tool  created ${tool.name}`);
  }
  return ids;
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ tools: toolConfigs({ search: Boolean(process.env.TAVILY_API_KEY) }), agent: agentConfig({ toolIds: ['<tool ids>'] }) }, null, 2));
    return;
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not set in .env.');
    process.exit(1);
  }
  const known = parseToolIds(process.env.ELEVENLABS_TOOL_IDS);
  const toolIds = await syncTools(known);
  const body = agentConfig({ toolIds: Object.values(toolIds), voiceId: process.env.ELEVENLABS_VOICE_ID || undefined });

  let agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    await call('PATCH', `/agents/${agentId}`, body);
    console.log(`agent updated ${agentId}`);
  } else {
    agentId = (await call('POST', '/agents/create', body)).agent_id;
    console.log(`agent created ${agentId}`);
  }
  const current = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  writeFileSync(ENV_PATH, setEnvLines(current, { ELEVENLABS_AGENT_ID: agentId, ELEVENLABS_TOOL_IDS: formatToolIds(toolIds) }));
  console.log('wrote ELEVENLABS_AGENT_ID and ELEVENLABS_TOOL_IDS to .env');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    if (/convai_write|permission|401|403/i.test(err.message)) {
      console.error('The ElevenLabs key needs the Agents permission (scope convai_write). Add it in Settings > API keys.');
    }
    console.error(err.message);
    process.exit(1);
  });
}
