// Calls to our own /api routes. On the deployed site a passcode gate protects them: the passcode
// is asked once, kept for this browser tab, and sent with every call. Locally there is no passcode.
const KEY = 'agentos.passcode';
const HEADER = 'x-agent-os-passcode';

const stored = () => {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
};

export function apiFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const code = stored();
  if (code) headers[HEADER] = code;
  return fetch(path, { ...opts, headers });
}

// Before the app starts: if the site needs a passcode and this tab has none (or a wrong one), ask.
export async function passcodeGate() {
  let health;
  try {
    health = await (await apiFetch('/api/health')).json();
  } catch {
    return; // no server health: nothing to gate
  }
  if (!health.passcode || health.authorized) return;
  document.body.classList.add('gated');
  const form = document.createElement('form');
  form.className = 'gate';
  form.dataset.testid = 'gate';
  form.innerHTML = '<p>Agent OS</p><input type="password" autocomplete="current-password" aria-label="Passcode" placeholder="Passcode"><button class="btn btn-allow">Enter</button><small hidden>Wrong passcode</small>';
  document.getElementById('phone').append(form);
  if (stored()) form.querySelector('small').hidden = false;
  form.querySelector('input').focus();
  await new Promise(() => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        sessionStorage.setItem(KEY, form.querySelector('input').value.trim());
      } catch { /* private mode: the gate asks again */ }
      location.reload();
    });
  });
}
