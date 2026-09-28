// Точка входа: загрузка данных модели, шрифтов и иконок, сборка сцен, seek(t) для рендера,
// проверка вёрстки и предпросмотр. Модель выбирается параметром ?product=<id> (файл products/<id>.js).
import { buildTimeline, WIDTH, HEIGHT, FPS } from '../timeline.js';
import { SCENE_IMPL, CHAPTERS } from './scenes.js';
import { prog, style, rng, clamp } from './engine.js';
import { applyTheme } from './themes.js';
import { checkLayout } from './layout.js';

const stage = document.getElementById('stage');
const params = new URLSearchParams(location.search);

async function loadIcons() {
  const nodes = [...document.querySelectorAll('[data-icon]')];
  const names = [...new Set(nodes.map((n) => n.dataset.icon))];
  const svgs = {};
  await Promise.all(
    names.map(async (name) => {
      const res = await fetch(`/node_modules/lucide-static/icons/${name}.svg`);
      if (!res.ok) throw new Error(`Нет иконки «${name}» (список: https://lucide.dev/icons)`);
      svgs[name] = (await res.text()).replace(/<!--[\s\S]*?-->/g, '').trim();
    }),
  );
  for (const n of nodes) n.innerHTML = svgs[n.dataset.icon];
}

async function loadFonts() {
  const sample = 'АБВГДЕЁЖЗабвгдеёжз ABCabc 0123456789 α × · — « »';
  await Promise.all(['400', '600', '800'].map((w) => document.fonts.load(`${w} 40px "Manrope Variable"`, sample)));
  await document.fonts.ready;
}

/** Мелкое статичное зерно поверх кадра — убирает полосы на тёмных градиентах. */
function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  const R = rng(1234);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (R() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  document.getElementById('grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
}

let SCENES = [];
let DURATION = 0;

// ───────── HUD: бренд, модель и «оглавление» с прогрессом по главам ─────────
const hud = {
  init(P) {
    this.el = document.getElementById('hud');
    document.getElementById('hud-brand').textContent = P.hud.brand;
    document.getElementById('hud-model').textContent = P.hud.model;
    this.toc = document.getElementById('hud-toc');
    this.chapters = SCENES.filter((s) => s.toc);
    this.toc.style.gridTemplateColumns = `repeat(${this.chapters.length}, 1fr)`;
    this.items = this.chapters.map((s, i) => {
      const item = document.createElement('div');
      item.innerHTML = `<div class="toc-bar"><div class="toc-fill"></div></div><div class="toc-name"></div>`;
      item.querySelector('.toc-name').textContent = `${String(i + 1).padStart(2, '0')} ${s.toc}`;
      this.toc.appendChild(item);
      return { s, fill: item.querySelector('.toc-fill'), name: item.querySelector('.toc-name') };
    });
  },
  render(T) {
    const first = this.chapters[0];
    const last = this.chapters[this.chapters.length - 1];
    const on = first ? prog(T, first.start + 0.1, 0.6) * (1 - prog(T, last.end - 0.3, 0.6)) : 0;
    this.el.style.opacity = on.toFixed(3);
    this.el.style.visibility = on > 0.001 ? 'visible' : 'hidden';
    for (const it of this.items) {
      const { s } = it;
      const k = clamp((T - s.start) / (s.dur - 0.25));
      it.fill.style.transform = `scaleX(${k.toFixed(4)})`;
      const active = T >= s.start + 0.25 && T < s.end - 0.25;
      it.name.style.color = active ? 'rgba(255,255,255,0.95)' : k >= 1 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
    }
  },
};

// ───────── Фон: медленно дрейфующие цветные пятна ─────────
const glows = [...document.querySelectorAll('.glow')];
function renderBg(T) {
  const intro = prog(T, 1.5, 2.5);
  glows.forEach((g, i) => {
    const ph = i * 2.1;
    style(g, {
      o: intro,
      x: Math.sin(T * 0.09 + ph) * 160,
      y: Math.cos(T * 0.07 + ph) * 110,
      s: 1 + 0.08 * Math.sin(T * 0.11 + ph),
    });
  });
}

// ───────── Переход между сценами ─────────
function sceneExit(el, t, dur) {
  // Уходящая сцена почти исчезает к моменту, когда у следующей начинают появляться элементы
  const k = prog(t, dur - 0.75, 0.6, 'inOutQuad');
  if (k <= 0) {
    el.style.opacity = 1;
    el.style.transform = 'none';
    el.style.filter = 'none';
    return;
  }
  el.style.opacity = (1 - k).toFixed(4);
  el.style.transform = `scale(${(1 + 0.025 * k).toFixed(4)})`;
  el.style.filter = `blur(${(7 * k).toFixed(2)}px)`;
}

export function seek(T) {
  for (const s of SCENES) {
    const on = T >= s.start && T < s.end;
    s.el.style.display = on ? 'block' : 'none';
    if (!on) continue;
    const t = T - s.start;
    SCENE_IMPL[s.id].render(t, s.dur);
    if (s.id !== 'outro') sceneExit(s.el, t, s.dur);
  }
  hud.render(T);
  renderBg(T);
}

/** Моменты, когда сцена полностью собрана: по ним проверяется вёрстка и собираются листы превью. */
function checkPoints() {
  const pts = [];
  for (const s of SCENES) {
    const times = SCENE_IMPL[s.id].checkTimes?.(s.dur) || [s.dur - 1.0];
    times.forEach((t) => pts.push({ id: s.id, T: s.start + t }));
  }
  return pts;
}

/** Проверка вёрстки во всех сценах. Возвращает [{ id, T, issues: [...] }]. */
function checkAll() {
  return checkPoints().map(({ id, T }) => {
    seek(T);
    const s = SCENES.find((x) => x.id === id);
    const safe = id === 'outro' || id === 'intro' ? { l: 96, r: 1824, t: 40, b: 1040 } : undefined;
    return { id, T, issues: checkLayout(s.el, safe) };
  });
}

function fit() {
  const k = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
  stage.style.transform = k === 1 ? 'none' : `translate(${(innerWidth - WIDTH * k) / 2}px, ${(innerHeight - HEIGHT * k) / 2}px) scale(${k})`;
}

async function loadProduct() {
  const id = params.get('product');
  if (!id) throw new Error('Укажите модель в адресе: ?product=<имя файла из папки products без .js>');
  const mod = await import(`/products/${id}.js`);
  return mod.default;
}

async function init() {
  const P = await loadProduct();
  const theme = applyTheme(P.theme || 'neutral');
  document.title = `${P.hud.model} — инфографика`;
  ({ scenes: SCENES, duration: DURATION } = buildTimeline(P));

  // Сборка разметки сцен из данных модели
  let chapter = 0;
  for (const s of SCENES) {
    const el = document.createElement('section');
    el.className = 'scene';
    el.id = `s-${s.id}`;
    stage.insertBefore(el, document.getElementById('hud'));
    s.el = el;
    const names = CHAPTERS[s.id];
    if (names) {
      const [kicker, toc] = Array.isArray(names) ? names : [names, names];
      chapter++;
      s.kicker = `${String(chapter).padStart(2, '0')} · ${P[s.id]?.kicker || kicker}`;
      s.toc = P[s.id]?.toc || toc;
    }
    const impl = SCENE_IMPL[s.id];
    if (!P[s.id]) throw new Error(`В данных модели нет раздела «${s.id}»`);
    el.innerHTML = impl.build(P, { theme, kicker: s.kicker });
  }
  await Promise.all([loadIcons(), loadFonts()]);
  makeGrain();

  // Подгонка текста и инициализация: сцена временно видима, чтобы можно было измерить надписи
  for (const s of SCENES) {
    s.el.style.display = 'block';
    SCENE_IMPL[s.id].fit?.(s.el, P);
    SCENE_IMPL[s.id].init(s.el, P, { theme, kicker: s.kicker });
    s.el.style.display = 'none';
  }
  hud.init(P);
  fit();
  addEventListener('resize', fit);

  window.seek = seek;
  window.DURATION = DURATION;
  window.FPS = FPS;
  window.checkPoints = checkPoints;
  window.checkAll = checkAll;
  window.productFile = P.file;

  if (params.has('render')) {
    seek(0);
  } else if (params.has('t')) {
    seek(parseFloat(params.get('t')));
  } else {
    // Предпросмотр в реальном времени; пробел — пауза, стрелки — перемотка на 5 с
    let base = 0;
    let startedAt = performance.now();
    let paused = false;
    const now = () => (paused ? base : base + (performance.now() - startedAt) / 1000) % DURATION;
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        base = now();
        paused = !paused;
        startedAt = performance.now();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        base = Math.max(0, now() + (e.code === 'ArrowRight' ? 5 : -5));
        startedAt = performance.now();
      }
    });
    const loop = () => {
      seek(now());
      requestAnimationFrame(loop);
    };
    loop();
  }
  window.__ready = true;
}

init().catch((err) => {
  window.__error = String(err && err.stack ? err.stack : err);
  console.error(err);
  const box = document.createElement('pre');
  box.style.cssText = 'position:absolute;left:40px;top:40px;color:#ff8080;font:20px monospace;white-space:pre-wrap;max-width:1800px';
  box.textContent = window.__error;
  stage.appendChild(box);
});
