// Автоподгонка текста под доступную ширину и проверка вёрстки кадра:
// наложения надписей, выход за безопасную зону и за границы карточек.

const stageScale = () => document.getElementById('stage').getBoundingClientRect().width / 1920;

function textRange(node) {
  const r = document.createRange();
  r.selectNodeContents(node);
  return r;
}

/** Уменьшает шрифт элемента, пока его текст в одну строку не поместится в maxWidth пикселей. */
export function fitText(el, maxWidth, minPx = 14) {
  if (!el) return;
  const k = stageScale();
  const ws = el.style.whiteSpace;
  el.style.whiteSpace = 'nowrap';
  let size = parseFloat(getComputedStyle(el).fontSize);
  for (let guard = 0; guard < 120; guard++) {
    if (textRange(el).getBoundingClientRect().width / k <= maxWidth || size <= minPx) break;
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  el.style.whiteSpace = ws;
}

function visible(el, root) {
  let op = 1;
  for (let n = el; n && n !== root.parentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    op *= parseFloat(cs.opacity);
  }
  return op > 0.3;
}

const short = (s) => (s.length > 32 ? `${s.slice(0, 30)}…` : s);

/**
 * Проверяет видимые надписи сцены. Возвращает список проблем на русском.
 * safe — безопасная зона кадра (за её пределами текст может срезаться или наезжать на HUD).
 */
export function checkLayout(root, safe = { l: 96, r: 1824, t: 90, b: 990 }) {
  const k = stageScale();
  const scale = (r) => ({ left: r.left / k, right: r.right / k, top: r.top / k, bottom: r.bottom / k });
  const items = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!visible(el, root)) continue;
    // Прямоугольник строки включает поля шрифта сверху и снизу — сужаем его до высоты букв (±0,42 em)
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const rects = [...textRange(node).getClientRects()]
      .map(scale)
      .filter((r) => r.right - r.left > 1 && r.bottom - r.top > 1)
      .map((r) => {
        const mid = (r.top + r.bottom) / 2;
        const half = Math.min((r.bottom - r.top) / 2, fs * 0.42);
        return { left: r.left, right: r.right, top: mid - half, bottom: mid + half };
      });
    if (!rects.length) continue;
    items.push({ el, text, rects, box: el.closest('[data-box]') });
  }

  const issues = [];
  // Карточки целиком внутри безопасной зоны
  for (const box of root.querySelectorAll('[data-box]')) {
    if (!visible(box, root)) continue;
    const b = scale(box.getBoundingClientRect());
    if (b.left < safe.l - 30 || b.right > safe.r + 30 || b.bottom > safe.b + 10) {
      const text = box.textContent.replace(/\s+/g, ' ').trim();
      issues.push(`карточка «${short(text)}» выходит за край кадра`);
    }
  }
  // Надписи не должны заезжать на картинки, помеченные data-avoid (телевизор, кристалл процессора…)
  const avoid = [...root.querySelectorAll('[data-avoid]')].filter((a) => visible(a, root)).map((a) => ({ el: a, r: scale(a.getBoundingClientRect()) }));
  for (const it of items) {
    for (const a of avoid) {
      if (a.el.contains(it.el)) continue;
      const hit = it.rects.some((p) => Math.min(p.right, a.r.right) - Math.max(p.left, a.r.left) > 3 && Math.min(p.bottom, a.r.bottom) - Math.max(p.top, a.r.top) > 3);
      if (hit) issues.push(`«${short(it.text)}» заходит на картинку`);
    }
  }
  for (const it of items) {
    if (it.rects.some((r) => r.left < safe.l || r.right > safe.r || r.top < safe.t || r.bottom > safe.b)) {
      issues.push(`«${short(it.text)}» выходит за безопасную зону кадра`);
    }
    if (it.box) {
      const b = scale(it.box.getBoundingClientRect());
      // Текст должен стоять внутри карточки с небольшим отступом от краёв
      if (it.rects.some((r) => r.left < b.left + 8 || r.right > b.right - 8 || r.top < b.top + 6 || r.bottom > b.bottom - 6)) {
        issues.push(`«${short(it.text)}» не помещается в свою карточку`);
      }
    }
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit = a.rects.some((p) =>
        b.rects.some((q) => {
          const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
          const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
          return w > 3 && h > 3;
        }),
      );
      if (hit) issues.push(`«${short(a.text)}» накладывается на «${short(b.text)}»`);
    }
  }
  return [...new Set(issues)];
}
