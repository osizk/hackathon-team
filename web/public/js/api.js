// Calls to our own /api routes, and the switch to offline mode.
// The server answers `offline: 'limit' | 'credit'` when today's usage limit is reached or the
// ElevenLabs credit ran out. The page then switches to its offline brain (keyword router,
// cached MP3s, the browser's voice) by itself and says so in one short line.
const NOTICE = {
  limit: 'โหมดออฟไลน์: วันนี้ใช้ AI สดครบโควต้าแล้ว · Offline mode: today’s live limit is used up',
  credit: 'โหมดออฟไลน์: เครดิตเสียงหมด · Offline mode: the voice credit ran out',
};
const listeners = [];

export const offline = { reason: null };

// fn(reason) runs once, when the page goes offline (live-agent.js ends the live session).
export const onOffline = (fn) => listeners.push(fn);

export function goOffline(reason) {
  if (offline.reason || !NOTICE[reason]) return;
  offline.reason = reason;
  document.body.dataset.offline = reason;
  const el = document.getElementById('notice');
  if (el) {
    el.textContent = NOTICE[reason];
    el.hidden = false;
  }
  console.info('[agent] switched to offline mode:', reason);
  listeners.forEach((fn) => fn(reason));
}

// Like fetch; an answer that says offline switches the page offline (the caller still gets it).
export async function apiFetch(path, opts = {}) {
  const res = await fetch(path, opts);
  if (res.status === 429 && res.headers.get('content-type')?.includes('json')) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.offline) goOffline(body.offline);
  }
  return res;
}
