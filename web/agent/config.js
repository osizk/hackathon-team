// The ElevenLabs agent (ElevenAgents), defined as code. scripts/agent-sync.js sends it to
// ElevenLabs: POST /v1/convai/agents/create the first time, PATCH /v1/convai/agents/{id} after.
// Checked against the ElevenLabs API reference, October 2026:
//   llm enum includes 'claude-sonnet-5-5'; Thai is listed only for the v3 TTS family, so the
//   agent uses 'eleven_v3_conversational'; client tools are separate resources (tool_ids).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolDefs } from '../public/js/agent-tools.js';
import { DEFAULT_VOICE } from '../lib/tts.js';

const here = dirname(fileURLToPath(import.meta.url));

export const AGENT_NAME = 'Agent OS (U-Hackathon 2026)';
export const AGENT_LLM = 'claude-sonnet-5-5';
export const AGENT_TTS_MODEL = 'eleven_v3_conversational';
export const AGENT_LANGUAGE = 'th';
// Empty: the agent waits for the user. The app greets once on the first tap (greet.mp3, same voice).
export const FIRST_MESSAGE = '';

// One client tool config per tool, in the ElevenLabs ClientToolConfig shape.
// search: offer web_search (only when TAVILY_API_KEY is set where the agent is synced).
export function toolConfigs({ search = false } = {}) {
  return toolDefs({ search }).map((t) => {
    const properties = {};
    const required = [];
    for (const [name, p] of Object.entries(t.params)) {
      properties[name] = { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) };
      if (p.required) required.push(name);
    }
    return {
      type: 'client',
      name: t.name,
      description: t.description,
      expects_response: true,
      response_timeout_secs: 10,
      // Say what you are about to do before a scene grows or changes.
      // A page revise takes the model a few seconds: a short sentence first keeps it feeling quick.
      ...(['open_scene', 'render_ui', 'revise_ui', 'web_search'].includes(t.name) ? { pre_tool_speech: 'force' } : {}),
      ...(t.name === 'web_search' ? { response_timeout_secs: 20 } : {}),
      parameters: { type: 'object', properties, required },
    };
  });
}

export function agentConfig({ toolIds = [], voiceId = DEFAULT_VOICE } = {}) {
  return {
    name: AGENT_NAME,
    tags: ['agent-os', 'hackathon'],
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE,
        language: AGENT_LANGUAGE,
        prompt: {
          prompt: readFileSync(join(here, 'prompt.md'), 'utf8'),
          llm: AGENT_LLM,
          tool_ids: toolIds,
          // Lets the agent stay silent after a feed update that is not worth speaking about.
          built_in_tools: {
            skip_turn: {
              type: 'system',
              name: 'skip_turn',
              description: 'Stay silent this turn. Use it after a [feed update] that is not worth interrupting the user for.',
              params: { system_tool_type: 'skip_turn' },
            },
          },
        },
      },
      tts: { voice_id: voiceId, model_id: AGENT_TTS_MODEL },
      asr: { quality: 'high', provider: 'scribe_realtime' },
    },
    // Private agent: the browser can only join with a signed URL from our server.
    platform_settings: { auth: { enable_auth: true } },
  };
}
