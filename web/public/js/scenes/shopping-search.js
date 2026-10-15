import { apiFetch } from '../api.js';

export function mountProductSearch(el, data, agent) {
  const h = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const form = h('form', null, 'product-search-form');
  const label = h('label', 'อยากหาสินค้าอะไร');
  const input = h('input'); input.type = 'search'; input.maxLength = 250; input.required = true;
  input.placeholder = 'เช่น หูฟังประชุม งบ 1,500 บาท'; input.value = typeof data.query === 'string' ? data.query.slice(0, 250) : '';
  label.append(input);
  const submit = h('button', 'ค้นหา', 'secretary-button'); submit.type = 'submit';
  form.append(label, submit);
  const status = h('p', 'ใส่ชื่อสินค้าและงบที่ต้องการ', 'secretary-note'); status.setAttribute('role', 'status');
  const results = h('div'); results.dataset.testid = 'product-results';
  el.append(h('p', 'ค้นเว็บจริง · Tavily', 'secretary-badge'), h('h1', 'หาของให้คุณ', 'secretary-title'), form,
    h('p', 'ข้อมูลจากหน้าที่ค้นพบ ราคาและสต็อกอาจเปลี่ยน กรุณาตรวจที่ร้านก่อนซื้อ', 'secretary-note'), status, results);
  let controller = null;
  let latest = 0;
  const search = async (query) => {
    query = query.trim().slice(0, 250);
    if (!query) return;
    const mine = ++latest;
    controller?.abort(); controller = new AbortController();
    results.replaceChildren(); status.textContent = 'กำลังค้นสินค้า…'; submit.disabled = true;
    try {
      const res = await apiFetch('/api/search', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: `${query} ราคา ซื้อ ประเทศไทย` }), signal: controller.signal,
      });
      const out = await res.json();
      if (!agent.alive() || mine !== latest) return;
      if (!res.ok || out.error) throw new Error(out.error || 'search failed');
      for (const item of (out.results || []).slice(0, 5)) {
        let url;
        try { url = new URL(item.url); } catch { continue; }
        if (!['https:', 'http:'].includes(url.protocol)) continue;
        const card = h('article', null, 'secretary-card product-result');
        const link = h('a', item.title || url.hostname);
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const heading = h('h2'); heading.append(link);
        card.append(heading, h('p', url.hostname, 'secretary-note'), h('p', item.content));
        results.append(card);
      }
      status.textContent = results.childElementCount ? `พบ ${results.childElementCount} แหล่งข้อมูล · เปิดลิงก์เพื่อดูรายละเอียดที่ร้าน` : 'ยังไม่พบผลลัพธ์ ลองระบุยี่ห้อหรือรุ่นให้ชัดขึ้น';
    } catch (err) {
      if (err.name === 'AbortError' || !agent.alive() || mine !== latest) return;
      status.textContent = 'ค้นหาไม่สำเร็จ อาจติดโควตาหรือยังไม่ได้เปิดบริการ กรุณาลองอีกครั้ง';
    } finally { if (mine === latest) submit.disabled = false; }
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); search(input.value); });
  if (input.value.trim()) search(input.value);
  return {
    destroy: () => { latest++; controller?.abort(); },
    state: () => ({ search: true }),
    onAction: () => {},
  };
}
