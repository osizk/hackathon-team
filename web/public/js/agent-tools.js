// Client tools of the ElevenLabs agent: the only way the live agent can change the UI.
// Each tool gets plain parameters from the agent and returns a short text result to it.
// The money rule lives here too: no tool can approve a payment. Only the owner's tap on Allow can.
import { validateSpec } from './genui.js';

export const PROACTIVE_SCENES = ['shopping', 'payment', 'flight', 'training'];
const SECRETARY_ACTIONS = ['today', 'email', 'add_tasks', 'draft', 'acknowledge', 'snooze'];

// Tool definitions, shared by the agent config (scripts/agent-sync.js) and the browser.
// Parameters are kept flat (strings and enums) so any tool schema format can carry them;
// structured data travels as a JSON string.
export const TOOL_DEFS = [
  {
    name: 'secretary_action',
    description: 'Personal secretary DEMO with sample data only. today = today tasks and calendar; email = sample client email; add_tasks = import its two tasks once; draft = prepare editable reply proposing 14:30 (13:30 conflicts with team meeting); acknowledge or snooze = act on displayed notifications. Returns current sample data. No real mail or calendar changes. Sending requires the owner tapping the test-send button; no tool can send.',
    params: {
      action: { type: 'string', enum: SECRETARY_ACTIONS, description: 'Secretary action', required: true },
      minutes: { type: 'string', enum: ['1', '5'], description: 'Snooze for one or five minutes', required: false },
    },
  },
  {
    name: 'open_scene',
    description:
      'Open a prebuilt full-screen scene. shopping = read the weekly shopping email and build the list; payment = payment approval card; ' +
      'flight = delayed flight with a faster option; training = sleep score, run plan and 10K race sign-up that fills itself. ' +
      'For product discovery across Shopify merchants, use shopping with data_json {"catalog":true,"query":"product requirements","budget":1500}. Budget is optional THB. The page searches Shopify Global Catalog and shows real product cards for owner selection. ' +
      'This does not place orders or pay.',
    params: {
      scene: { type: 'string', enum: PROACTIVE_SCENES, description: 'Which scene to open', required: true },
      data_json: { type: 'string', description: 'Optional JSON object with scene data in the shape of the defaults', required: false },
    },
  },
  {
    name: 'scene_action',
    description:
      'Act on the scene that is open. confirm = accept the offer (e.g. change the flight, check out the shopping list); ' +
      'decline = keep things as they are; close = fold back to home. You can never approve a payment: only the owner taps Allow.',
    params: { action: { type: 'string', enum: ['confirm', 'decline', 'close'], description: 'What to do', required: true } },
  },
  {
    name: 'render_ui',
    description:
      'When no prebuilt scene fits, draw a new full-screen page from the fixed components. spec_json is a JSON object: ' +
      '{kind, name, match:[words], title, subtitle, accent: orange|green|blue|purple|pink|dark, urgency: none|urgent|serious, ' +
      'blocks:[...], proposals:[{id,label}]}. Block types: text{text} stat{label,value} progress{label,value 0-100 or "auto"} ' +
      'checklist{items:[{text,done,due,tag}]} list{items} card{title,text} chart{bars:[{label,value}]} field{label,placeholder} ' +
      'button{label} divider{} steps{items} call{label,number 1669|191|199} image{prompt,caption} (a short picture prompt; at most 2).  After it opens, ask if the user likes it and propose one or two changes ' +
      '(unless urgent).',
    params: { spec_json: { type: 'string', description: 'The UI spec as a JSON string', required: true } },
  },
  {
    name: 'revise_ui',
    description: 'Redraw the open generated page with a changed spec (same format as render_ui), after the user asked for a change.',
    params: { spec_json: { type: 'string', description: 'The full changed UI spec as a JSON string', required: true } },
  },
  {
    name: 'mark_urgent',
    description:
      'Mark the open generated page as urgent (health, injury or emergency): no like question, no proposed changes, never kept. ' +
      'serious = may be life-threatening: also shows a large button to call 1669.',
    params: { level: { type: 'string', enum: ['urgent', 'serious'], description: 'How urgent', required: true } },
  },
  {
    name: 'keep_scene',
    description: 'The user liked the open generated page and said yes to keeping it: save it so it opens at once next time.',
    params: {},
  },
];

export const toolDefs = () => TOOL_DEFS;

const withSources = (spec, sources) =>
  !sources?.length || spec.blocks.some((b) => b.type === 'sources')
    ? spec
    : validateSpec({ ...spec, blocks: [...spec.blocks, { type: 'sources', items: sources }] }) || spec;

const parseJson = (text) => {
  if (text == null || text === '') return {};
  if (typeof text === 'object') return text;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// The [screen] note that tells the live agent which pages the user kept, and how to reopen one:
// render_ui with spec_json {"saved":"<kind>"} (the saved spec reference). Empty when nothing is kept.
export function keptPagesNote(saved = {}) {
  const pages = Object.values(saved || {}).filter((p) => p?.kind);
  if (!pages.length) return '';
  const list = pages
    .map((p) => `"${p.name || p.kind}" (reference: {"saved":"${p.kind}"}; words: ${(p.match || []).join(', ') || p.kind})`)
    .join('; ');
  return (
    `[screen] Pages the user kept earlier: ${list}. When the user asks for one of these, reopen it at once: ` +
    'call render_ui with spec_json set to its reference, for example {"saved":"' + pages[0].kind + '"}. Do not draw it again.'
  );
}

// ui: { current(): { name, ctl } | null, openScene(name, data), closeScene(), action(name, extra), nudgeAllow(),
//       saved() -> { [kind]: { kind, name, match, spec } }, tellAgent(text) }
export function createToolHandlers(ui) {
  const generated = () => (ui.current()?.name === 'generated' ? ui.current() : null);

  return {
    secretary_action({ action, minutes = '1' } = {}) {
      if (!SECRETARY_ACTIONS.includes(action) || (action === 'snooze' && !['1', '5'].includes(minutes))) return 'error: invalid secretary action';
      if (!ui.secretary) return 'error: secretary unavailable';
      return ui.secretary(action, Number(minutes));
    },
    // Returns after the scene has grown (the agent's sentence first), so a next tool sees it.
    async open_scene({ scene, data_json } = {}) {
      if (!PROACTIVE_SCENES.includes(scene)) return `error: unknown scene "${scene}"`;
      const data = parseJson(data_json);
      if (data === null) return 'error: data_json is not valid JSON';
      await ui.openScene(scene, data);
      return `opened ${scene}`;
    },

    scene_action({ action } = {}) {
      const open = ui.current();
      if (!open) return 'error: no scene is open';
      if (open.name === 'payment' && action === 'confirm') {
        ui.nudgeAllow();
        return 'refused: only the owner can approve a payment by tapping Allow. Ask them to tap it.';
      }
      if (action === 'close') {
        ui.closeScene();
        return 'closed';
      }
      if (!['confirm', 'decline'].includes(action)) return `error: unknown action "${action}"`;
      ui.action(action);
      return `${action} done on ${open.name}`;
    },

    async render_ui({ spec_json } = {}) {
      const parsed = parseJson(spec_json);
      // A kept page's reference: reopen the saved page as it was kept.
      if (typeof parsed?.saved === 'string') {
        const kept = ui.saved?.()[parsed.saved];
        if (!kept) return `error: no kept page "${parsed.saved}"; draw a new page with a full spec`;
        await ui.openScene('generated', { savedKind: kept.kind });
        return `reopened the kept page "${kept.name || kept.kind}"; say it is ready, do not ask if they like it`;
      }
      let spec = validateSpec(parsed);
      if (!spec) return 'error: spec has no usable blocks; use only the fixed components';
      await ui.openScene('generated', { spec });
      return spec.urgency === 'none' ? 'page shown; now ask if the user likes it and propose one or two changes' : 'first-aid page shown';
    },

    revise_ui({ spec_json } = {}) {
      const open = generated();
      if (!open) return 'error: no generated page is open';
      let spec = validateSpec(parseJson(spec_json));
      if (!spec) return 'error: spec has no usable blocks';
      // A revise keeps the sources of the page it changes.
      spec = withSources(spec, open.ctl.state?.().spec?.blocks.find((b) => b.type === 'sources')?.items);
      ui.action('revise', { spec });
      return 'page redrawn';
    },

    mark_urgent({ level } = {}) {
      const open = generated();
      if (!open) return 'no page is open (the user closed it); do nothing more';
      const current = open.ctl.state?.().spec;
      const spec = validateSpec({ ...current, urgency: level === 'serious' ? 'serious' : 'urgent' });
      ui.action('urgent', { spec });
      return `marked ${spec.urgency}`;
    },


    keep_scene() {
      const open = generated();
      if (!open) return 'error: no generated page is open';
      const spec = open.ctl.state?.().spec;
      if (spec?.urgency && spec.urgency !== 'none') return 'refused: first-aid pages are never kept';
      ui.action('keep');
      ui.tellAgent?.(keptPagesNote(ui.saved?.()));
      return `kept "${spec?.name || 'page'}"; it opens at once next time`;
    },
  };
}
