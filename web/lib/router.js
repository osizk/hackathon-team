// Turns what the user said into an agent action:
// { scene, line, say, data, action }.
// scene: which full-screen UI to grow (or null to only talk).
// action: a step inside the open scene, for example 'confirm'.
// Money rule: no spoken text can ever approve a payment. Only the Allow button can.
import { SCENE_DEFAULTS, SCENES } from '../public/js/data.js';
import { LINES } from '../public/js/lines.js';
import { cannedTodo, cannedFirstAid, reviseByKeywords, validateSpec, TODO_WORDS, URGENT_WORDS, BLOCK_TYPES, ACCENTS, URGENCY } from './genui.js';

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

const speakLine = (line, extra = {}) => ({ scene: null, line, say: LINES[line], ...extra });

// A saved scene the user kept earlier opens at once, with no new generation.
function savedMatch(text, saved) {
  const hit = (Array.isArray(saved) ? saved : []).find((s) => Array.isArray(s?.match) && s.match.some((w) => w && text.includes(String(w).toLowerCase())));
  return hit ? { scene: 'generated', line: 'gen_saved', say: LINES.gen_saved, data: { savedKind: String(hit.kind) }, via: 'saved' } : null;
}

// Talk about the generated page that is open: revise it, keep it, or close it.
function generatedAction(text, { spec, stage } = {}) {
  // An urgent page is never reviewed or kept: a new sentence is a new request.
  if (stage === 'urgent' || (spec && spec.urgency && spec.urgency !== 'none')) {
    const fresh = keywordRoute(text, null);
    return fresh.scene || fresh.line !== 'unsure' ? fresh : speakLine('get_well', { action: 'close' });
  }
  if (stage === 'keep') {
    if (has(text, ['no', "don't", 'not', 'ไม่'])) return speakLine('gen_not_kept', { action: 'close' });
    if (has(text, [...YES, 'keep', 'save', 'เก็บ'])) return speakLine('gen_kept', { action: 'keep' });
    return speakLine('gen_keep_ask', { action: 'ask' });
  }
  const current = validateSpec(spec);
  if (!current) return speakLine('gen_what', { action: 'ask' });
  const r = reviseByKeywords({ ...current, applied: spec.applied || [] }, text);
  if (r.action === 'revise') return speakLine('gen_revised', { action: 'revise', spec: r.spec });
  if (r.action === 'accept') return speakLine('gen_keep_ask', { action: 'accept' });
  return speakLine('gen_what', { action: 'ask' });
}

export function keywordRoute(rawText, context = null, extra = {}) {
  const text = String(rawText || '').toLowerCase().trim();
  if (!text) return { scene: null, line: 'unsure', say: LINES.unsure };
  if (context === 'generated') return generatedAction(text, extra);
  // Health, injury or emergency comes first: first-aid steps at once.
  if (has(text, URGENT_WORDS)) return { scene: 'generated', line: 'first_aid', say: LINES.first_aid, data: { spec: cannedFirstAid() } };

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
  const saved = savedMatch(text, extra.saved);
  if (saved) return saved;
  // No prebuilt scene fits: without a model, a todo request gets one canned generated page.
  if (has(text, TODO_WORDS)) return { scene: 'generated', line: 'gen_todo', say: LINES.gen_todo, data: { spec: cannedTodo() } };
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
      scene: { type: 'string', enum: [...SCENES, 'generated', 'none'] },
      action: {
        type: 'string',
        enum: ['none', 'confirm', 'decline', 'revise', 'accept', 'keep', 'close', 'ask'],
        description:
          'Act on the open scene. Never use confirm to approve a payment. On a generated page: revise = send the changed spec; ' +
          'accept = the user likes it (then ask whether to keep it); keep = user said yes to keeping it; close = user does not want to keep it; ask = ask what to change.',
      },
      say: { type: 'string', description: 'One or two short sentences in Thai, spoken aloud. For a new or revised generated page, ask if the user likes it and name one or two concrete changes you propose. For an urgent page, say the first step instead, and never ask if they like it.' },
      data: { type: 'object', description: 'Optional data for a prebuilt scene, in the shape of the defaults.' },
      spec: {
        type: 'object',
        description: 'For scene generated or action revise: a UI spec built only from the fixed components.',
        properties: {
          kind: { type: 'string', description: 'short lowercase slug, e.g. todo, budget, packing' },
          name: { type: 'string' },
          match: { type: 'array', items: { type: 'string' }, description: 'words a later request would use for this page' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          accent: { type: 'string', enum: ACCENTS },
          urgency: {
            type: 'string',
            enum: URGENCY,
            description: 'urgent = health, injury or emergency: short first-aid steps, no proposals. serious = may be life-threatening: also a call block 1669.',
          },
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: { type: { type: 'string', enum: BLOCK_TYPES } },
              required: ['type'],
              description:
                'text{text} stat{label,value} progress{label,value 0-100 or "auto"} checklist{items:[{text,done,due,tag}]} ' +
                'list{items:[string]} card{title,text} chart{bars:[{label,value}]} field{label,placeholder} button{label} divider{}',
            },
          },
          proposals: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' } } }, description: 'one or two concrete changes you propose' },
        },
      },
    },
    required: ['scene'],
  },
};

export async function claudeRoute(text, context, extra, { apiKey, model = 'claude-sonnet-5-5', timeoutMs = 6000, fetchImpl = fetch } = {}) {
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system:
        'You are the agent of an Agent OS. You answer by opening UI scenes, not with long text. ' +
        `The scene open now is: ${context || 'none (agent home)'}. Scene data defaults: ${JSON.stringify(SCENE_DEFAULTS)}. ` +
        'Use a prebuilt scene when one fits. When none fits a task, open scene generated with a spec. ' +
        'If the request is about health, injury or an emergency, classify it in spec.urgency (urgent or serious), use a steps block ' +
        'with short first-aid steps, give no proposals, and do not ask whether the user likes it; when serious add {type:"call",number:"1669"}. ' +
        (context === 'generated' ? `The generated page open now (stage ${extra.stage || 'review'}): ${JSON.stringify(extra.spec)}` : ''),
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'show_scene' },
      messages: [{ role: 'user', content: String(text) }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}`);
  const body = await res.json();
  const call = (body.content || []).find((c) => c.type === 'tool_use');
  if (!call) throw new Error('claude gave no tool call');
  const { scene, action, say, data, spec } = call.input || {};

  // Money rule holds even if the model says otherwise.
  if (context === 'payment' && (action === 'confirm' || scene === 'payment')) return keywordRoute('allow', 'payment');
  if (context !== 'generated' && (action === 'confirm' || action === 'decline')) {
    const routed = keywordRoute(action === 'confirm' ? 'yes' : 'no', context);
    if (routed.action) return routed;
  }
  if (context === 'generated' && extra.spec?.urgency && extra.spec.urgency !== 'none' && ['accept', 'keep'].includes(action)) {
    return speakLine('get_well', { action: 'close' });
  }
  if (context === 'generated') {
    if (action === 'revise') {
      const next = validateSpec(spec);
      if (next) return { scene: null, action: 'revise', spec: next, line: null, say: say || LINES.gen_revised };
    }
    if (['accept', 'keep', 'close', 'ask'].includes(action)) {
      const line = { accept: 'gen_keep_ask', keep: 'gen_kept', close: 'gen_not_kept', ask: 'gen_what' }[action];
      return { scene: null, action, line: say ? null : line, say: say || LINES[line] };
    }
  }
  if (SCENES.includes(scene)) return sceneReply(scene, data);
  if (scene === 'generated') {
    const next = validateSpec(spec);
    if (next) return { scene: 'generated', line: null, say: say || LINES.gen_revised, data: { spec: next } };
    throw new Error('claude gave an invalid UI spec');
  }
  return { scene: null, line: null, say: say || LINES.unsure };
}

export async function route(text, context, env = process.env, fetchImpl = fetch, extra = {}) {
  // A kept page opens at once, with no model call.
  if (!context) {
    const saved = savedMatch(String(text || '').toLowerCase(), extra.saved);
    if (saved) return saved;
  }
  if (env.ANTHROPIC_API_KEY) {
    try {
      return { ...(await claudeRoute(text, context, extra, { apiKey: env.ANTHROPIC_API_KEY, fetchImpl })), via: 'claude' };
    } catch (err) {
      console.warn(`[route] Claude failed, using keywords: ${err.message}`);
    }
  }
  return { via: 'keywords', ...keywordRoute(text, context, extra) };
}
