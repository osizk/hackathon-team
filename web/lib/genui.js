// Generated UI: when no prebuilt scene fits, the agent describes a screen as JSON
// built from a small fixed component set. The browser draws it with textContent only;
// no model-written HTML or JS is ever run.
//
// spec = { kind, name, match, title, subtitle?, accent, blocks: [...], proposals: [{ id, label }] }
// kind/name/match let a page the user liked be kept as a saved scene and found again.
// block types:
//   text      { text }
//   stat      { label, value }
//   progress  { label, value: 0-100 | 'auto' }   ('auto' = share of checklist items done)
//   checklist { items: [{ text, done?, due?, tag? }] }
//   list      { items: [string] }
//   card      { title, text }
//   chart     { bars: [{ label, value }] }
//   field     { label, placeholder? }
//   button    { label }
//   divider   {}

export const TODO_WORDS = ['todo', 'to-do', 'to do', 'checklist', 'task list', 'รายการที่ต้องทำ', 'สิ่งที่ต้องทำ', 'ทูดู', 'เช็คลิสต์', 'ลิสต์งาน'];
export const ACCENTS = ['orange', 'green', 'blue', 'purple', 'pink', 'dark'];
export const BLOCK_TYPES = ['text', 'stat', 'progress', 'checklist', 'list', 'card', 'chart', 'field', 'button', 'divider'];

const str = (v, max = 120) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : '');
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

function cleanBlock(b) {
  if (!b || !BLOCK_TYPES.includes(b.type)) return null;
  switch (b.type) {
    case 'text': return { type: 'text', text: str(b.text, 300) };
    case 'stat': return { type: 'stat', label: str(b.label, 40), value: str(b.value, 24) };
    case 'progress': {
      const n = Number(b.value);
      return { type: 'progress', label: str(b.label, 40), value: b.value === 'auto' ? 'auto' : Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0)) };
    }
    case 'checklist':
      return {
        type: 'checklist',
        items: arr(b.items, 12).map((i) => ({
          text: str(typeof i === 'string' ? i : i?.text, 80),
          done: Boolean(i?.done),
          ...(i?.due ? { due: str(i.due, 20) } : {}),
          ...(i?.tag ? { tag: str(i.tag, 16) } : {}),
        })).filter((i) => i.text),
      };
    case 'list': return { type: 'list', items: arr(b.items, 12).map((i) => str(i, 80)).filter(Boolean) };
    case 'card': return { type: 'card', title: str(b.title, 60), text: str(b.text, 200) };
    case 'chart':
      return { type: 'chart', bars: arr(b.bars, 8).map((x) => ({ label: str(x?.label, 16), value: Math.max(0, Number(x?.value) || 0) })) };
    case 'field': return { type: 'field', label: str(b.label, 40), placeholder: str(b.placeholder, 60) };
    case 'button': return { type: 'button', label: str(b.label, 30) };
    case 'divider': return { type: 'divider' };
  }
  return null;
}

// Keep only known components and bounded strings. Returns null if nothing usable is left.
export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const blocks = arr(spec.blocks, 14).map(cleanBlock).filter(Boolean);
  if (!blocks.length) return null;
  const kind = str(spec.kind, 24).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'page';
  const name = str(spec.name, 40) || str(spec.title, 40) || 'Page';
  return {
    kind,
    name,
    match: [...new Set([kind, name.toLowerCase(), ...arr(spec.match, 12).map((w) => str(w, 30).toLowerCase())])].filter(Boolean),
    applied: arr(spec.applied, 10).map((x) => str(x, 20)),
    title: str(spec.title, 60) || 'For you',
    subtitle: str(spec.subtitle, 80),
    accent: ACCENTS.includes(spec.accent) ? spec.accent : 'orange',
    blocks,
    proposals: arr(spec.proposals, 2).map((p, i) => ({ id: str(p?.id, 20) || `p${i}`, label: str(p?.label ?? p, 40) })).filter((p) => p.label),
  };
}

// ---------- No-key fallback: one canned todo spec and keyword revisions ----------

const DUE = ['Today', 'Today', 'Tomorrow', 'Fri', 'Fri'];
const TAGS = ['High', 'High', 'Medium', 'Low', 'Medium'];

const REVISIONS = {
  due: {
    label: 'Add due dates',
    words: ['due', 'date', 'deadline', 'วันกำหนด', 'กำหนดส่ง', 'วันที่', 'เดดไลน์'],
    apply: (s) => eachChecklist(s, (items) => items.map((it, i) => ({ ...it, due: DUE[i % DUE.length] }))),
  },
  progress: {
    label: 'Add a progress bar',
    words: ['progress', 'bar', 'ความคืบหน้า', 'แถบ', 'หลอด'],
    apply: (s) => (s.blocks.some((b) => b.type === 'progress') ? s : { ...s, blocks: [{ type: 'progress', label: 'Done', value: 'auto' }, ...s.blocks] }),
  },
  priority: {
    label: 'Mark priorities',
    words: ['priorit', 'important', 'urgent', 'สำคัญ', 'ด่วน', 'ลำดับ'],
    apply: (s) => eachChecklist(s, (items) => items.map((it, i) => ({ ...it, tag: TAGS[i % TAGS.length] }))),
  },
  dark: {
    label: 'Switch to dark mode',
    words: ['dark', 'night', 'black', 'มืด', 'ดำ', 'กลางคืน'],
    apply: (s) => ({ ...s, accent: 'dark' }),
  },
};
const POOL = Object.keys(REVISIONS);

function eachChecklist(spec, fn) {
  return { ...spec, blocks: spec.blocks.map((b) => (b.type === 'checklist' ? { ...b, items: fn(b.items) } : b)) };
}

function nextProposals(spec, used) {
  return POOL.filter((id) => !used.includes(id)).slice(0, 2).map((id) => ({ id, label: REVISIONS[id].label }));
}

export function cannedTodo() {
  return {
    kind: 'todo',
    name: 'To-do list',
    match: TODO_WORDS,
    title: 'To-do list',
    subtitle: 'Made for you just now',
    accent: 'orange',
    blocks: [
      {
        type: 'checklist',
        items: [
          { text: 'Finish the demo slides' },
          { text: 'Rehearse the 3-minute pitch' },
          { text: 'Charge phone and mic' },
          { text: 'Buy snacks for the team' },
          { text: 'Submit the project link' },
        ],
      },
      { type: 'button', label: 'Looks good' },
    ],
    proposals: nextProposals(null, []),
    applied: [],
  };
}

const has = (text, words) => words.some((w) => text.includes(w));
const LIKE = ['like it', 'love it', 'perfect', 'looks good', 'great', 'done', 'that\'s it', 'ชอบ', 'ดีแล้ว', 'เยี่ยม', 'เสร็จ', 'พอแล้ว', 'โอเคแล้ว'];
const DISLIKE = ['ไม่ชอบ', "don't like", 'do not like', 'hate'];
const YES = ['yes', 'ok', 'okay', 'sure', 'both', 'เอา', 'ได้', 'ใช่', 'ทั้งคู่', 'ทั้งสอง', 'จัดไป'];
const BOTH = ['both', 'ทั้งคู่', 'ทั้งสอง', 'all'];
const ADD = /^(?:please\s+)?(?:add|เพิ่ม)\s*(.+)$/i;

// Revise a spec from what the user said, without a model.
// Returns { action: 'revise', spec } | { action: 'accept' } | { action: 'ask' }.
export function reviseByKeywords(spec, rawText) {
  const text = String(rawText || '').toLowerCase().trim();
  const used = spec.applied || [];
  if (has(text, DISLIKE)) return { action: 'ask' };

  let ids = POOL.filter((id) => has(text, REVISIONS[id].words));
  if (!ids.length && has(text, YES) && !has(text, LIKE)) {
    ids = (has(text, BOTH) ? spec.proposals : spec.proposals.slice(0, 1)).map((p) => p.id).filter((id) => REVISIONS[id]);
  }
  if (!ids.length && has(text, LIKE)) return { action: 'accept' };

  let next = spec;
  for (const id of ids) next = REVISIONS[id].apply(next);

  const added = String(rawText || '').trim().match(ADD);
  if (!ids.length && added) {
    next = eachChecklist(next, (items) => [...items, { text: added[1].slice(0, 80) }]);
    ids = ['add'];
  }
  if (!ids.length) return { action: 'ask' };

  const applied = [...used, ...ids];
  return { action: 'revise', spec: { ...next, applied, proposals: nextProposals(next, applied) } };
}
