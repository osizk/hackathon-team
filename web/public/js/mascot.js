// Original JPEGs stay untouched. Remove only dark background connected to the
// canvas edges, preserving the robot's enclosed dark face and purple details.
export const POSES = {
  listening: '01-listening', sad: '02-sad', idle: '03-idle',
  jump: '04-jump', running: '05-running', speaking: '06-thumbs-up',
};
const images = new Map();
const labels = {
  idle: 'Q-Bot waiting', listening: 'Q-Bot listening', speaking: 'Q-Bot speaking',
  running: 'Q-Bot working', jump: 'Q-Bot celebrating', sad: 'Q-Bot concerned',
};

function imageFor(pose) {
  if (images.has(pose)) return images.get(pose);
  const ready = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const w = canvas.width = image.naturalWidth;
      const h = canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const frame = ctx.getImageData(0, 0, w, h);
      const pixels = frame.data;
      const seen = new Uint8Array(w * h);
      const queue = new Uint32Array(w * h);
      let head = 0, tail = 0;
      const visit = (p) => {
        if (seen[p]) return;
        seen[p] = 1;
        const i = p * 4;
        const light = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (light > 65) return;
        pixels[i + 3] = Math.round(255 * Math.max(0, (light - 20) / 45));
        queue[tail++] = p;
      };
      for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
      while (head < tail) {
        const p = queue[head++];
        if (p % w) visit(p - 1);
        if (p % w < w - 1) visit(p + 1);
        if (p >= w) visit(p - w);
        if (p < w * (h - 1)) visit(p + w);
      }
      ctx.putImageData(frame, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = `/img/ubot/${POSES[pose]}.jpeg`;
  });
  images.set(pose, ready);
  return ready;
}

export function initMascot() {
  const mascot = document.getElementById('mascot');
  const stage = document.getElementById('stage');
  const body = document.body;
  let current;
  const paint = (el, pose) => {
    if (el.dataset.mascotPose === pose && el.dataset.ready === '1') return;
    el.dataset.mascotPose = pose;
    el.style.setProperty('--flip', ['idle', 'running'].includes(pose) ? '-1' : '1');
    el.alt = labels[pose];
    imageFor(pose).then((src) => {
      if (el.dataset.mascotPose !== pose) return; // a newer state already won
      el.src = src;
      el.dataset.ready = '1';
      el.dataset.renderedPose = pose;
      if (el === mascot) {
        body.style.setProperty('--mascot-image', `url("${src}")`);
        body.style.setProperty('--mascot-flip', ['idle', 'running'].includes(pose) ? '-1' : '1');
      }
    }).catch(() => { el.dataset.ready = '1'; });
  };
  const update = () => {
    // Only the active scene counts: leaving scenes remain mounted during exit.
    const scene = stage.querySelector('.scene:not(.leaving)');
    const pose = body.classList.contains('listening') ? 'listening'
      : scene?.classList.contains('denied') ? 'sad'
      : scene?.classList.contains('signed-up') ? 'running'
      : scene?.matches('.paid, .rebooked') ? 'jump'
      : body.classList.contains('thinking') ? 'running'
      : body.classList.contains('speaking') ? 'speaking' : 'idle';
    if (pose !== current) { current = pose; paint(mascot, pose); }
    for (const image of stage.querySelectorAll('img[data-mascot-pose]')) paint(image, image.dataset.mascotPose);
  };
  new MutationObserver(update).observe(body, { attributes: true, attributeFilter: ['class', 'data-scene'] });
  new MutationObserver(update).observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  update();
  for (const pose of Object.keys(POSES)) imageFor(pose).catch(() => {});
}
