import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentConfig, toolConfigs } from '../agent/config.js';
import { today } from '../lib/live-session.js';
import { setEnvLines, parseToolIds, formatToolIds } from '../scripts/agent-sync.js';
import { TOOL_DEFS, toolDefs } from '../public/js/agent-tools.js';

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
  const tools = toolConfigs({ search: true });
  assert.deepEqual(tools.map((t) => t.name), TOOL_DEFS.map((t) => t.name));
  // Without a search key the web_search tool is not offered.
  assert.deepEqual(toolConfigs().map((t) => t.name), toolDefs().map((t) => t.name));
  assert.equal(toolConfigs().some((t) => t.name === 'web_search'), false);
  for (const t of tools) {
    assert.equal(t.type, 'client');
    assert.equal(t.expects_response, true);
    assert.equal(t.parameters.type, 'object');
  }
  assert.deepEqual(tools.find((t) => t.name === 'scene_action').parameters.properties.action.enum, ['confirm', 'decline', 'close']);
});

test('idle silence skips the turn while important notifications remain enabled', () => {
  const { prompt } = agentConfig().conversation_config.agent;
  assert.equal(prompt.built_in_tools.skip_turn.params.system_tool_type, 'skip_turn');
  assert.match(prompt.built_in_tools.skip_turn.description, /every silence timeout/);
  assert.match(prompt.prompt, /Never ask "are you still there\?"/);
  assert.match(prompt.prompt, /every later timeout/);
  assert.match(prompt.prompt, /important feed update should still get a normal response/);
  assert.match(prompt.prompt, /Return silently to waiting with `skip_turn`/);
});

test('setEnvLines replaces or appends and keeps other lines', () => {
  const out = setEnvLines('ELEVENLABS_API_KEY=abc\nELEVENLABS_AGENT_ID=old\n', { ELEVENLABS_AGENT_ID: 'new', ELEVENLABS_TOOL_IDS: '{}' });
  assert.equal(out, 'ELEVENLABS_API_KEY=abc\nELEVENLABS_AGENT_ID=new\nELEVENLABS_TOOL_IDS={}\n');
});

test('tool ids round-trip as name:id pairs', () => {
  const ids = { open_scene: 'tool_a', keep_scene: 'tool_b' };
  assert.equal(formatToolIds(ids), 'open_scene:tool_a,keep_scene:tool_b');
  assert.deepEqual(parseToolIds(formatToolIds(ids)), ids);
  assert.deepEqual(parseToolIds(''), {});
});

test('the prompt takes {{today}}, with a placeholder; today() is the Bangkok date', () => {
  const agent = agentConfig().conversation_config.agent;
  assert.match(agent.prompt.prompt, /\{\{today\}\}/);
  assert.ok(agent.dynamic_variables.dynamic_variable_placeholders.today);
  // 20:00 UTC on 15 Oct is already Friday 16 Oct in Bangkok (UTC+7).
  assert.equal(today(new Date('2026-10-15T20:00:00Z')), 'Friday 16 October 2026 (2026-10-16)');
});

test('turn latency: speculative turn on, no filler line (it fired after tool calls)', () => {
  const turn = agentConfig().conversation_config.turn;
  assert.equal(turn.speculative_turn, true);
  assert.equal(turn.soft_timeout_config.timeout_seconds, -1);
  assert.equal(agentConfig({ name: 'x [test]' }).name, 'x [test]');
});
