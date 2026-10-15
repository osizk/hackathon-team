// Generated scene: draws a JSON UI spec from a fixed component set.
// Every string goes in with textContent; model-written HTML or JS is never run.
// The agent asks if the user likes it; spoken answers revise the spec and it redraws in place.
// A page the user likes can be kept as a saved scene in localStorage.
import { T } from '../timing.js';
import { apiFetch } from '../api.js';
import { pageLayout, tagTone } from '../genui.js';

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

const num = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : String(n));

function drawBlock(b, spec, onChange, onButton, { lead = false, primary = false } = {}) {
  switch (b.type) {
    case 'text': return h('p', lead ? 'g-text g-lead' : 'g-text', b.text);
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
      if (!b.items.length) return h('p', 'g-empty', 'ยังไม่มีรายการ · No items yet. Say "add …"');
      const ul = h('ul', 'g-checklist');
      b.items.forEach((item) => {
        const li = h('li', item.done ? 'done' : '');
        li.setAttribute('role', 'checkbox');
        li.setAttribute('aria-checked', String(item.done));
        li.tabIndex = 0;
        const box = h('span', 'g-box', item.done ? '✓' : '');
        const main = h('span', 'g-item-main');
        main.append(h('span', 'g-item', item.text));
        // Tag and due date sit under the text as small chips, so long items keep the full width.
        if (item.tag || item.due) {
          const meta = h('span', 'g-meta');
          if (item.tag) meta.append(h('em', `g-tag g-tag-${tagTone(item.tag)}`, item.tag));
          if (item.due) meta.append(h('small', 'g-due', item.due));
          main.append(meta);
        }
        li.append(box, main);
        const toggle = () => { item.done = !item.done; onChange(); };
        li.addEventListener('click', toggle);
        li.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
        });
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
        // Bar and its value sit in a track, so every bar shares one baseline.
        const col = h('div', 'g-col');
        const pct = Math.round((x.value / max) * 100);
        const track = h('div', 'g-track');
        const bar = h('i');
        bar.style.height = `${pct}%`;
        const value = h('b', null, num(x.value));
        value.style.bottom = `${pct}%`;
        track.append(value, bar);
        const label = h('span', null, x.label);
        label.title = x.label;
        col.append(track, label);
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
      // One primary action per page; any other button is drawn as a quieter outline.
      const btn = h('button', primary ? 'btn btn-allow g-button' : 'btn g-button g-button-secondary', b.label);
      btn.addEventListener('click', () => onButton(b.label));
      return btn;
    }
    case 'divider': return h('hr', 'g-divider');
    case 'image': {
      // Grey frame at once; the picture fades in when the server has it. On any error the frame stays with an icon.
      const fig = h('figure', 'g-image');
      fig.dataset.testid = 'g-image';
      const frame = h('div', 'g-frame');
      fig.append(frame);
      if (b.caption) fig.append(h('figcaption', null, b.caption));
      apiFetch('/api/image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: b.prompt, scene: spec.kind }) })
        .then((r) => r.json())
        .then((out) => {
          if (!out.url) throw new Error(out.error || 'no image');
          const img = h('img');
          img.alt = b.caption || b.prompt;
          img.onload = () => fig.classList.add('loaded');
          img.onerror = () => fig.classList.add('failed');
          img.src = out.url;
          frame.append(img);
        })
        .catch(() => fig.classList.add('failed'));
      return fig;
    }
    case 'steps': {
      const ol = h('ol', 'g-steps');
      b.items.forEach((t) => ol.append(h('li', null, t)));
      return ol;
    }
    case 'sources': {
      // Web search sources: real links (http/https only, checked in validateSpec).
      const box = h('div', 'g-sources');
      box.dataset.testid = 'g-sources';
      box.append(h('span', 'g-sources-label', 'Sources'));
      const ul = h('ul');
      b.items.forEach((i) => {
        // The whole row is the link, so it is a full-size tap target.
        const a = h('a');
        a.href = i.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.append(h('span', null, i.title), h('small', null, new URL(i.url).hostname.replace(/^www\./, '')));
        const li = h('li');
        li.append(a);
        ul.append(li);
      });
      box.append(ul);
      return box;
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
    const head = h('header', 'g-head');
    head.append(badge, title);
    if (spec.subtitle) head.append(h('p', 'g-subtitle', spec.subtitle));
    const body = h('div', 'g-body');
    const onChange = () => draw();
    const onButton = (label) => agent.request(label);
    pageLayout(spec.blocks).forEach((g) => {
      if (g.kind === 'stats') {
        const row = h('div', 'g-stats');
        g.blocks.forEach((b) => row.append(drawBlock(b, spec, onChange, onButton)));
        body.append(row);
      } else body.append(drawBlock(g.block, spec, onChange, onButton, g));
    });
    el.append(head, body);

    // The agent's question as chips: change ideas first, the answer that ends the step last.
    const chips = h('div', 'g-chips');
    chips.dataset.testid = 'g-chips';
    const options =
      stage === 'keep' ? ['Keep it', 'No thanks'] : stage === 'review' ? [...spec.proposals.map((p) => p.label), 'I like it'] : [];
    const finalChip = stage === 'keep' ? 'Keep it' : 'I like it';
    if (options.length) chips.append(h('p', 'g-chips-label', stage === 'keep' ? 'เก็บหน้านี้ไว้ใช้ไหม · Keep this page?' : 'ปรับหน้านี้ · Change this page'));
    options.forEach((label) => {
      const chip = h('button', label === finalChip ? 'g-chip g-chip-final' : 'g-chip', label);
      chip.addEventListener('click', () => agent.request(label));
      chips.append(chip);
    });
    if (options.length) el.append(chips);
    if (flash) setTimeout(() => el.classList.remove('g-flash'), T(700));
  };
  draw();
  // The offline todo asks its question after it has grown (the intro line said what it was doing).
  if (stage === 'review' && data.ask) agent.say(data.ask);

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
