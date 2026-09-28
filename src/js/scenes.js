// Сцены ролика. Разметка строится из данных модели (products/<id>.js).
// Жизненный цикл сцены: build(P, C) → HTML, fit(root, P) — подгонка текста,
// init(root, P, C) — один раз, render(t, dur) — на каждый кадр (t — локальное время сцены).
import { prog, lerp, clamp, style, reveal, fmt, E } from './engine.js';
import { createTV, paintRibbons, paintPixels, paintNight, paintLandscape } from './draw.js';
import { fitText } from './layout.js';
import { rgba, tint } from './themes.js';
import { num } from '../validate.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icon = (name, cls = '') => `<span class="${cls} icon" data-icon="${esc(name)}"></span>`;

function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function gradientDef(root, id, stops) {
  const defs = root.querySelector('defs') || svg('defs', {}, root);
  const g = svg('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  stops.forEach((c, i) => svg('stop', { offset: i / (stops.length - 1), 'stop-color': c }, g));
  return `url(#${id})`;
}

/** Рисование линии: у пути задан pathLength=1, поэтому k — доля длины. */
function draw(el, k) {
  el.style.strokeDasharray = '1 1';
  el.style.strokeDashoffset = (1 - k).toFixed(4);
  el.style.opacity = k > 0.001 ? 1 : 0;
}

/** Точка на пути (пути не меняются, длину считаем один раз). */
function pointAt(path, k) {
  if (!path._len) path._len = path.getTotalLength();
  return path.getPointAtLength(clamp(k) * path._len);
}

/** «8,3 млн» → части для анимации числа. count: true — от нуля, { from } — от заданного значения. */
function counter(value, count) {
  if (!count) return null;
  const m = String(value).match(/^(.*?)(\d+(?:,\d+)?)(.*)$/);
  if (!m) return null;
  return {
    pre: m[1],
    post: m[3],
    from: typeof count === 'object' && 'from' in count ? count.from : 0,
    to: parseFloat(m[2].replace(',', '.')),
    digits: (m[2].split(',')[1] || '').length,
  };
}
const counterText = (c, k) => `${c.pre}${fmt(lerp(c.from, c.to, k), c.digits)}${c.post}`;

const head = (id, C, title, extra = '', cls = '') =>
  `<div class="abs head${cls}" id="${id}"><div class="kicker">${esc(C.kicker)}</div><div class="title">${title}</div>${extra}</div>`;

// ─────────────────────────────── Заставка ───────────────────────────────
const intro = {
  build(P) {
    const I = P.intro;
    return `
      <div class="abs" id="intro-tvbox"></div>
      <div class="abs" id="intro-text">
        ${I.pill ? `<div class="pill" id="intro-pill"><span class="pill-dot"></span>${esc(I.pill)}</div>` : ''}
        <div class="title-xl" id="intro-t1">${esc(I.title[0])}</div>
        ${I.title[1] ? `<div class="title-xl grad-text" id="intro-t2">${esc(I.title[1])}</div>` : ''}
        <div class="intro-sub" id="intro-sub">${esc(I.sub)}</div>
        <div class="chips" id="intro-chips">${(I.chips || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      </div>`;
  },
  fit(root) {
    $$('.title-xl', root).forEach((el) => fitText(el, 720, 56));
    fitText($('#intro-sub', root), 720, 20);
  },
  init(root, P, C) {
    this.theme = C.theme;
    this.box = $('#intro-tvbox', root);
    this.tv = createTV(this.box, 1100, P.stand);
    this.tv.frame.dataset.avoid = '';
    this.parts = ['#intro-pill', '#intro-t1', '#intro-t2', '#intro-sub'].map((s) => $(s, root));
    this.chips = $$('.chip', root);
  },
  render(t) {
    const tv = this.tv;
    // 1) из темноты проступает силуэт
    const rim = prog(t, 0.1, 1.0, 'outQuad');
    tv.frame.style.opacity = rim;
    tv.stand.style.opacity = rim;
    // 2) горизонтальная линия света, 3) экран раскрывается по вертикали
    const lx = prog(t, 0.55, 0.65, 'inOutCubic');
    const ly = prog(t, 1.15, 1.0, 'inOutCubic');
    tv.line.style.transform = `scaleX(${lx.toFixed(4)})`;
    tv.line.style.opacity = lx > 0 ? (1 - prog(t, 1.15, 0.35, 'outQuad')).toFixed(3) : 0;
    const inset = 50 * (1 - ly);
    tv.canvas.style.clipPath = `inset(${inset.toFixed(3)}% 0 ${inset.toFixed(3)}% 0)`;
    tv.floor.style.opacity = ly;
    paintRibbons(tv.ctx, tv.w, tv.h, t + 3, 0.35 + 0.65 * ly, this.theme);

    // 4) телевизор уезжает вправо, слева появляется название
    const mv = prog(t, 2.35, 1.25, 'inOutCubic');
    const drift = Math.sin(t * 0.5) * 4;
    style(this.box, { x: 330 * mv, y: 12 * mv + drift * mv, s: lerp(1, 0.78, mv) });

    const [pill, t1, t2, sub] = this.parts;
    if (pill) reveal(pill, t, 2.75, { dx: -30, dy: 0 });
    reveal(t1, t, 2.9, { dx: -40, dy: 0, blur: 12 });
    if (t2) reveal(t2, t, 3.05, { dx: -40, dy: 0, blur: 12 });
    reveal(sub, t, 3.3, { dy: 24 });
    this.chips.forEach((c, i) => reveal(c, t, 3.55 + i * 0.13, { dy: 20, s0: 0.92 }));
  },
};

// ─────────────────────────────── Экран ───────────────────────────────
const screen = {
  build(P, C) {
    const S = P.screen;
    const [a1, a2, a3] = C.theme.stops;
    const badge = (s) => {
      if (s.badge === 'pixels') return '<canvas class="pix" width="116" height="116"></canvas>';
      if (s.badge) return `<span class="badge-4k">${esc(s.badge)}</span>`;
      return icon(s.icon || 'monitor');
    };
    return `
      ${head('scr-head', C, esc(S.title))}
      <div class="abs" id="scr-tvbox"></div>
      <svg class="abs" id="scr-diag" width="860" height="484" viewBox="0 0 860 484">
        <defs>
          <linearGradient id="gDiag" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="${a1}"/><stop offset="0.5" stop-color="${a2}"/><stop offset="1" stop-color="${a3}"/>
          </linearGradient>
        </defs>
        <line id="scr-diag-line" x1="10" y1="474" x2="850" y2="10" stroke="url(#gDiag)" stroke-width="4" stroke-linecap="round" pathLength="1"/>
        <circle id="scr-diag-a" cx="10" cy="474" r="9" fill="${a1}"/>
        <circle id="scr-diag-b" cx="850" cy="10" r="9" fill="${a3}"/>
      </svg>
      <div class="abs" id="scr-size">
        <div class="size-num">${num(S.inches)}<span class="inch">"</span></div>
        <div class="size-cm">${esc(S.diagonal)}</div>
      </div>
      <div class="abs" id="scr-stats">${S.stats
        .map(
          (s) => `
        <div class="srow">
          <div class="sbadge">${badge(s)}</div>
          <div class="stext"><div class="snum${s.accent ? ' grad-text' : ''}">${esc(s.value)}</div><div class="slabel">${esc(s.label)}</div></div>
        </div>`,
        )
        .join('')}</div>`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    $$('.snum', root).forEach((el) => fitText(el, 560, 34));
  },
  init(root, P, C) {
    this.theme = C.theme;
    this.inches = num(P.screen.inches);
    this.pixLayout = P.panel === 'oled' ? 'wrgb' : 'rgb';
    this.head = $('#scr-head', root);
    this.box = $('#scr-tvbox', root);
    this.tv = createTV(this.box, 860, P.stand);
    this.diag = $('#scr-diag', root);
    this.line = $('#scr-diag-line', root);
    this.a = $('#scr-diag-a', root);
    this.b = $('#scr-diag-b', root);
    this.size = $('#scr-size', root);
    this.num = $('.size-num', root);
    this.rows = $$('.srow', root).map((el, i) => {
      const s = P.screen.stats[i];
      const pix = $('canvas.pix', el);
      return { el, num: $('.snum', el), count: counter(s.value, s.count), pix: pix && pix.getContext('2d') };
    });
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.box, t, 0.35, { dy: 40, s0: 0.97 });
    paintRibbons(this.tv.ctx, this.tv.w, this.tv.h, t + 9, 0.45, this.theme);
    this.tv.floor.style.opacity = 0.7;

    const d = prog(t, 0.9, 1.1, 'inOutCubic');
    draw(this.line, d);
    this.a.style.opacity = prog(t, 0.9, 0.2);
    this.b.style.opacity = prog(t, 1.9, 0.2);
    this.diag.style.opacity = 1;

    reveal(this.size, t, 1.35, { dy: 0, s0: 0.85, blur: 10, ease: 'outBack' });
    const inch = Math.round(lerp(0, this.inches, prog(t, 1.35, 1.0, 'outCubic')));
    this.num.innerHTML = `${inch}<span class="inch">"</span>`;

    this.rows.forEach((r, i) => {
      reveal(r.el, t, 1.9 + i * 0.35, { dx: 40, dy: 0 });
      const k = prog(t, 1.9 + i * 0.35, 1.2, 'outCubic');
      if (r.count) r.num.textContent = counterText(r.count, k);
      if (r.pix) paintPixels(r.pix, 116, t, prog(t, 1.9 + i * 0.35, 1.6, 'linear'), this.pixLayout);
    });
  },
};

// ─────────────────────────────── Контраст ───────────────────────────────
const contrast = {
  build(P, C) {
    const K = P.contrast;
    const [a1, a2, a3] = C.theme.stops;
    const half = (side, id, hi) => `
      <div class="cmp-half" id="${id}">
        <canvas width="830" height="450"></canvas>
        <div class="cmp-tag${hi ? ' cmp-tag-hi' : ''}">${esc(side.tag)}</div>
        <div class="cmp-note">${esc(side.note)}</div>
      </div>`;
    const inf = `
      <svg width="150" height="76" viewBox="0 0 150 76">
        <defs><linearGradient id="gInf" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${a1}"/><stop offset="0.5" stop-color="${a2}"/><stop offset="1" stop-color="${a3}"/>
        </linearGradient></defs>
        <path id="blk-inf-path" d="" fill="none" stroke="url(#gInf)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
      </svg>`;
    const stat = K.stat
      ? `<div class="abs" id="blk-inf">${K.stat.infinity ? inf : ''}<div class="inf-ratio${K.stat.infinity ? '' : ' solo'}">${esc(K.stat.value)}</div><div class="inf-label">${esc(K.stat.label)}</div></div>`
      : '';
    return `
      ${head('blk-head', C, esc(K.title))}
      <div class="abs" id="blk-cmp">${half(K.left, 'blk-left', false)}${half(K.right, 'blk-right', true)}</div>
      ${stat}
      <div class="abs lead${K.stat ? '' : ' wide'}" id="blk-cap">${esc(K.caption)}</div>`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    fitText($('.inf-ratio', root), 260, 36);
    $$('.cmp-tag', root).forEach((el) => fitText(el, 700, 14));
    $$('.cmp-note', root).forEach((el) => fitText(el, 820, 16));
  },
  init(root, P) {
    this.modes = [P.contrast.left.mode, P.contrast.right.mode];
    this.head = $('#blk-head', root);
    this.halves = [$('#blk-left', root), $('#blk-right', root)];
    this.ctx = this.halves.map((h) => $('canvas', h).getContext('2d'));
    this.inf = $('#blk-inf', root);
    this.cap = $('#blk-cap', root);
    this.path = $('#blk-inf-path', root);
    if (this.path) {
      // Лемниската Бернулли — знак бесконечности
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2 + Math.PI / 2;
        const s = Math.sin(a);
        const c = Math.cos(a);
        const den = 1 + s * s;
        pts.push([75 + (66 * c) / den, 38 + (66 * s * c) / den]);
      }
      this.path.setAttribute('d', 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join(' L'));
    }
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.halves[0], t, 0.5, { dy: 40 });
    reveal(this.halves[1], t, 0.85, { dy: 40 });
    paintNight(this.ctx[0], 830, 450, t, this.modes[0]);
    paintNight(this.ctx[1], 830, 450, t, this.modes[1]);
    if (this.inf) reveal(this.inf, t, 1.8, { dy: 20 });
    if (this.path) draw(this.path, prog(t, 1.9, 1.3, 'inOutCubic'));
    reveal(this.cap, t, 2.3, { dy: 20 });
  },
};

// ─────────────────────────────── Процессор ───────────────────────────────
const CPU_CARD_POS = [
  [110, 458],
  [110, 632],
  [1280, 458],
  [1280, 632],
];

const cpu = {
  build(P, C) {
    const U = P.cpu;
    const [big, ...small] = U.chip;
    return `
      ${head('cpu-head', C, esc(U.title), U.lead ? `<div class="lead">${esc(U.lead)}</div>` : '', ' head-center')}
      <svg class="abs" id="cpu-svg" width="1920" height="1080" viewBox="0 0 1920 1080"></svg>
      <div class="abs chip-box" id="cpu-chip" data-avoid>
        <div class="chip-core">
          <div class="chip-alpha">${esc(big)}</div>
          <div class="chip-sub">${small.map(esc).join('<br>')}</div>
        </div>
      </div>
      ${U.cards
        .slice(0, 4)
        .map(
          (c, i) => `
        <div class="abs fcard" data-box style="left:${CPU_CARD_POS[i][0]}px;top:${CPU_CARD_POS[i][1]}px">
          ${icon(c.icon || 'sparkles', 'ficon')}
          <div><div class="ftitle">${esc(c.title)}</div><div class="ftext">${esc(c.text)}</div></div>
        </div>`,
        )
        .join('')}`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    fitText($('.chip-alpha', root), 250, 48);
    $$('.ftitle', root).forEach((el) => fitText(el, 370, 18));
  },
  init(root, P, C) {
    const line = C.theme.line;
    const [a1, a2] = C.theme.stops;
    this.glow = [a1, a2];
    this.head = $('#cpu-head', root);
    this.chip = $('#cpu-chip', root);
    this.core = $('.chip-core', this.chip);
    this.cards = $$('.fcard', root);
    const n = this.cards.length;
    const sv = $('#cpu-svg', root);
    // Контакты по периметру кристалла
    this.pins = svg('g', { opacity: 0 }, sv);
    const cx = 960;
    const cy = 620;
    for (let i = 0; i < 7; i++) {
      const o = -108 + i * 36;
      svg('rect', { x: cx + o - 4, y: cy - 172, width: 8, height: 20, rx: 3, fill: '#3a3548' }, this.pins);
      svg('rect', { x: cx + o - 4, y: cy + 152, width: 8, height: 20, rx: 3, fill: '#3a3548' }, this.pins);
      svg('rect', { x: cx - 172, y: cy + o - 4, width: 20, height: 8, rx: 3, fill: '#3a3548' }, this.pins);
      svg('rect', { x: cx + 152, y: cy + o - 4, width: 20, height: 8, rx: 3, fill: '#3a3548' }, this.pins);
    }
    // Дорожки от процессора к карточкам и декоративные «шины»
    const toCards = [
      `M 790 584 H 736 Q 724 584 724 572 V 545 Q 724 533 712 533 H 642`,
      `M 790 656 H 736 Q 724 656 724 668 V 695 Q 724 707 712 707 H 642`,
      `M 1130 584 H 1184 Q 1196 584 1196 572 V 545 Q 1196 533 1208 533 H 1278`,
      `M 1130 656 H 1184 Q 1196 656 1196 668 V 695 Q 1196 707 1208 707 H 1278`,
    ].slice(0, n);
    const deco = [
      `M 888 450 V 404 Q 888 392 876 392 H 780`,
      `M 960 450 V 352`,
      `M 1032 450 V 404 Q 1032 392 1044 392 H 1140`,
      `M 888 790 V 836 Q 888 848 876 848 H 760`,
      `M 960 790 V 900`,
      `M 1032 790 V 836 Q 1032 848 1044 848 H 1160`,
    ];
    this.main = toCards.length;
    this.traces = [...toCards, ...deco].map((p, i) =>
      svg('path', {
        d: p,
        fill: 'none',
        stroke: rgba(line, i < this.main ? 0.55 : 0.25),
        'stroke-width': i < this.main ? 3 : 2,
        'stroke-linecap': 'round',
        pathLength: 1,
      }, sv),
    );
    // Концевые узлы декоративных дорожек
    this.ends = this.traces.slice(this.main).map((tr) => {
      const pt = tr.getPointAtLength(tr.getTotalLength());
      return svg('circle', { cx: pt.x, cy: pt.y, r: 6, fill: 'none', stroke: rgba(line, 0.5), 'stroke-width': 2, opacity: 0 }, sv);
    });
    // Импульсы данных
    this.pulses = this.traces.map(() => svg('circle', { r: 5, fill: '#fff', opacity: 0, style: `filter: drop-shadow(0 0 6px ${line})` }, sv));
  },
  render(t) {
    reveal(this.head, t, 0.2);
    const ck = prog(t, 0.45, 0.9, 'outBack');
    style(this.chip, { o: clamp(ck * 1.4), s: lerp(0.6, 1, ck), blur: 10 * (1 - clamp(ck)) });
    this.pins.setAttribute('opacity', prog(t, 0.8, 0.5).toFixed(3));
    this.traces.forEach((tr, i) => {
      const j = i < this.main ? i : i - this.main;
      draw(tr, prog(t, 1.0 + (j % 4) * 0.08 + (i >= this.main ? 0.3 : 0), 0.8, 'inOutCubic'));
    });
    this.ends.forEach((e, i) => e.setAttribute('opacity', prog(t, 1.9 + i * 0.05, 0.3).toFixed(3)));
    this.cards.forEach((c, i) => reveal(c, t, 1.55 + i * 0.18, { dx: i < 2 ? -40 : 40, dy: 0 }));
    // Импульсы бегут от кристалла наружу
    this.pulses.forEach((p, i) => {
      const main = i < this.main;
      const period = main ? 1.6 : 2.3;
      const start = 2.0 + i * 0.21;
      if (t < start) {
        p.setAttribute('opacity', 0);
        return;
      }
      const k = ((t - start) / period) % 1;
      const pt = pointAt(this.traces[i], E.inOutSine(k));
      p.setAttribute('cx', pt.x.toFixed(2));
      p.setAttribute('cy', pt.y.toFixed(2));
      p.setAttribute('opacity', (Math.sin(Math.PI * k) * (main ? 1 : 0.6)).toFixed(3));
    });
    // Лёгкая «пульсация» свечения кристалла
    const glow = 0.5 + 0.5 * Math.sin(t * 2.4);
    this.core.style.boxShadow = `0 0 ${50 + glow * 30}px ${rgba(this.glow[1], (0.35 + glow * 0.2).toFixed(3))}, 0 0 140px ${rgba(this.glow[0], 0.22)}`;
  },
};

// ─────────────────────────────── Яркость и HDR ───────────────────────────────
const hdr = {
  build(P, C) {
    const H = P.hdr;
    const [l, r] = H.compare || ['SDR', 'HDR'];
    return `
      ${head('hdr-head', C, esc(H.title))}
      <div class="abs" id="hdr-screen" data-avoid>
        <canvas id="hdr-sdr" width="960" height="540"></canvas>
        <canvas id="hdr-hdr" width="960" height="540"></canvas>
        <div id="hdr-wipe">${icon('chevrons-left-right', 'wipe-knob')}</div>
        <div class="hdr-tag" id="hdr-tag-l">${esc(l)}</div>
        <div class="hdr-tag hdr-tag-hi" id="hdr-tag-r">${esc(r)}</div>
      </div>
      <div class="abs" id="hdr-list">${H.cards
        .slice(0, 4)
        .map(
          (c) => `<div class="hcard${c.accent ? ' hcard-hi' : ''}" data-box><div class="htitle${c.accent ? ' grad-text' : ''}">${esc(c.title)}</div><div class="htext">${esc(c.text)}</div></div>`,
        )
        .join('')}</div>`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    $$('.htitle', root).forEach((el) => fitText(el, 586, 20));
    $$('.htext', root).forEach((el) => fitText(el, 586, 15));
  },
  init(root) {
    this.head = $('#hdr-head', root);
    this.screen = $('#hdr-screen', root);
    this.sdr = $('#hdr-sdr', root);
    this.hdr = $('#hdr-hdr', root);
    this.sctx = this.sdr.getContext('2d');
    this.hctx = this.hdr.getContext('2d');
    this.wipe = $('#hdr-wipe', root);
    this.tagL = $('#hdr-tag-l', root);
    this.tagR = $('#hdr-tag-r', root);
    this.cards = $$('.hcard', root);
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.screen, t, 0.4, { dy: 40, s0: 0.98 });
    paintLandscape(this.sctx, 960, 540, t);
    this.hctx.drawImage(this.sdr, 0, 0);
    // Шторка SDR → HDR
    const w = prog(t, 1.2, 1.5, 'inOutCubic');
    const sway = prog(t, 2.7, 0.01) * Math.sin((t - 2.7) * 0.9) * 0.06;
    const x = lerp(0.97, 0.42, w) + sway;
    this.hdr.style.clipPath = `inset(0 0 0 ${(x * 100).toFixed(3)}%)`;
    this.wipe.style.left = `${(x * 960).toFixed(2)}px`;
    this.wipe.style.opacity = prog(t, 1.0, 0.3);
    reveal(this.tagL, t, 1.0, { dy: 10 });
    reveal(this.tagR, t, 1.9, { dy: 10 });
    this.cards.forEach((c, i) => reveal(c, t, 1.4 + i * 0.22, { dx: 40, dy: 0 }));
  },
};

// ─────────────────────────────── Игры ───────────────────────────────
/** Шаг делений шкалы: «круглый», чтобы на шкалу попали 60 и максимум. */
function gaugeStep(hz) {
  for (const s of [15, 12, 10, 20, 30]) if (hz % s === 0 && 60 % s === 0 && hz / s >= 7 && hz / s <= 14) return s;
  return hz / 11;
}

const gaming = {
  build(P, C) {
    const G = P.gaming;
    return `
      ${head('gm-head', C, esc(G.title))}
      <div class="abs" id="gm-gauge">
        <svg id="gm-gauge-svg" width="800" height="440" viewBox="0 0 800 440"></svg>
        <div id="gm-num"><span id="gm-hz">${num(G.hz)}</span><span class="gm-unit">Гц</span></div>
        <div id="gm-cap">${esc(G.caption)}</div>
      </div>
      <div class="abs" id="gm-motion">
        <div class="mrow"><div class="mlabel">60 Гц</div><div class="mtrack" id="gm-t60"></div></div>
        <div class="mrow"><div class="mlabel mlabel-hi">${num(G.hz)} Гц</div><div class="mtrack" id="gm-tmax"></div></div>
      </div>
      <div class="abs" id="gm-stats">
        ${(G.stats || [])
          .map(
            (s) => `
          <div class="gstat">
            ${icon(s.icon || 'gamepad-2', 'gicon')}
            <div class="gtext"><div class="gnum">${esc(s.value)}</div><div class="glabel">${esc(s.label)}</div></div>
          </div>`,
          )
          .join('')}
        <div class="gbadges">${(G.badges || []).map((b) => `<span class="gbadge">${esc(b)}</span>`).join('')}</div>
      </div>`;
  },
  fit(root) {
    fitText($('.title', root), 800, 40);
    $$('.gnum', root).forEach((el) => fitText(el, 676, 32));
    fitText($('#gm-cap', root), 780, 16);
  },
  init(root, P, C) {
    const G = { ...P.gaming, hz: num(P.gaming.hz) };
    const [a1, a2, a3] = C.theme.stops;
    this.max = G.hz;
    this.head = $('#gm-head', root);
    this.gauge = $('#gm-gauge', root);
    this.hz = $('#gm-hz', root);
    this.cap = $('#gm-cap', root);
    this.motion = $('#gm-motion', root);
    this.stats = $$('.gstat', root).map((el, i) => ({ el, num: $('.gnum', el), count: counter(G.stats[i].value, G.stats[i].count) }));
    this.badges = $$('.gbadge', root);
    const sv = $('#gm-gauge-svg', root);
    const grad = gradientDef(sv, 'gGauge', C.theme.stops);
    const cx = 400;
    const cy = 400;
    const R = 330;
    this.geo = { cx, cy, R };
    const arc = (r) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    svg('path', { d: arc(R), fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 22, 'stroke-linecap': 'round' }, sv);
    this.arc = svg('path', { d: arc(R), fill: 'none', stroke: grad, 'stroke-width': 22, 'stroke-linecap': 'round', pathLength: 1 }, sv);
    // Деления шкалы; подписи: 60 и 120 — внутри дуги, 0 и максимум — под концами дуги
    const ticks = svg('g', {}, sv);
    const step = gaugeStep(G.hz);
    const marks = new Set();
    for (let v = step; v < G.hz - 0.01; v += step) marks.add(Math.round(v * 100) / 100);
    for (const v of [60, 120]) if (v < G.hz - step * 0.5) marks.add(v);
    const label = (v, x, y) => {
      const tx = svg('text', {
        x, y, 'text-anchor': 'middle', fill: v === G.hz ? '#fff' : 'rgba(255,255,255,0.55)',
        'font-size': 22, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif',
      }, ticks);
      tx.textContent = v;
    };
    for (const v of [...marks].sort((p, q) => p - q)) {
      const a = Math.PI * (1 - v / G.hz);
      const major = v === 60 || v === 120;
      const r1 = R - 34;
      const r2 = R - (major ? 58 : 46);
      svg('line', {
        x1: cx + r1 * Math.cos(a), y1: cy - r1 * Math.sin(a),
        x2: cx + r2 * Math.cos(a), y2: cy - r2 * Math.sin(a),
        stroke: major ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', 'stroke-width': major ? 3 : 2, 'stroke-linecap': 'round',
      }, ticks);
      if (major) label(v, cx + (R - 88) * Math.cos(a), cy - (R - 88) * Math.sin(a) + 8);
    }
    label(0, cx - R, cy + 54);
    label(G.hz, cx + R, cy + 54);
    this.knob = svg('circle', { r: 15, fill: '#fff', style: `filter: drop-shadow(0 0 10px ${rgba(a2, 0.9)})` }, sv);
    // Дорожки сравнения плавности: 60 Гц и максимум
    this.tracks = [
      { el: $('#gm-t60', root), steps: 7, fill: '#8b90a0' },
      { el: $('#gm-tmax', root), steps: Math.round((7 * G.hz) / 60), fill: `linear-gradient(135deg,${a1},${a2} 55%,${a3})` },
    ];
    for (const tr of this.tracks) {
      tr.ghosts = [];
      for (let i = 0; i < 7; i++) {
        const g = document.createElement('div');
        g.className = 'ghost';
        g.style.background = tr.fill;
        tr.el.appendChild(g);
        tr.ghosts.push(g);
      }
    }
  },
  render(t) {
    reveal(this.head, t, 0.25, { dx: 40, dy: 0 });
    reveal(this.gauge, t, 0.35, { dy: 30, s0: 0.96 });
    const k = prog(t, 0.8, 2.0, 'outCubic');
    draw(this.arc, k);
    this.hz.textContent = Math.round(this.max * k);
    const { cx, cy, R } = this.geo;
    const a = Math.PI * (1 - k);
    this.knob.setAttribute('cx', (cx + R * Math.cos(a)).toFixed(2));
    this.knob.setAttribute('cy', (cy - R * Math.sin(a)).toFixed(2));
    this.knob.setAttribute('opacity', k > 0.001 ? 1 : 0);
    reveal(this.cap, t, 1.6, { dy: 14 });

    reveal(this.motion, t, 2.2, { dy: 30 });
    // Объект пересекает дорожку; при 60 Гц кадров меньше — шаги крупнее
    const trackW = 662 - 42 - 12;
    for (const tr of this.tracks) {
      const cycle = 2.2;
      const tt = Math.max(0, t - 2.4);
      const u = (tt % cycle) / cycle;
      const cur = Math.floor(u * tr.steps);
      tr.ghosts.forEach((g, i) => {
        const idx = cur - i;
        if (idx < 0 || tt <= 0) {
          g.style.opacity = 0;
          return;
        }
        const x = 6 + (idx / (tr.steps - 1)) * trackW;
        g.style.transform = `translateX(${x.toFixed(2)}px)`;
        g.style.opacity = (i === 0 ? 1 : 0.42 * Math.pow(0.62, i - 1)).toFixed(3);
      });
    }

    this.stats.forEach((s, i) => {
      reveal(s.el, t, 1.2 + i * 0.3, { dx: 40, dy: 0 });
      if (s.count) s.num.textContent = counterText(s.count, prog(t, 1.2 + i * 0.3, 0.9, 'outCubic'));
    });
    this.badges.forEach((b, i) => reveal(b, t, 2.0 + i * 0.14, { dy: 18, s0: 0.9 }));
  },
};

// ─────────────────────────────── Звук ───────────────────────────────
// Расстановка виртуальных колонок вокруг зрителя (градусы от направления на экран)
const SPEAKERS = {
  3: [0, -30, 30],
  5: [0, -30, 30, -110, 110],
  7: [0, -30, 30, -90, 90, -145, 145],
  9: [0, -30, 30, -60, 60, -100, 100, -145, 145],
  11: [0, -30, 30, -60, 60, -100, 100, -140, 140, -166, 166],
};

const sound = {
  build(P, C) {
    const N = P.sound;
    const [l1, l2] = N.title;
    return `
      ${head('snd-head', C, `${esc(l1)}${l2 ? `<br><span class="grad-text">${esc(l2)}</span>` : ''}`)}
      <svg class="abs" id="snd-room" width="860" height="640" viewBox="0 0 860 640" data-avoid></svg>
      <div class="abs" id="snd-stats">
        ${(N.stats || [])
          .map((s) => `<div class="nstat"><div class="nnum${s.accent ? ' grad-text' : ''}">${esc(s.value)}</div><div class="nlabel">${esc(s.label)}</div></div>`)
          .join('')}
        ${N.card ? `<div class="nstat nstat-row" data-box>${icon(N.card.icon || 'speaker', 'nicon')}<div class="ntext"><b>${esc(N.card.title)}</b> — ${esc(N.card.text)}</div></div>` : ''}
      </div>`;
  },
  fit(root) {
    const title = $('.title', root);
    fitText(title, 720, 40);
    $$('.nnum', root).forEach((el) => fitText(el, 720, 36));
  },
  init(root, P, C) {
    const room = P.sound.room || {};
    const a3 = C.theme.stops[2];
    const line = C.theme.line;
    this.head = $('#snd-head', root);
    this.stats = $$('.nstat', root);
    const sv = $('#snd-room', root);
    this.sv = sv;
    const grad = gradientDef(sv, 'gSnd', C.theme.stops);
    // Комната (вид сверху)
    svg('rect', { x: 30, y: 30, width: 800, height: 580, rx: 34, fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2 }, sv);
    // Телевизор у стены
    svg('rect', { x: 290, y: 66, width: 280, height: 14, rx: 7, fill: grad }, sv);
    svg('rect', { x: 290, y: 66, width: 280, height: 14, rx: 7, fill: grad, style: 'filter: blur(10px)', opacity: 0.8 }, sv);
    // Волны от телевизора
    this.waves = [];
    for (let i = 0; i < 5; i++) {
      this.waves.push(svg('path', { d: '', fill: 'none', stroke: grad, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 }, sv));
    }
    // Диван и слушатель
    const lx = 430;
    const ly = 392;
    this.listener = svg('g', { opacity: 0 }, sv);
    svg('rect', { x: lx - 120, y: ly + 18, width: 240, height: 70, rx: 22, fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 2 }, this.listener);
    svg('circle', { cx: lx, cy: ly, r: 26, fill: 'rgba(255,255,255,0.9)' }, this.listener);
    svg('rect', { x: lx - 44, y: ly + 30, width: 88, height: 40, rx: 20, fill: 'rgba(255,255,255,0.55)' }, this.listener);
    // Виртуальные колонки по кругу, верхние каналы и сабвуфер
    const angles = SPEAKERS[room.speakers] || SPEAKERS[7];
    const cx = 430;
    const cy = 372;
    this.spk = angles.map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = cx + 345 * Math.sin(a);
      const y = cy - 196 * Math.cos(a);
      const g = svg('g', { opacity: 0 }, sv);
      const ring = svg('circle', { cx: x, cy: y, r: 16, fill: 'none', stroke: line, 'stroke-width': 2, opacity: 0 }, g);
      svg('circle', { cx: x, cy: y, r: 11, fill: '#fff' }, g);
      return { g, ring };
    });
    this.height = (room.height ? [[322, 300], [538, 300]] : []).map(([x, y]) => {
      const g = svg('g', { opacity: 0 }, sv);
      const ring = svg('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: a3, 'stroke-width': 2, 'stroke-dasharray': '4 5', opacity: 1 }, g);
      svg('circle', { cx: x, cy: y, r: 11, fill: a3 }, g);
      svg('path', { d: `M ${x} ${y - 34} l -8 10 M ${x} ${y - 34} l 8 10`, stroke: a3, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, g);
      return { g, ring, x, y };
    });
    this.sub = svg('g', { opacity: 0 }, sv);
    svg('rect', { x: 700, y: 62, width: 44, height: 44, rx: 10, fill: 'rgba(255,255,255,0.1)', stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 2 }, this.sub);
    svg('circle', { cx: 722, cy: 84, r: 12, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, this.sub);
    // Подписи
    const lab = (x, y, txt, fill) => {
      const el = svg('text', { x, y, 'text-anchor': 'middle', fill, 'font-size': 20, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif', 'letter-spacing': '0.06em', opacity: 0 }, sv);
      el.textContent = txt;
      return el;
    };
    this.labels = [
      room.label ? lab(430, 662, room.label.toUpperCase(), 'rgba(255,255,255,0.5)') : null,
      room.height ? lab(430, 307, 'верхние', tint(a3, 0.3)) : null,
    ];
  },
  render(t) {
    reveal(this.head, t, 0.25, { dx: 40, dy: 0 });
    reveal(this.sv, t, 0.35, { dy: 30 });
    this.listener.setAttribute('opacity', prog(t, 0.7, 0.5).toFixed(3));
    // Волны от ТВ
    this.waves.forEach((w, i) => {
      const start = 0.9;
      if (t < start) {
        w.setAttribute('opacity', 0);
        return;
      }
      const k = ((t - start) / 2.2 + i / this.waves.length) % 1;
      const r = 40 + k * 420;
      const d = `M ${430 - r * 0.9} ${80 + r * 0.25} Q 430 ${80 + r * 1.25} ${430 + r * 0.9} ${80 + r * 0.25}`;
      w.setAttribute('d', d);
      w.setAttribute('opacity', (Math.sin(Math.PI * k) * 0.55 * prog(t, start, 0.6)).toFixed(3));
    });
    // Колонки загораются по кругу
    this.spk.forEach((s, i) => {
      const on = prog(t, 1.3 + i * 0.09, 0.4, 'outBack');
      s.g.setAttribute('opacity', clamp(on).toFixed(3));
      const k = ((t - 1.3 - i * 0.09) / 1.6) % 1;
      if (t > 1.8 + i * 0.09) {
        s.ring.setAttribute('r', (12 + k * 26).toFixed(2));
        s.ring.setAttribute('opacity', ((1 - k) * 0.8).toFixed(3));
      } else s.ring.setAttribute('opacity', 0);
    });
    this.height.forEach((h, i) => {
      h.g.setAttribute('opacity', prog(t, 2.5 + i * 0.15, 0.4).toFixed(3));
      h.ring.setAttribute('transform', `rotate(${(t * 40).toFixed(2)} ${h.x} ${h.y})`);
    });
    this.sub.setAttribute('opacity', prog(t, 2.8, 0.4).toFixed(3));
    if (this.labels[0]) this.labels[0].setAttribute('opacity', prog(t, 2.6, 0.5).toFixed(3));
    if (this.labels[1]) this.labels[1].setAttribute('opacity', prog(t, 2.9, 0.5).toFixed(3));
    this.stats.forEach((s, i) => reveal(s, t, 1.0 + i * 0.35, { dx: 40, dy: 0 }));
  },
};

// ─────────────────────────────── Smart TV ───────────────────────────────
const smart = {
  build(P, C) {
    const M = P.smart;
    const tiles = ['clapperboard', 'music-2', 'gamepad-2', 'tv', 'image', 'cast'];
    return `
      ${head('sm-head', C, esc(M.title))}
      <div class="abs" id="sm-tvbox" data-avoid>
        <div class="sm-frame">
          <div class="sm-screen">
            <div class="sm-top"><span class="sm-avatar"></span><span class="sm-bar" style="width:120px"></span><span class="sm-sp"></span>${icon('search', 'sm-ico')}${icon('settings', 'sm-ico')}</div>
            <div class="sm-hero" id="sm-hero">
              <div class="sm-hero-art"></div>
              <div class="sm-hero-txt"><span class="sm-bar sm-bar-hi" style="width:260px"></span><span class="sm-bar" style="width:180px"></span></div>
            </div>
            <div class="sm-tiles" id="sm-tiles">${tiles.map((n, i) => `<div class="sm-tile t${i + 1}">${icon(n)}</div>`).join('')}</div>
            <div class="sm-tiles sm-tiles-2">${[4, 3, 5, 1, 6, 2].map((n) => `<div class="sm-tile t${n}"></div>`).join('')}</div>
            <div class="sm-cursor" id="sm-cursor"></div>
          </div>
        </div>
      </div>
      <div class="abs" id="sm-remote">
        <div class="rm-body"><div class="rm-power"></div><div class="rm-wheel"></div><div class="rm-keys"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
      </div>
      <div class="abs" id="sm-stats">${M.stats
        .slice(0, 4)
        .map((s) => `<div class="mstat">${icon(s.icon || 'tv', 'micon')}<div class="mtextwrap"><div class="mtitle">${esc(s.title)}</div><div class="mtext">${esc(s.text)}</div></div></div>`)
        .join('')}</div>`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    $$('.mtitle', root).forEach((el) => fitText(el, 570, 24));
    $$('.mtext', root).forEach((el) => fitText(el, 570, 15));
  },
  init(root, P, C) {
    const [a1, , a3] = C.theme.stops;
    this.pointer = (P.smart.remote || 'pointer') === 'pointer';
    this.head = $('#sm-head', root);
    this.box = $('#sm-tvbox', root);
    this.hero = $('#sm-hero', root);
    this.tiles = $$('#sm-tiles .sm-tile', root);
    this.row2 = $('.sm-tiles-2', root);
    this.cursor = $('#sm-cursor', root);
    this.remote = $('#sm-remote', root);
    this.stats = $$('.mstat', root);
    // Абстрактная «обложка» в баннере
    $('.sm-hero-art', root).innerHTML = `
      <svg width="822" height="196" viewBox="0 0 822 196">
        <circle cx="640" cy="40" r="120" fill="rgba(255,255,255,0.10)"/>
        <circle cx="720" cy="160" r="90" fill="${rgba(a3, 0.35)}"/>
        <circle cx="560" cy="150" r="60" fill="${rgba(a1, 0.35)}"/>
        <path d="M0 150 C 200 110, 380 190, 822 120 L 822 196 L 0 196 Z" fill="rgba(0,0,0,0.25)"/>
      </svg>`;
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.box, t, 0.35, { dy: 40, s0: 0.98 });
    reveal(this.hero, t, 0.7, { dy: 16, blur: 4 });
    this.row2.style.opacity = (0.35 * prog(t, 1.3, 0.6)).toFixed(3);
    // Пульт появляется снизу и слегка наклоняется к экрану
    const rk = prog(t, 1.2, 0.8, 'outCubic');
    style(this.remote, { o: rk, x: 50 * (1 - rk), y: 70 * (1 - rk), r: lerp(-6, -22, rk) });
    // Курсор идёт по плиткам (координаты внутри экрана; центры плиток: 95 + 140·i, y = 349;
    // курсор держим у правого нижнего угла плитки, чтобы не закрывать иконку)
    const way = [
      [760, 470, 1.9],
      [540, 380, 2.6],
      [400, 380, 3.3],
      [400, 380, 4.3],
      [260, 380, 5.0],
    ];
    let cx = way[0][0];
    let cy = way[0][1];
    for (let i = 1; i < way.length; i++) {
      if (t < way[i - 1][2]) break;
      const k = prog(t, way[i - 1][2], way[i][2] - way[i - 1][2], 'inOutCubic');
      cx = lerp(way[i - 1][0], way[i][0], k);
      cy = lerp(way[i - 1][1], way[i][1], k);
    }
    const ck = prog(t, 1.8, 0.4);
    // Пульт-указка показывает курсор; обычный пульт — только рамку фокуса на плитке
    this.cursor.style.opacity = this.pointer ? ck : 0;
    this.cursor.style.left = `${cx.toFixed(2)}px`;
    this.cursor.style.top = `${cy.toFixed(2)}px`;
    // Плитки появляются, плитка под курсором увеличивается и получает рамку
    this.tiles.forEach((el, i) => {
      const base = reveal(el, t, 0.85 + i * 0.07, { dy: 24, blur: 4, s0: 0.9 });
      if (base < 1) return;
      const near = clamp(1 - Math.hypot(cx - 25 - (95 + 140 * i), cy - 31 - 349) / 60) * ck;
      el.style.transform = `scale(${(1 + near * 0.12).toFixed(4)})`;
      el.style.boxShadow = near > 0.01 ? `0 0 0 ${(near * 4).toFixed(2)}px #fff, 0 12px 40px rgba(0,0,0,${(near * 0.6).toFixed(3)})` : 'none';
      el.style.zIndex = near > 0.01 ? 2 : 1;
    });
    this.stats.forEach((s, i) => reveal(s, t, 1.1 + i * 0.25, { dx: 40, dy: 0 }));
  },
};

// ─────────────────────────────── Габариты ───────────────────────────────
const mmText = (v) => `${fmt(v, Number.isInteger(v) ? 0 : 1).replace(/\s/g, '')} мм`;

const size = {
  build(P, C) {
    const Z = P.size;
    return `
      ${head('sz-head', C, esc(Z.title))}
      <svg class="abs" id="sz-svg" width="1280" height="700" viewBox="0 0 1280 700" data-avoid></svg>
      <div class="abs" id="sz-stats">${Z.stats
        .slice(0, 4)
        .map((s) => `<div class="zstat"><div class="znum">${esc(s.value)}</div><div class="zlabel">${esc(s.label)}</div></div>`)
        .join('')}</div>`;
  },
  fit(root) {
    fitText($('.title', root), 1680, 40);
    $$('.znum', root).forEach((el) => fitText(el, 370, 30));
    $$('.zlabel', root).forEach((el) => fitText(el, 370, 15));
  },
  init(root, P, C) {
    const mm = Object.fromEntries(Object.entries(P.size.mm).map(([k, v]) => [k, num(v)]));
    const [a1, a2, a3] = C.theme.stops;
    const accent = C.theme.line;
    this.head = $('#sz-head', root);
    this.stats = $$('.zstat', root);
    const sv = $('#sz-svg', root);
    this.sv = sv;
    const S = 820 / mm.width; // пикселей на мм
    const x0 = 110;
    const y0 = 70;
    const W = mm.width * S;
    const H = mm.height * S;
    const standH = Math.max(12, ((mm.heightWithStand || mm.height + 50) - mm.height) * S);
    const baseW = (mm.standWidth || mm.width * 0.4) * S;
    const cx = x0 + W / 2;
    const line = 'rgba(255,255,255,0.85)';
    const soft = 'rgba(255,255,255,0.35)';
    const feet = P.stand === 'feet';
    this.parts = [];
    const add = (el) => (this.parts.push(el), el);
    const defs = svg('defs', {}, sv);
    // Сетка чертежа, плавно исчезающая к краям
    const fade = svg('radialGradient', { id: 'szFade', cx: 0.45, cy: 0.5, r: 0.6 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, fade);
    svg('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, fade);
    const mask = svg('mask', { id: 'szMask' }, defs);
    svg('rect', { x: 0, y: 0, width: 1280, height: 700, fill: 'url(#szFade)' }, mask);
    const grid = svg('g', { opacity: 0, mask: 'url(#szMask)' }, sv);
    for (let x = 0; x <= 1280; x += 40) svg('line', { x1: x, y1: 0, x2: x, y2: 700, stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1 }, grid);
    for (let y = 0; y <= 700; y += 40) svg('line', { x1: 0, y1: y, x2: 1280, y2: y, stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1 }, grid);
    this.grid = grid;
    // Вид спереди
    const floor = y0 + H + standH;
    add(svg('rect', { x: x0, y: y0, width: W, height: H, rx: 6, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
    add(svg('rect', { x: x0 + 8, y: y0 + 8, width: W - 16, height: H - 16, rx: 3, fill: 'none', stroke: soft, 'stroke-width': 1.5, pathLength: 1 }, sv));
    if (feet) {
      // Две ножки: расстояние между внешними краями — standWidth
      const fw = 44;
      for (const fx of [cx - baseW / 2 + fw / 2, cx + baseW / 2 - fw / 2]) {
        add(svg('path', {
          d: `M ${fx - 7} ${y0 + H} L ${fx + 7} ${y0 + H} L ${fx + fw / 2} ${floor} L ${fx - fw / 2} ${floor} Z`,
          fill: 'none', stroke: line, 'stroke-width': 2.5, 'stroke-linejoin': 'round', pathLength: 1,
        }, sv));
      }
    } else {
      add(svg('path', { d: `M ${cx - 28} ${y0 + H} V ${floor - 11} M ${cx + 28} ${y0 + H} V ${floor - 11}`, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
      add(svg('rect', { x: cx - baseW / 2, y: floor - 11, width: baseW, height: 11, rx: 5, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
    }
    this.screenFill = svg('rect', { x: x0 + 8, y: y0 + 8, width: W - 16, height: H - 16, rx: 3, fill: 'url(#szScreen)', opacity: 0 }, sv);
    const lg = svg('linearGradient', { id: 'szScreen', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    svg('stop', { offset: 0, 'stop-color': rgba(a1, 0.16) }, lg);
    svg('stop', { offset: 0.5, 'stop-color': rgba(a2, 0.08) }, lg);
    svg('stop', { offset: 1, 'stop-color': rgba(a3, 0.16) }, lg);

    // Размерные линии с разрывом под подпись посередине
    const dims = [];
    const dimLine = (x1, y1, x2, y2, label, gap) => {
      const g = svg('g', { opacity: 0 }, sv);
      const vertical = x1 === x2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const d = vertical
        ? `M ${x1} ${my - gap / 2} V ${y1} M ${x1} ${my + gap / 2} V ${y2}`
        : `M ${mx - gap / 2} ${y1} H ${x1} M ${mx + gap / 2} ${y1} H ${x2}`;
      const p = svg('path', { d, stroke: accent, 'stroke-width': 2, fill: 'none', pathLength: 1 }, g);
      const tick = (x, y) =>
        svg('path', { d: vertical ? `M ${x - 12} ${y} H ${x + 12}` : `M ${x} ${y - 12} V ${y + 12}`, stroke: accent, 'stroke-width': 2 }, g);
      tick(x1, y1);
      tick(x2, y2);
      const tx = svg('text', { x: mx, y: my + 9, 'text-anchor': 'middle', class: 'dim-label', transform: vertical ? `rotate(-90 ${mx} ${my})` : '' }, g);
      tx.textContent = label;
      dims.push({ g, p });
    };
    dimLine(x0, 26, x0 + W, 26, mmText(mm.width), 150);
    dimLine(58, y0, 58, y0 + H, mmText(mm.height), 130);

    // Вид сбоку: у OLED тонкий верх и утолщение внизу, у LCD корпус одной толщины
    const sx = 1090;
    const thick = Math.max(6, mm.depth * S);
    const baseD = (mm.standDepth || 250) * S;
    const side = svg('g', { opacity: 0 }, sv);
    const profile =
      P.panel === 'oled' || P.panel === 'qd-oled'
        ? `M ${sx} ${y0} h 7 V ${y0 + H * 0.42} L ${sx + thick} ${y0 + H * 0.52} V ${y0 + H} H ${sx} Z`
        : `M ${sx} ${y0} H ${sx + thick} V ${y0 + H} H ${sx} Z`;
    svg('path', { d: profile, fill: 'rgba(255,255,255,0.06)', stroke: line, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, side);
    if (feet) {
      svg('path', { d: `M ${sx + thick / 2 - 5} ${y0 + H} L ${sx + thick / 2 + 5} ${y0 + H} L ${sx + thick / 2 + baseD / 2} ${floor} L ${sx + thick / 2 - baseD / 2} ${floor} Z`, fill: 'none', stroke: line, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, side);
    } else {
      svg('path', { d: `M ${sx + thick / 2 - 6} ${y0 + H} V ${floor - 11} M ${sx + thick / 2 + 6} ${y0 + H} V ${floor - 11}`, stroke: line, 'stroke-width': 2.5, fill: 'none' }, side);
      svg('rect', { x: sx + thick / 2 - baseD / 2, y: floor - 11, width: baseD, height: 11, rx: 5, fill: 'none', stroke: line, 'stroke-width': 2.5 }, side);
    }
    const sideCap = svg('text', { x: sx + thick / 2, y: floor + 44, 'text-anchor': 'middle', class: 'dim-sub' }, side);
    sideCap.textContent = 'вид сбоку';
    this.side = side;
    // Толщина
    const dg = svg('g', { opacity: 0 }, sv);
    const dy = y0 + H * 0.78;
    svg('path', { d: `M ${sx - 70} ${dy} H ${sx}`, stroke: accent, 'stroke-width': 2 }, dg);
    svg('path', { d: `M ${sx + thick + 70} ${dy} H ${sx + thick}`, stroke: accent, 'stroke-width': 2 }, dg);
    svg('path', { d: `M ${sx - 10} ${dy - 7} L ${sx} ${dy} L ${sx - 10} ${dy + 7}`, stroke: accent, 'stroke-width': 2, fill: 'none' }, dg);
    svg('path', { d: `M ${sx + thick + 10} ${dy - 7} L ${sx + thick} ${dy} L ${sx + thick + 10} ${dy + 7}`, stroke: accent, 'stroke-width': 2, fill: 'none' }, dg);
    const tl = svg('text', { x: sx + thick / 2, y: dy - 26, 'text-anchor': 'middle', class: 'dim-label' }, dg);
    tl.textContent = mmText(mm.depth);
    this.depth = dg;
    this.dims = dims;
  },
  render(t) {
    reveal(this.head, t, 0.25);
    this.grid.setAttribute('opacity', prog(t, 0.3, 0.8).toFixed(3));
    this.parts.forEach((p, i) => draw(p, prog(t, 0.5 + i * 0.12, 1.0, 'inOutCubic')));
    this.screenFill.setAttribute('opacity', prog(t, 1.4, 0.8).toFixed(3));
    this.dims.forEach((d, i) => {
      const k = prog(t, 1.5 + i * 0.3, 0.7, 'inOutCubic');
      d.g.setAttribute('opacity', clamp(k * 2).toFixed(3));
      draw(d.p, k);
    });
    this.side.setAttribute('opacity', prog(t, 2.0, 0.6).toFixed(3));
    this.side.setAttribute('transform', `translate(${(30 * (1 - prog(t, 2.0, 0.8))).toFixed(2)} 0)`);
    this.depth.setAttribute('opacity', prog(t, 2.5, 0.6).toFixed(3));
    this.stats.forEach((s, i) => reveal(s, t, 1.4 + i * 0.3, { dx: 40, dy: 0 }));
  },
};

// ─────────────────────────────── Разъёмы ───────────────────────────────
const PORT_Y = 120;
// Ширина одного разъёма, шаг между одинаковыми разъёмами и контур
const PORT = {
  hdmi: { w: 104, pitch: 125, d: (x, y) => `M ${x - 52} ${y - 22} H ${x + 52} V ${y + 6} L ${x + 40} ${y + 22} H ${x - 40} L ${x - 52} ${y + 6} Z` },
  usb: { w: 72, pitch: 100, d: (x, y) => `M ${x - 36} ${y - 15} H ${x + 36} V ${y + 15} H ${x - 36} Z` },
  lan: { w: 64, pitch: 90, d: (x, y) => `M ${x - 32} ${y - 26} H ${x + 32} V ${y + 16} H ${x + 14} V ${y + 28} H ${x - 14} V ${y + 16} H ${x - 32} Z` },
  optical: { w: 52, pitch: 80, d: (x, y) => `M ${x - 26} ${y - 26} H ${x + 26} V ${y + 14} L ${x + 14} ${y + 26} H ${x - 14} L ${x - 26} ${y + 14} Z` },
  coax: { w: 60, pitch: 90, d: (x, y) => `M ${x - 30} ${y} A 30 30 0 1 0 ${x + 30} ${y} A 30 30 0 1 0 ${x - 30} ${y} Z` },
  jack: { w: 36, pitch: 64, d: (x, y) => `M ${x - 18} ${y} A 18 18 0 1 0 ${x + 18} ${y} A 18 18 0 1 0 ${x - 18} ${y} Z` },
};

function portDetails(type, x, y, g, a1) {
  if (type === 'hdmi') svg('rect', { x: x - 34, y: y - 6, width: 68, height: 8, rx: 2, fill: 'rgba(255,255,255,0.25)' }, g);
  if (type === 'usb') svg('rect', { x: x - 24, y: y - 6, width: 48, height: 9, rx: 2, fill: 'rgba(255,255,255,0.25)' }, g);
  if (type === 'lan') for (let i = 0; i < 6; i++) svg('rect', { x: x - 20 + i * 7, y: y - 20, width: 3, height: 10, fill: 'rgba(255,255,255,0.35)' }, g);
  if (type === 'optical') svg('circle', { cx: x, cy: y - 2, r: 8, fill: rgba(a1, 0.55) }, g);
  if (type === 'coax') {
    svg('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 2 }, g);
    svg('circle', { cx: x, cy: y, r: 3.5, fill: 'rgba(255,255,255,0.6)' }, g);
  }
  if (type === 'jack') svg('circle', { cx: x, cy: y, r: 6, fill: 'rgba(255,255,255,0.35)' }, g);
}

const ports = {
  build(P, C) {
    const R = P.ports;
    return `
      ${head('pt-head', C, esc(R.title))}
      <svg class="abs" id="pt-svg" width="1680" height="340" viewBox="0 0 1680 340"></svg>
      <div class="abs" id="pt-labels">${R.groups
        .map((g) => `<div class="plabel"><div class="ptitle">${esc(g.title)}</div><div class="psub">${esc(g.sub || '')}</div></div>`)
        .join('')}</div>
      <div class="abs${(R.wireless || []).length >= 4 ? ' compact' : ''}" id="pt-wireless" style="grid-template-columns:repeat(${(R.wireless || []).length || 1},minmax(0,1fr))">${(R.wireless || [])
        .map((w) => `<div class="wcard" data-box>${icon(w.icon || 'wifi', 'wicon')}<div class="wtextwrap"><div class="wtitle">${esc(w.title)}</div><div class="wtext">${esc(w.text)}</div></div></div>`)
        .join('')}</div>`;
  },
  fit(root, P) {
    fitText($('.title', root), 1680, 40);
    $$('.ptitle', root).forEach((el) => fitText(el, 230, 16));
    $$('.psub', root).forEach((el) => fitText(el, 230, 13));
    const n = (P.ports.wireless || []).length || 1;
    // Ширина текста в карточке: колонка минус поля, иконка и отступ (у компактных карточек всё меньше)
    const inner = (1680 - 28 * (n - 1)) / n - (n >= 4 ? 44 + 60 + 16 : 60 + 72 + 24);
    $$('.wtitle', root).forEach((el) => fitText(el, inner, 18));
    $$('.wtext', root).forEach((el) => fitText(el, inner, 14));
  },
  init(root, P, C) {
    const [a1] = C.theme.stops;
    this.lit = tint(C.theme.line, 0.6);
    this.head = $('#pt-head', root);
    this.wireless = $$('.wcard', root);
    const sv = $('#pt-svg', root);
    this.sv = sv;
    svg('rect', { x: 0, y: 0, width: 1680, height: 340, rx: 28, fill: 'rgba(255,255,255,0.035)', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2 }, sv);

    // Раскладка групп: ширина группы — по разъёмам, а расстояние между центрами — не меньше,
    // чем нужно подписям. Лишнее место делим поровну между группами.
    const labels = $$('.plabel', root);
    const groups = P.ports.groups.map((g, i) => {
      const spec = PORT[g.type] || PORT.usb;
      const count = g.count || 1;
      const width = (count - 1) * spec.pitch + spec.w;
      const text = [$('.ptitle', labels[i]), $('.psub', labels[i])].map((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      });
      return { ...g, spec, count, width, labelW: Math.max(...text) };
    });
    const margin = 98;
    const need = groups.slice(1).map((g, i) => {
      const p = groups[i];
      return Math.max((p.width + g.width) / 2 + 50, (p.labelW + g.labelW) / 2 + 16);
    });
    const first = margin + groups[0].width / 2;
    const last = 1680 - margin - groups[groups.length - 1].width / 2;
    const extra = groups.length > 1 ? (last - first - need.reduce((s, v) => s + v, 0)) / (groups.length - 1) : 0;
    let c = groups.length > 1 ? first : 840;
    groups.forEach((g, i) => {
      if (i > 0) c += need[i - 1] + extra;
      g.center = c;
    });

    this.groups = groups.map((gp, gi) => {
      const g = svg('g', {}, sv);
      const xs = Array.from({ length: gp.count }, (_, i) => gp.center - ((gp.count - 1) * gp.spec.pitch) / 2 + i * gp.spec.pitch);
      const shapes = xs.map((x) => {
        const glow = svg('path', { d: gp.spec.d(x, PORT_Y), fill: 'none', stroke: C.theme.line, 'stroke-width': 8, opacity: 0, style: 'filter: blur(6px)' }, g);
        const body = svg('path', { d: gp.spec.d(x, PORT_Y), fill: '#050507', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, g);
        return { glow, body };
      });
      xs.forEach((x) => portDetails(gp.type, x, PORT_Y, g, a1));
      if (gp.numbered) {
        xs.forEach((x, i) => {
          const n = svg('text', { x, y: PORT_Y - 40, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.45)', 'font-size': 16, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif' }, sv);
          n.textContent = `${gp.type === 'hdmi' ? 'HDMI' : gp.type.toUpperCase()} ${i + 1}`;
        });
      }
      const lab = labels[gi];
      lab.style.left = `${gp.center}px`;
      return { shapes, lab };
    });
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.sv, t, 0.4, { dy: 30 });
    const n = this.groups.length;
    const gap = Math.min(0.42, 2.6 / Math.max(1, n));
    this.groups.forEach((g, i) => {
      const st = 1.0 + i * gap;
      const k = prog(t, st, 0.5, 'outCubic');
      const pulse = prog(t, st, 0.35) * (1 - prog(t, st + 0.5, 1.2));
      g.shapes.forEach((s) => {
        s.glow.setAttribute('opacity', (0.15 * k + 0.85 * pulse).toFixed(3));
        s.body.setAttribute('stroke', k > 0.5 ? this.lit : 'rgba(255,255,255,0.35)');
      });
      reveal(g.lab, t, st + 0.05, { dy: 18 });
    });
    const wStart = 1.0 + n * gap + 0.3;
    this.wireless.forEach((w, i) => reveal(w, t, wStart + i * 0.18, { dy: 20 }));
  },
};

// ─────────────────────────────── Итог ───────────────────────────────
const outro = {
  build(P) {
    const O = P.outro;
    const [l1, l2] = O.lockup.title;
    const cols = O.tiles.length <= 6 ? 3 : 4;
    return `
      <div class="abs head head-center" id="out-head"><div class="kicker">${esc(O.kicker || 'Коротко о главном')}</div><div class="title">${esc(O.title)}</div></div>
      <div class="abs" id="out-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${O.tiles
        .map((s) => `<div class="otile" data-box><div class="onum">${esc(s.value)}</div><div class="olabel">${esc(s.label)}</div></div>`)
        .join('')}</div>
      <canvas class="abs" id="out-ribbons" width="1920" height="520"></canvas>
      <div class="abs" id="out-lock">
        <div class="lock-brand">${esc(l1)}${l2 ? ` <span class="grad-text">${esc(l2)}</span>` : ''}</div>
        <div class="lock-model">${esc(O.lockup.model)}</div>
        ${O.lockup.tagline ? `<div class="lock-tag">${esc(O.lockup.tagline)}</div>` : ''}
      </div>
      <div class="abs" id="out-note">${esc(O.note || '')}</div>`;
  },
  fit(root, P) {
    const cols = P.outro.tiles.length <= 6 ? 3 : 4;
    const inner = (1680 - 28 * (cols - 1)) / cols - 64;
    fitText($('.title', root), 1680, 40);
    $$('.onum', root).forEach((el) => fitText(el, inner, 24));
    $$('.olabel', root).forEach((el) => fitText(el, inner, 14));
    fitText($('.lock-brand', root), 1680, 56);
    fitText($('.lock-tag', root), 1680, 18);
  },
  init(root, P, C) {
    this.theme = C.theme;
    this.head = $('#out-head', root);
    this.grid = $('#out-grid', root);
    this.tiles = $$('.otile', root);
    this.lock = $('#out-lock', root);
    this.lockParts = [...this.lock.children];
    this.note = $('#out-note', root);
    this.rib = $('#out-ribbons', root);
    this.rctx = this.rib.getContext('2d');
  },
  render(t, dur) {
    const hide = prog(t, 4.9, 0.7, 'inCubic');
    const hk = reveal(this.head, t, 0.25);
    this.head.style.opacity = (hk * (1 - hide)).toFixed(3);
    this.tiles.forEach((el, i) => {
      const k = reveal(el, t, 0.5 + i * 0.1, { dy: 30, s0: 0.95 });
      el.style.opacity = (k * (1 - hide)).toFixed(3);
    });
    this.grid.style.transform = `scale(${(1 - 0.04 * hide).toFixed(4)})`;
    this.grid.style.filter = hide > 0.01 ? `blur(${(hide * 8).toFixed(2)}px)` : 'none';
    this.lockParts.forEach((p, i) => reveal(p, t, 5.5 + i * 0.25, { dy: 26, blur: 10 }));
    reveal(this.note, t, 6.2, { dy: 0 });
    // Затемнение в самом конце
    const end = prog(t, dur - 1.1, 1.0, 'inQuad');
    this.lock.style.opacity = (1 - end).toFixed(3);
    // Цветные ленты за логотипом — перекличка с заставкой
    const rk = prog(t, 5.1, 1.4, 'inOutSine') * (1 - end);
    this.rib.style.opacity = (0.5 * rk).toFixed(3);
    if (rk > 0) paintRibbons(this.rctx, 1920, 520, t + 20, 1, this.theme);
    this.note.style.opacity = Math.min(prog(t, 6.2, 0.8), 1 - end).toFixed(3);
  },
  // Моменты для проверки вёрстки: таблица и финальная заставка
  checkTimes: (dur) => [4.4, dur - 1.6],
};

export const SCENE_IMPL = { intro, screen, contrast, cpu, hdr, gaming, sound, smart, size, ports, outro };

/** Заголовки глав по умолчанию: надпись над заголовком сцены и подпись в «оглавлении» внизу кадра. */
export const CHAPTERS = {
  screen: 'Экран',
  contrast: 'Контраст',
  cpu: 'Процессор',
  hdr: ['Яркость и HDR', 'HDR'],
  gaming: 'Игры',
  sound: 'Звук',
  smart: 'Smart TV',
  size: 'Габариты',
  ports: 'Разъёмы',
};
