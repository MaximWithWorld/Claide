// Сцены ролика. У каждой: init(root) — один раз, render(t, dur) — на каждый кадр (t — локальное время сцены).
import { prog, lerp, clamp, style, reveal, fmt, E } from './engine.js';
import { createTV, paintRibbons, paintPixels, paintNight, paintLandscape } from './draw.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function gradientDef(root, id, stops = ['#ff4d8d', '#a95cff', '#4d9fff']) {
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

// ─────────────────────────────── 00 · Заставка ───────────────────────────────
const intro = {
  init(root) {
    this.box = $('#intro-tvbox', root);
    this.tv = createTV(this.box, 1100);
    this.pill = $('#intro-pill', root);
    this.t1 = $('#intro-t1', root);
    this.t2 = $('#intro-t2', root);
    this.sub = $('#intro-sub', root);
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
    paintRibbons(tv.ctx, tv.w, tv.h, t + 3, 0.35 + 0.65 * ly);

    // 4) телевизор уезжает вправо, слева появляется название
    const mv = prog(t, 2.35, 1.25, 'inOutCubic');
    const drift = Math.sin(t * 0.5) * 4;
    style(this.box, { x: 330 * mv, y: 12 * mv + drift * mv, s: lerp(1, 0.78, mv) });

    reveal(this.pill, t, 2.75, { dx: -30, dy: 0 });
    reveal(this.t1, t, 2.9, { dx: -40, dy: 0, blur: 12 });
    reveal(this.t2, t, 3.05, { dx: -40, dy: 0, blur: 12 });
    reveal(this.sub, t, 3.3, { dy: 24 });
    this.chips.forEach((c, i) => reveal(c, t, 3.55 + i * 0.13, { dy: 20, s0: 0.92 }));
  },
};

// ─────────────────────────────── 01 · Экран ───────────────────────────────
const screen = {
  init(root) {
    this.head = $('#scr-head', root);
    this.box = $('#scr-tvbox', root);
    this.tv = createTV(this.box, 860);
    this.diag = $('#scr-diag', root);
    this.line = $('#scr-diag-line', root);
    this.a = $('#scr-diag-a', root);
    this.b = $('#scr-diag-b', root);
    this.size = $('#scr-size', root);
    this.num = $('.size-num', root);
    this.rows = $$('.srow', root);
    this.pix = $('#scr-pix', root);
    this.pctx = this.pix.getContext('2d');
    this.mln = $('#scr-mln', root);
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.box, t, 0.35, { dy: 40, s0: 0.97 });
    paintRibbons(this.tv.ctx, this.tv.w, this.tv.h, t + 9, 0.45);
    this.tv.floor.style.opacity = 0.7;

    const d = prog(t, 0.9, 1.1, 'inOutCubic');
    draw(this.line, d);
    this.a.style.opacity = prog(t, 0.9, 0.2);
    this.b.style.opacity = prog(t, 1.9, 0.2);
    this.diag.style.opacity = 1;

    reveal(this.size, t, 1.35, { dy: 0, s0: 0.85, blur: 10, ease: 'outBack' });
    const inch = Math.round(lerp(0, 55, prog(t, 1.35, 1.0, 'outCubic')));
    this.num.innerHTML = `${inch}<span class="inch">"</span>`;

    this.rows.forEach((r, i) => reveal(r, t, 1.9 + i * 0.35, { dx: 40, dy: 0 }));
    const mk = prog(t, 2.25, 1.2, 'outCubic');
    this.mln.textContent = `${fmt(lerp(0, 8.3, mk), 1)} млн`;
    paintPixels(this.pctx, 116, t, prog(t, 2.25, 1.6, 'linear'));
  },
};

// ─────────────────────────────── 02 · Контраст ───────────────────────────────
const black = {
  init(root) {
    this.head = $('#blk-head', root);
    this.led = $('#blk-led', root);
    this.oled = $('#blk-oled', root);
    this.lc = $('canvas', this.led).getContext('2d');
    this.oc = $('canvas', this.oled).getContext('2d');
    this.inf = $('#blk-inf', root);
    this.cap = $('#blk-cap', root);
    this.path = $('#blk-inf-path', root);
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
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.led, t, 0.5, { dy: 40 });
    reveal(this.oled, t, 0.85, { dy: 40 });
    paintNight(this.lc, 830, 450, t, true);
    paintNight(this.oc, 830, 450, t, false);
    reveal(this.inf, t, 1.8, { dy: 20 });
    draw(this.path, prog(t, 1.9, 1.3, 'inOutCubic'));
    reveal(this.cap, t, 2.3, { dy: 20 });
  },
};

// ─────────────────────────────── 03 · Процессор ───────────────────────────────
const cpu = {
  init(root) {
    this.head = $('#cpu-head', root);
    this.chip = $('#cpu-chip', root);
    this.cards = ['#cpu-c1', '#cpu-c2', '#cpu-c3', '#cpu-c4'].map((s) => $(s, root));
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
    const d = [
      `M 790 584 H 736 Q 724 584 724 572 V 545 Q 724 533 712 533 H 642`,
      `M 790 656 H 736 Q 724 656 724 668 V 695 Q 724 707 712 707 H 642`,
      `M 1130 584 H 1184 Q 1196 584 1196 572 V 545 Q 1196 533 1208 533 H 1278`,
      `M 1130 656 H 1184 Q 1196 656 1196 668 V 695 Q 1196 707 1208 707 H 1278`,
      `M 888 450 V 404 Q 888 392 876 392 H 780`,
      `M 960 450 V 352`,
      `M 1032 450 V 404 Q 1032 392 1044 392 H 1140`,
      `M 888 790 V 836 Q 888 848 876 848 H 760`,
      `M 960 790 V 900`,
      `M 1032 790 V 836 Q 1032 848 1044 848 H 1160`,
    ];
    this.traces = d.map((p, i) =>
      svg('path', {
        d: p,
        fill: 'none',
        stroke: i < 4 ? 'rgba(190,150,255,0.55)' : 'rgba(190,150,255,0.25)',
        'stroke-width': i < 4 ? 3 : 2,
        'stroke-linecap': 'round',
        pathLength: 1,
      }, sv),
    );
    // Концевые узлы декоративных дорожек
    this.ends = this.traces.slice(4).map((tr) => {
      const pt = tr.getPointAtLength(tr.getTotalLength());
      return svg('circle', { cx: pt.x, cy: pt.y, r: 6, fill: 'none', stroke: 'rgba(190,150,255,0.5)', 'stroke-width': 2, opacity: 0 }, sv);
    });
    // Импульсы данных
    this.pulses = this.traces.map(() =>
      svg('circle', { r: 5, fill: '#fff', opacity: 0, style: 'filter: drop-shadow(0 0 6px #c79bff)' }, sv),
    );
  },
  render(t) {
    reveal(this.head, t, 0.2);
    const ck = prog(t, 0.45, 0.9, 'outBack');
    style(this.chip, { o: clamp(ck * 1.4), s: lerp(0.6, 1, ck), blur: 10 * (1 - clamp(ck)) });
    this.pins.setAttribute('opacity', prog(t, 0.8, 0.5).toFixed(3));
    this.traces.forEach((tr, i) => draw(tr, prog(t, 1.0 + (i % 4) * 0.08 + (i >= 4 ? 0.3 : 0), 0.8, 'inOutCubic')));
    this.ends.forEach((e, i) => e.setAttribute('opacity', prog(t, 1.9 + i * 0.05, 0.3).toFixed(3)));
    this.cards.forEach((c, i) => reveal(c, t, 1.55 + i * 0.18, { dx: i < 2 ? -40 : 40, dy: 0 }));
    // Импульсы бегут от кристалла наружу
    this.pulses.forEach((p, i) => {
      const period = i < 4 ? 1.6 : 2.3;
      const start = 2.0 + i * 0.21;
      if (t < start) {
        p.setAttribute('opacity', 0);
        return;
      }
      const k = ((t - start) / period) % 1;
      const pt = pointAt(this.traces[i], E.inOutSine(k));
      p.setAttribute('cx', pt.x.toFixed(2));
      p.setAttribute('cy', pt.y.toFixed(2));
      p.setAttribute('opacity', (Math.sin(Math.PI * k) * (i < 4 ? 1 : 0.6)).toFixed(3));
    });
    // Лёгкая «пульсация» свечения кристалла
    const glow = 0.5 + 0.5 * Math.sin(t * 2.4);
    $('.chip-core', this.chip).style.boxShadow =
      `0 0 ${50 + glow * 30}px rgba(169,92,255,${(0.35 + glow * 0.2).toFixed(3)}), 0 0 140px rgba(255,77,141,0.22)`;
  },
};

// ─────────────────────────────── 04 · Яркость и HDR ───────────────────────────────
const hdr = {
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

// ─────────────────────────────── 05 · Игры ───────────────────────────────
const gaming = {
  init(root) {
    this.head = $('#gm-head', root);
    this.gauge = $('#gm-gauge', root);
    this.hz = $('#gm-hz', root);
    this.cap = $('#gm-cap', root);
    this.motion = $('#gm-motion', root);
    this.stats = $$('.gstat', root);
    this.badges = $$('.gbadge', root);
    this.ms = $('#gm-ms', root);
    const sv = $('#gm-gauge-svg', root);
    const grad = gradientDef(sv, 'gGauge', ['#ff4d8d', '#a95cff', '#4d9fff']);
    const cx = 400;
    const cy = 400;
    const R = 330;
    this.geo = { cx, cy, R };
    const arc = (r) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    svg('path', { d: arc(R), fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 22, 'stroke-linecap': 'round' }, sv);
    this.arc = svg('path', { d: arc(R), fill: 'none', stroke: grad, 'stroke-width': 22, 'stroke-linecap': 'round', pathLength: 1 }, sv);
    // Деления и подписи шкалы 0…165 Гц
    this.ticks = svg('g', {}, sv);
    for (let v = 0; v <= 165; v += 15) {
      const a = Math.PI * (1 - v / 165);
      const end = v === 0 || v === 165;
      const major = v === 60 || v === 120;
      if (!end) {
        const r1 = R - 34;
        const r2 = R - (major ? 58 : 46);
        svg('line', {
          x1: cx + r1 * Math.cos(a), y1: cy - r1 * Math.sin(a),
          x2: cx + r2 * Math.cos(a), y2: cy - r2 * Math.sin(a),
          stroke: major ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', 'stroke-width': major ? 3 : 2, 'stroke-linecap': 'round',
        }, this.ticks);
      }
      if (major || end) {
        // Подписи 60 и 120 — внутри дуги, 0 и 165 — под концами дуги
        const rl = R - 88;
        const tx = svg('text', {
          x: end ? cx + (v ? R : -R) : cx + rl * Math.cos(a),
          y: end ? cy + 54 : cy - rl * Math.sin(a) + 8,
          'text-anchor': 'middle', fill: v === 165 ? '#fff' : 'rgba(255,255,255,0.55)',
          'font-size': 22, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif',
        }, this.ticks);
        tx.textContent = v;
      }
    }
    this.knob = svg('circle', { r: 15, fill: '#fff', style: 'filter: drop-shadow(0 0 10px rgba(169,92,255,0.9))' }, sv);
    // Дорожки сравнения плавности: 60 и 165 Гц
    this.tracks = [
      { el: $('#gm-t60', root), hz: 60 },
      { el: $('#gm-t165', root), hz: 165 },
    ];
    for (const tr of this.tracks) {
      tr.ghosts = [];
      for (let i = 0; i < 7; i++) {
        const g = document.createElement('div');
        g.className = 'ghost';
        g.style.background = tr.hz === 165 ? 'linear-gradient(135deg,#ff4d8d,#a95cff 55%,#4d9fff)' : '#8b90a0';
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
    const v = Math.round(165 * k);
    this.hz.textContent = v;
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
      const steps = tr.hz === 60 ? 7 : 19;
      const cycle = 2.2;
      const tt = Math.max(0, t - 2.4);
      const u = (tt % cycle) / cycle;
      const cur = Math.floor(u * steps);
      tr.ghosts.forEach((g, i) => {
        const idx = cur - i;
        if (idx < 0 || tt <= 0) {
          g.style.opacity = 0;
          return;
        }
        const x = 6 + (idx / (steps - 1)) * trackW;
        g.style.transform = `translateX(${x.toFixed(2)}px)`;
        g.style.opacity = (i === 0 ? 1 : 0.42 * Math.pow(0.62, i - 1)).toFixed(3);
      });
    }

    this.stats.forEach((s, i) => reveal(s, t, 1.2 + i * 0.3, { dx: 40, dy: 0 }));
    const mk = prog(t, 1.2, 0.9, 'outCubic');
    this.ms.textContent = fmt(lerp(9.9, 0.1, mk), 1);
    this.badges.forEach((b, i) => reveal(b, t, 2.0 + i * 0.14, { dy: 18, s0: 0.9 }));
  },
};

// ─────────────────────────────── 06 · Звук ───────────────────────────────
const sound = {
  init(root) {
    this.head = $('#snd-head', root);
    this.stats = $$('.nstat', root);
    const sv = $('#snd-room', root);
    this.sv = sv;
    const grad = gradientDef(sv, 'gSnd', ['#ff4d8d', '#a95cff', '#4d9fff']);
    // Комната (вид сверху)
    this.room = svg('rect', { x: 30, y: 30, width: 800, height: 580, rx: 34, fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2 }, sv);
    // Телевизор у стены
    this.tvbar = svg('rect', { x: 290, y: 66, width: 280, height: 14, rx: 7, fill: grad }, sv);
    this.tvglow = svg('rect', { x: 290, y: 66, width: 280, height: 14, rx: 7, fill: grad, style: 'filter: blur(10px)', opacity: 0.8 }, sv);
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
    // 11 виртуальных колонок по кругу, 2 верхних и сабвуфер
    const angles = [0, -30, 30, -60, 60, -100, 100, -140, 140, -166, 166];
    const cx = 430;
    const cy = 372;
    this.spk = angles.map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = cx + 345 * Math.sin(a);
      const y = cy - 196 * Math.cos(a);
      const g = svg('g', { opacity: 0 }, sv);
      const ring = svg('circle', { cx: x, cy: y, r: 16, fill: 'none', stroke: '#c79bff', 'stroke-width': 2, opacity: 0 }, g);
      svg('circle', { cx: x, cy: y, r: 11, fill: '#fff' }, g);
      return { g, ring };
    });
    this.height = [
      [322, 300],
      [538, 300],
    ].map(([x, y]) => {
      const g = svg('g', { opacity: 0 }, sv);
      const ring = svg('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: '#4d9fff', 'stroke-width': 2, 'stroke-dasharray': '4 5', opacity: 1 }, g);
      svg('circle', { cx: x, cy: y, r: 11, fill: '#4d9fff' }, g);
      svg('path', { d: `M ${x} ${y - 34} l -8 10 M ${x} ${y - 34} l 8 10`, stroke: '#4d9fff', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, g);
      return { g, ring };
    });
    this.sub = svg('g', { opacity: 0 }, sv);
    svg('rect', { x: 700, y: 62, width: 44, height: 44, rx: 10, fill: 'rgba(255,255,255,0.1)', stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 2 }, this.sub);
    svg('circle', { cx: 722, cy: 84, r: 12, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, this.sub);
    // Подписи
    const lab = (x, y, txt, anchor = 'start', fill = 'rgba(255,255,255,0.6)') => {
      const el = svg('text', { x, y, 'text-anchor': anchor, fill, 'font-size': 20, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif', 'letter-spacing': '0.06em', opacity: 0 }, sv);
      el.textContent = txt;
      return el;
    };
    this.labels = [
      lab(430, 662, 'ВИРТУАЛЬНЫЕ КАНАЛЫ 11.1.2 · ВИД СВЕРХУ', 'middle', 'rgba(255,255,255,0.5)'),
      lab(430, 307, 'верхние', 'middle', '#7fb6ff'),
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
      h.ring.setAttribute('transform', `rotate(${(t * 40).toFixed(2)} ${i ? 538 : 322} 300)`);
    });
    this.sub.setAttribute('opacity', prog(t, 2.8, 0.4).toFixed(3));
    this.labels[0].setAttribute('opacity', prog(t, 2.6, 0.5).toFixed(3));
    this.labels[1].setAttribute('opacity', prog(t, 2.9, 0.5).toFixed(3));
    this.stats.forEach((s, i) => reveal(s, t, 1.0 + i * 0.35, { dx: 40, dy: 0 }));
  },
};

// ─────────────────────────────── 07 · Smart TV ───────────────────────────────
const smart = {
  init(root) {
    this.head = $('#sm-head', root);
    this.box = $('#sm-tvbox', root);
    this.hero = $('#sm-hero', root);
    this.tiles = $$('.sm-tiles:not(.sm-tiles-2) .sm-tile', root);
    this.row2 = $('.sm-tiles-2', root);
    this.cursor = $('#sm-cursor', root);
    this.remote = $('#sm-remote', root);
    this.stats = $$('.mstat', root);
    // Абстрактная «обложка» в баннере
    const art = $('.sm-hero-art', root);
    art.innerHTML = `
      <svg width="822" height="196" viewBox="0 0 822 196">
        <circle cx="640" cy="40" r="120" fill="rgba(255,255,255,0.10)"/>
        <circle cx="720" cy="160" r="90" fill="rgba(77,159,255,0.35)"/>
        <circle cx="560" cy="150" r="60" fill="rgba(255,77,141,0.35)"/>
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
    // Курсор Magic Remote идёт по плиткам (координаты внутри экрана; центры плиток: 95 + 140·i, y = 349;
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
    this.cursor.style.opacity = ck;
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

// ─────────────────────────────── 08 · Габариты ───────────────────────────────
const size = {
  init(root) {
    this.head = $('#sz-head', root);
    this.stats = $$('.zstat', root);
    const sv = $('#sz-svg', root);
    this.sv = sv;
    const S = 820 / 1222; // пикселей на мм
    const x0 = 110;
    const y0 = 70;
    const W = 1222 * S;
    const H = 703 * S;
    const standH = (757 - 703) * S;
    const baseW = 470 * S;
    const cx = x0 + W / 2;
    const line = 'rgba(255,255,255,0.85)';
    const soft = 'rgba(255,255,255,0.35)';
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
    add(svg('rect', { x: x0, y: y0, width: W, height: H, rx: 6, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
    add(svg('rect', { x: x0 + 8, y: y0 + 8, width: W - 16, height: H - 16, rx: 3, fill: 'none', stroke: soft, 'stroke-width': 1.5, pathLength: 1 }, sv));
    add(svg('path', { d: `M ${cx - 28} ${y0 + H} V ${y0 + H + standH - 11} M ${cx + 28} ${y0 + H} V ${y0 + H + standH - 11}`, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
    add(svg('rect', { x: cx - baseW / 2, y: y0 + H + standH - 11, width: baseW, height: 11, rx: 5, fill: 'none', stroke: line, 'stroke-width': 2.5, pathLength: 1 }, sv));
    this.screenFill = svg('rect', { x: x0 + 8, y: y0 + 8, width: W - 16, height: H - 16, rx: 3, fill: 'url(#szScreen)', opacity: 0 }, sv);
    const lg = svg('linearGradient', { id: 'szScreen', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    svg('stop', { offset: 0, 'stop-color': 'rgba(255,77,141,0.16)' }, lg);
    svg('stop', { offset: 0.5, 'stop-color': 'rgba(169,92,255,0.08)' }, lg);
    svg('stop', { offset: 1, 'stop-color': 'rgba(77,159,255,0.16)' }, lg);

    // Размерные линии
    const dims = [];
    // Размерная линия с разрывом под подпись посередине
    const dimLine = (x1, y1, x2, y2, label, gap) => {
      const g = svg('g', { opacity: 0 }, sv);
      const vertical = x1 === x2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const d = vertical
        ? `M ${x1} ${my - gap / 2} V ${y1} M ${x1} ${my + gap / 2} V ${y2}`
        : `M ${mx - gap / 2} ${y1} H ${x1} M ${mx + gap / 2} ${y1} H ${x2}`;
      const p = svg('path', { d, stroke: '#c79bff', 'stroke-width': 2, fill: 'none', pathLength: 1 }, g);
      const tick = (x, y) =>
        svg('path', { d: vertical ? `M ${x - 12} ${y} H ${x + 12}` : `M ${x} ${y - 12} V ${y + 12}`, stroke: '#c79bff', 'stroke-width': 2 }, g);
      tick(x1, y1);
      tick(x2, y2);
      const tx = svg('text', { x: mx, y: my + 9, 'text-anchor': 'middle', class: 'dim-label', transform: vertical ? `rotate(-90 ${mx} ${my})` : '' }, g);
      tx.textContent = label;
      dims.push({ g, p });
    };
    dimLine(x0, 26, x0 + W, 26, '1222 мм', 150);
    dimLine(58, y0, 58, y0 + H, '703 мм', 130);

    // Вид сбоку
    const sx = 1090;
    const thin = 7;
    const thick = 45.1 * S;
    const baseD = 230 * S;
    const side = svg('g', { opacity: 0 }, sv);
    svg('path', {
      d: `M ${sx} ${y0} h ${thin} V ${y0 + H * 0.42} L ${sx + thick} ${y0 + H * 0.52} V ${y0 + H} H ${sx} Z`,
      fill: 'rgba(255,255,255,0.06)', stroke: line, 'stroke-width': 2.5, 'stroke-linejoin': 'round',
    }, side);
    svg('path', { d: `M ${sx + thick / 2 - 6} ${y0 + H} V ${y0 + H + standH - 11} M ${sx + thick / 2 + 6} ${y0 + H} V ${y0 + H + standH - 11}`, stroke: line, 'stroke-width': 2.5, fill: 'none' }, side);
    svg('rect', { x: sx + thick / 2 - baseD / 2, y: y0 + H + standH - 11, width: baseD, height: 11, rx: 5, fill: 'none', stroke: line, 'stroke-width': 2.5 }, side);
    const sideCap = svg('text', { x: sx + thick / 2, y: y0 + H + standH + 44, 'text-anchor': 'middle', class: 'dim-sub' }, side);
    sideCap.textContent = 'вид сбоку';
    this.side = side;
    // Толщина
    const dg = svg('g', { opacity: 0 }, sv);
    svg('path', { d: `M ${sx - 70} ${y0 + H * 0.78} H ${sx}`, stroke: '#c79bff', 'stroke-width': 2 }, dg);
    svg('path', { d: `M ${sx + thick + 70} ${y0 + H * 0.78} H ${sx + thick}`, stroke: '#c79bff', 'stroke-width': 2 }, dg);
    svg('path', { d: `M ${sx - 10} ${y0 + H * 0.78 - 7} L ${sx} ${y0 + H * 0.78} L ${sx - 10} ${y0 + H * 0.78 + 7}`, stroke: '#c79bff', 'stroke-width': 2, fill: 'none' }, dg);
    svg('path', { d: `M ${sx + thick + 10} ${y0 + H * 0.78 - 7} L ${sx + thick} ${y0 + H * 0.78} L ${sx + thick + 10} ${y0 + H * 0.78 + 7}`, stroke: '#c79bff', 'stroke-width': 2, fill: 'none' }, dg);
    const tl = svg('text', { x: sx + thick / 2, y: y0 + H * 0.78 - 26, 'text-anchor': 'middle', class: 'dim-label' }, dg);
    tl.textContent = '45,1 мм';
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

// ─────────────────────────────── 09 · Разъёмы ───────────────────────────────
const ports = {
  init(root) {
    this.head = $('#pt-head', root);
    this.wireless = $$('.wcard', root);
    const sv = $('#pt-svg', root);
    this.sv = sv;
    const labels = $('#pt-labels', root);
    this.panel = svg('rect', { x: 0, y: 0, width: 1680, height: 340, rx: 28, fill: 'rgba(255,255,255,0.035)', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2 }, sv);
    const cy = 120;
    const hdmi = (x) => `M ${x - 52} ${cy - 22} H ${x + 52} V ${cy + 6} L ${x + 40} ${cy + 22} H ${x - 40} L ${x - 52} ${cy + 6} Z`;
    const usb = (x) => `M ${x - 36} ${cy - 15} H ${x + 36} V ${cy + 15} H ${x - 36} Z`;
    const lan = (x) => `M ${x - 32} ${cy - 26} H ${x + 32} V ${cy + 16} H ${x + 14} V ${cy + 28} H ${x - 14} V ${cy + 16} H ${x - 32} Z`;
    const opt = (x) => `M ${x - 26} ${cy - 26} H ${x + 26} V ${cy + 14} L ${x + 14} ${cy + 26} H ${x - 14} L ${x - 26} ${cy + 14} Z`;
    const circ = (x, r) => `M ${x - r} ${cy} A ${r} ${r} 0 1 0 ${x + r} ${cy} A ${r} ${r} 0 1 0 ${x - r} ${cy} Z`;
    const groups = [
      { xs: [150, 275, 400, 525], shape: hdmi, center: 337.5, title: 'HDMI 2.1 × 4', sub: '4K 165 Гц · eARC' },
      { xs: [700, 800], shape: usb, center: 750, title: 'USB × 2', sub: 'USB 2.0' },
      { xs: [950], shape: lan, center: 950, title: 'LAN', sub: 'Ethernet' },
      { xs: [1140], shape: opt, center: 1140, title: 'Оптический', sub: 'аудиовыход' },
      { xs: [1340], shape: (x) => circ(x, 30), center: 1340, title: 'Антенна', sub: 'эфир и кабель' },
      { xs: [1540], shape: (x) => circ(x, 30), center: 1540, title: 'Спутник', sub: 'DVB-S2' },
    ];
    this.groups = groups.map((gp) => {
      const g = svg('g', {}, sv);
      const shapes = gp.xs.map((x) => {
        const glow = svg('path', { d: gp.shape(x), fill: 'none', stroke: '#c79bff', 'stroke-width': 8, opacity: 0, style: 'filter: blur(6px)' }, g);
        const body = svg('path', { d: gp.shape(x), fill: '#050507', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, g);
        return { glow, body };
      });
      // Внутренние детали разъёмов
      gp.xs.forEach((x) => {
        if (gp.shape === hdmi) svg('rect', { x: x - 34, y: cy - 6, width: 68, height: 8, rx: 2, fill: 'rgba(255,255,255,0.25)' }, g);
        if (gp.shape === usb) svg('rect', { x: x - 24, y: cy - 6, width: 48, height: 9, rx: 2, fill: 'rgba(255,255,255,0.25)' }, g);
        if (gp.shape === lan) for (let i = 0; i < 6; i++) svg('rect', { x: x - 20 + i * 7, y: cy - 20, width: 3, height: 10, fill: 'rgba(255,255,255,0.35)' }, g);
        if (gp.shape === opt) svg('circle', { cx: x, cy: cy - 2, r: 8, fill: 'rgba(255,77,141,0.55)' }, g);
        if (gp.center >= 1340) {
          svg('circle', { cx: x, cy, r: 13, fill: 'none', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 2 }, g);
          svg('circle', { cx: x, cy, r: 3.5, fill: 'rgba(255,255,255,0.6)' }, g);
        }
      });
      const lab = document.createElement('div');
      lab.className = 'plabel';
      lab.style.left = `${gp.center}px`;
      lab.innerHTML = `<div class="ptitle">${gp.title}</div><div class="psub">${gp.sub}</div>`;
      labels.appendChild(lab);
      return { shapes, lab };
    });
    // Маленькие номера HDMI
    groups[0].xs.forEach((x, i) => {
      const n = svg('text', { x, y: cy - 40, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.45)', 'font-size': 16, 'font-weight': 800, 'font-family': 'Manrope Variable, sans-serif' }, sv);
      n.textContent = `HDMI ${i + 1}`;
    });
  },
  render(t) {
    reveal(this.head, t, 0.25);
    reveal(this.sv, t, 0.4, { dy: 30 });
    this.groups.forEach((g, i) => {
      const st = 1.0 + i * 0.42;
      const k = prog(t, st, 0.5, 'outCubic');
      const pulse = prog(t, st, 0.35) * (1 - prog(t, st + 0.5, 1.2));
      g.shapes.forEach((s) => {
        s.glow.setAttribute('opacity', (0.15 * k + 0.85 * pulse).toFixed(3));
        s.body.setAttribute('stroke', k > 0.5 ? '#e7d5ff' : 'rgba(255,255,255,0.35)');
      });
      reveal(g.lab, t, st + 0.05, { dy: 18 });
    });
    this.wireless.forEach((w, i) => reveal(w, t, 3.8 + i * 0.18, { dy: 20 }));
  },
};

// ─────────────────────────────── Итог ───────────────────────────────
const outro = {
  init(root) {
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
    if (rk > 0) paintRibbons(this.rctx, 1920, 520, t + 20, 1);
    this.note.style.opacity = (Math.min(prog(t, 6.2, 0.8), 1 - end)).toFixed(3);
  },
};

export const SCENE_IMPL = { intro, screen, black, cpu, hdr, gaming, sound, smart, size, ports, outro };
