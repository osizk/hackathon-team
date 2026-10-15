import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentConfig, toolConfigs } from '../agent/config.js';
import { setEnvLines } from '../scripts/agent-sync.js';
import { TOOL_DEFS } from '../public/js/agent-tools.js';

test('agent config: Claude Sonnet 5.5, Thai, v3 conversational voice, private', () => {
  const c = agentConfig({ toolIds: ['t1'] });
  assert.equal(c.conversation_config.agent.prompt.llm, 'claude-sonnet-5-5');
  assert.equal(c.conversation_config.agent.language, 'th');
  assert.equal(c.conversation_config.tts.model_id, 'eleven_v3_conversational');
  assert.deepEqual(c.conversation_config.agent.prompt.tool_ids, ['t1']);
  assert.equal(c.platform_settings.auth.enable_auth, true);
  assert.match(c.conversation_config.agent.prompt.prompt, /never approve a payment/);
});

test('client tools match the browser handlers and are JSON-schema objects', () => {
  const tools = toolConfigs();
  assert.deepEqual(tools.map((t) => t.name), TOOL_DEFS.map((t) => t.name));
  for (const t of tools) {
    assert.equal(t.type, 'client');
    assert.equal(t.expects_response, true);
    assert.equal(t.parameters.type, 'object');
  }
  assert.deepEqual(tools.find((t) => t.name === 'scene_action').parameters.properties.action.enum, ['confirm', 'decline', 'close']);
});

test('setEnvLines replaces or appends and keeps other lines', () => {
  const out = setEnvLines('ELEVENLABS_API_KEY=abc\nELEVENLABS_AGENT_ID=old\n', { ELEVENLABS_AGENT_ID: 'new', ELEVENLABS_TOOL_IDS: '{}' });
  assert.equal(out, 'ELEVENLABS_API_KEY=abc\nELEVENLABS_AGENT_ID=new\nELEVENLABS_TOOL_IDS={}\n');
});
