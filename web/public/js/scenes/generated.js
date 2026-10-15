// Generated scene: draws a JSON UI spec from a fixed component set.
// Every string goes in with textContent; model-written HTML or JS is never run.
// The agent asks if the user likes it; spoken answers revise the spec and it redraws in place.
// A page the user likes can be kept as a saved scene in localStorage.
import { T } from '../timing.js';

const STORE = 'agentos.savedScenes';

export function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}');
  } catch {
    return {};
  }
}

function saveScene(spec) {
  if (spec.urgency && spec.urgency !== 'none') return false; // first-aid pages are never kept
  try {
    const all = loadSaved();
    all[spec.kind] = { kind: spec.kind, name: spec.name, match: spec.match, spec, savedAt: new Date().toISOString() };
    localStorage.setItem(STORE, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// What the router needs to find kept pages again.
export const savedIndex = () => Object.values(loadSaved()).map(({ kind, match }) => ({ kind, match }));

// Reopen a kept page with fresh data: same layout, items reset, today's date.
function refresh(spec) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return {
    ...spec,
    subtitle: `Saved scene · ${today}`,
    blocks: spec.blocks.map((b) => (b.type === 'checklist' ? { ...b, items: b.items.map((i) => ({ ...i, done: false })) } : b)),
  };
}

const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = String(text);
  return el;
};

function checklistDone(spec) {
  const items = spec.blocks.filter((b) => b.type === 'checklist').flatMap((b) => b.items);
  return items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;
}

function drawBlock(b, spec, onChange, onButton) {
  switch (b.type) {
    case 'text': return h('p', 'g-text', b.text);
    case 'stat': {
      const el = h('div', 'g-stat');
      el.append(h('b', null, b.value), h('span', null, b.label));
      return el;
    }
    case 'progress': {
      const value = b.value === 'auto' ? checklistDone(spec) : b.value;
      const el = h('div', 'g-progress');
      el.dataset.testid = 'g-progress';
      const label = h('div', 'g-progress-label');
      label.append(h('span', null, b.label), h('b', null, `${value}%`));
      const bar = h('div', 'g-bar');
      const fill = h('i');
      fill.style.width = `${value}%`;
      bar.append(fill);
      el.append(label, bar);
      return el;
    }
    case 'checklist': {
      const ul = h('ul', 'g-checklist');
      b.items.forEach((item) => {
        const li = h('li', item.done ? 'done' : '');
        const box = h('span', 'g-box', item.done ? '✓' : '');
        li.append(box, h('span', 'g-item', item.text));
        if (item.tag) li.append(h('em', `g-tag g-tag-${item.tag.toLowerCase()}`, item.tag));
        if (item.due) li.append(h('small', 'g-due', item.due));
        li.addEventListener('click', () => { item.done = !item.done; onChange(); });
        ul.append(li);
      });
      return ul;
    }
    case 'list': {
      const ul = h('ul', 'g-list');
      b.items.forEach((t) => ul.append(h('li', null, t)));
      return ul;
    }
    case 'card': {
      const el = h('article', 'g-card');
      el.append(h('h3', null, b.title), h('p', null, b.text));
      return el;
    }
    case 'chart': {
      const el = h('div', 'g-chart');
      const max = Math.max(1, ...b.bars.map((x) => x.value));
      b.bars.forEach((x) => {
        const col = h('div', 'g-col');
        const bar = h('i');
        bar.style.height = `${Math.round((x.value / max) * 100)}%`;
        col.append(h('b', null, x.value), bar, h('span', null, x.label));
        el.append(col);
      });
      return el;
    }
    case 'field': {
      const el = h('label', 'g-field', b.label);
      const input = h('input');
      input.placeholder = b.placeholder || '';
      el.append(input);
      return el;
    }
    case 'button': {
      const btn = h('button', 'btn btn-allow g-button', b.label);
      btn.addEventListener('click', () => onButton(b.label));
      return btn;
    }
    case 'divider': return h('hr', 'g-divider');
    case 'steps': {
      const ol = h('ol', 'g-steps');
      b.items.forEach((t) => ol.append(h('li', null, t)));
      return ol;
    }
    case 'call': {
      // Only emergency numbers reach here (checked on the server); digits only.
      const a = h('a', 'g-call', `📞 ${b.label}`);
      a.href = `tel:${String(b.number).replace(/\D/g, '')}`;
      a.dataset.testid = 'g-call';
      return a;
    }
  }
  return h('div');
}

export default function mountGenerated(el, data, agent) {
  let fromSaved = false;
  let spec = data.spec;
  if (data.savedKind) {
    const kept = loadSaved()[data.savedKind];
    if (kept) {
      spec = refresh(kept.spec);
      fromSaved = true;
    }
  }
  if (!spec) {
    agent.close();
    return {};
  }
  let urgent = Boolean(spec.urgency && spec.urgency !== 'none');
  let stage = urgent ? 'urgent' : fromSaved ? 'saved' : 'review';
  let version = 0;

  const draw = (flash = false) => {
    el.className = `scene scene-generated g-accent-${spec.accent}${flash ? ' g-flash' : ''}`;
    el.dataset.scene = 'generated';
    el.dataset.version = String(version);
    el.dataset.stage = stage;
    el.replaceChildren();
    const badge = h('p', `g-badge${urgent ? ' g-badge-urgent' : ''}`, urgent ? 'First aid' : fromSaved ? 'Saved scene' : 'Generated for you');
    badge.dataset.testid = 'g-badge';
    const title = h('h1', 'g-title', spec.title);
    title.dataset.testid = 'g-title';
    el.append(badge, title);
    if (spec.subtitle) el.append(h('p', 'g-subtitle', spec.subtitle));
    spec.blocks.forEach((b) => el.append(drawBlock(b, spec, () => draw(), (label) => agent.request(label))));

    const chips = h('div', 'g-chips');
    chips.dataset.testid = 'g-chips';
    const options =
      stage === 'keep' ? ['Keep it', 'No thanks'] : stage === 'review' ? [...spec.proposals.map((p) => p.label), 'I like it'] : [];
    options.forEach((label) => {
      const chip = h('button', 'g-chip', label);
      chip.addEventListener('click', () => agent.request(label));
      chips.append(chip);
    });
    if (options.length) el.append(chips);
    if (flash) setTimeout(() => el.classList.remove('g-flash'), T(700));
  };
  draw();

  return {
    state: () => ({ spec, stage: stage === 'saved' ? 'review' : stage }),
    async onAction(action, res, talking) {
      if (action === 'urgent' && res?.spec) {
        spec = res.spec;
        urgent = true;
        stage = 'urgent';
        version += 1;
        draw(true);
        return;
      }
      if (urgent && action !== 'close') return;
      if (action === 'revise' && res.spec) {
        spec = res.spec;
        version += 1;
        stage = 'review';
        draw(true);
      } else if (action === 'accept') {
        stage = 'keep';
        draw();
      } else if (action === 'keep') {
        saveScene(spec);
        stage = 'kept';
        fromSaved = true;
        draw(true);
        await talking;
        await agent.wait(500);
        agent.close();
      } else if (action === 'close') {
        await talking;
        agent.close();
      }
    },
  };
}
