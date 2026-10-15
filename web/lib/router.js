// Turns what the user said into an agent action:
// { scene, line, say, data, action }.
// scene: which full-screen UI to grow (or null to only talk).
// action: a step inside the open scene, for example 'confirm'.
// Money rule: no spoken text can ever approve a payment. Only the Allow button can.
import { SCENE_DEFAULTS, SCENES } from '../public/js/data.js';
import { LINES } from '../public/js/lines.js';

const has = (text, words) => words.some((w) => text.includes(w));

const YES = ['yes', 'yeah', 'ok', 'okay', 'sure', 'do it', 'change it', 'ใช่', 'โอเค', 'ตกลง', 'เปลี่ยน', 'เอา', 'ได้', 'จัดไป'];
const NO = ['no', 'keep', 'cancel', 'ไม่', 'ยกเลิก', 'คงเดิม'];
const PAY_WORDS = ['allow', 'approve', 'pay', 'confirm payment', 'จ่าย', 'อนุมัติ', 'ชำระ'];

const KEYWORDS = [
  { scene: 'shopping', words: ['hectic', 'busy', 'groceries', 'grocery', 'shopping', 'email', 'ยุ่ง', 'วุ่น', 'ซื้อของ', 'อีเมล', 'เมล'] },
  { scene: 'payment', words: ['pay', 'checkout', 'จ่าย', 'ชำระ', 'เช็คเอาท์'] },
  { scene: 'flight', words: ['flight', 'delay', 'plane', 'เที่ยวบิน', 'ไฟลท์', 'เครื่องบิน', 'ดีเลย์'] },
  { scene: 'training', words: ['run', 'training', 'race', '10k', 'sleep', 'วิ่ง', 'ซ้อม', 'นอน', 'สมัคร'] },
];

const INTRO = { shopping: 'shop_intro', payment: 'pay_ask', flight: 'flight_intro', training: 'train_intro' };

export function sceneReply(scene, data) {
  return { scene, line: INTRO[scene], say: LINES[INTRO[scene]], data: { ...SCENE_DEFAULTS[scene], ...(data || {}) } };
}

export function keywordRoute(rawText, context = null) {
  const text = String(rawText || '').toLowerCase().trim();
  if (!text) return { scene: null, line: 'unsure', say: LINES.unsure };

  // Inside an open scene, short answers act on that scene.
  if (context === 'payment' && has(text, PAY_WORDS.concat(YES))) {
    return { scene: null, action: 'button-only', line: 'pay_button_only', say: LINES.pay_button_only };
  }
  if (context === 'flight') {
    if (has(text, NO)) return { scene: null, action: 'decline', line: 'flight_keep', say: LINES.flight_keep };
    if (has(text, YES)) return { scene: null, action: 'confirm', line: null, say: null };
  }
  if (context === 'shopping' && has(text, YES)) return { scene: null, action: 'confirm', line: null, say: null };

  for (const { scene, words } of KEYWORDS) {
    if (has(text, words)) return sceneReply(scene);
  }
  return { scene: null, line: 'unsure', say: LINES.unsure };
}

const TOOL = {
  name: 'show_scene',
  description:
    'Answer the user. Pick a full-screen UI scene to open (or "none" to only talk), or an action on the scene that is already open. ' +
    'Scenes: shopping = read the weekly shopping email and build a list; payment = payment approval card; ' +
    'flight = delayed flight with a re-route offer; training = sleep score, run plan and 10K race sign-up.',
  input_schema: {
    type: 'object',
    properties: {
      scene: { type: 'string', enum: [...SCENES, 'none'] },
      action: { type: 'string', enum: ['none', 'confirm', 'decline'], description: 'Act on the open scene. Never use confirm to approve a payment.' },
      say: { type: 'string', description: 'One short sentence in Thai, spoken aloud. Only used when scene is none.' },
      data: { type: 'object', description: 'Optional scene data in the shape of the defaults.' },
    },
    required: ['scene'],
  },
};

export async function claudeRoute(text, context, { apiKey, model = 'claude-sonnet-5-5', timeoutMs = 6000, fetchImpl = fetch } = {}) {
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system:
        'You are the agent of an Agent OS. You answer by opening UI scenes, not with long text. ' +
        `The scene open now is: ${context || 'none (agent home)'}. Scene data defaults: ${JSON.stringify(SCENE_DEFAULTS)}`,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'show_scene' },
      messages: [{ role: 'user', content: String(text) }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}`);
  const body = await res.json();
  const call = (body.content || []).find((c) => c.type === 'tool_use');
  if (!call) throw new Error('claude gave no tool call');
  const { scene, action, say, data } = call.input || {};

  // Money rule holds even if the model says otherwise.
  if (context === 'payment' && (action === 'confirm' || scene === 'payment')) return keywordRoute('allow', 'payment');
  if (action === 'confirm' || action === 'decline') {
    const routed = keywordRoute(action === 'confirm' ? 'yes' : 'no', context);
    if (routed.action) return routed;
  }
  if (SCENES.includes(scene)) return sceneReply(scene, data);
  return { scene: null, line: null, say: say || LINES.unsure };
}

export async function route(text, context, env = process.env, fetchImpl = fetch) {
  if (env.ANTHROPIC_API_KEY) {
    try {
      return { ...(await claudeRoute(text, context, { apiKey: env.ANTHROPIC_API_KEY, fetchImpl })), via: 'claude' };
    } catch (err) {
      console.warn(`[route] Claude failed, using keywords: ${err.message}`);
    }
  }
  return { ...keywordRoute(text, context), via: 'keywords' };
}
