// The always-on agent's speak-or-wait decision from feed changes.
// With ANTHROPIC_API_KEY, Claude decides; otherwise (or if Claude fails) simple rules do.
// Either way the result is checked: only a known proactive scene, never one already handled.
export const PROACTIVE = { flight: 'flight_intro', training: 'train_intro' };

export function decideByRules(feeds, handled) {
  if (feeds.flight.status === 'delayed' && !handled.flight) {
    return { speak: true, scene: 'flight', reason: `flight ${feeds.flight.code} delayed ${feeds.flight.delayMinutes} min` };
  }
  if (feeds.health.synced && feeds.health.raceOpen && !handled.training) {
    return { speak: true, scene: 'training', reason: `sleep score ${feeds.health.sleepScore}, race sign-up open` };
  }
  return { speak: false, scene: null, reason: 'nothing worth interrupting for' };
}

const TOOL = {
  name: 'decide',
  description: 'Decide whether to speak to the user now, unasked, and which scene to open. Only speak when it clearly helps; otherwise wait.',
  input_schema: {
    type: 'object',
    properties: {
      speak: { type: 'boolean' },
      scene: { type: 'string', enum: [...Object.keys(PROACTIVE), 'none'] },
      reason: { type: 'string' },
    },
    required: ['speak', 'scene', 'reason'],
  },
};

export async function decideWithClaude(feeds, changed, handled, { apiKey, model = 'claude-sonnet-5-5', fetchImpl = fetch, timeoutMs = 6000 }) {
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system:
        'You are the always-on agent of an Agent OS. You watch the user\'s feeds and may speak first. ' +
        'Scenes you can open: flight (a delayed flight with a faster option), training (sleep score, run plan, race sign-up). ' +
        `Already handled, do not repeat: ${JSON.stringify(handled)}.`,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'decide' },
      messages: [{ role: 'user', content: `Feeds changed: ${changed.join(', ')}. Feeds now: ${JSON.stringify(feeds)}` }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}`);
  const body = await res.json();
  const call = (body.content || []).find((c) => c.type === 'tool_use');
  if (!call) throw new Error('claude gave no tool call');
  const { speak, scene, reason } = call.input || {};
  if (speak && PROACTIVE[scene] && !handled[scene]) return { speak: true, scene, reason: String(reason || '') };
  return { speak: false, scene: null, reason: String(reason || 'wait') };
}

export async function decide(feeds, changed, handled, env = process.env, fetchImpl = fetch) {
  if (env.ANTHROPIC_API_KEY) {
    try {
      return { ...(await decideWithClaude(feeds, changed, handled, { apiKey: env.ANTHROPIC_API_KEY, fetchImpl })), via: 'claude' };
    } catch (err) {
      console.warn(`[agent] Claude failed, using rules: ${err.message}`);
    }
  }
  return { ...decideByRules(feeds, handled), via: 'rules' };
}
