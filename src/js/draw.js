// Отрисовка «живых» картинок на canvas: всё — функции времени t.
import { clamp, rng } from './engine.js';

const RIBBON = [
  [255, 150, 70],
  [255, 77, 141],
  [169, 92, 255],
  [77, 123, 255],
  [61, 214, 255],
];

function mix(stops, f) {
  const n = stops.length - 1;
  const x = clamp(f) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const k = x - i;
  return stops[i].map((v, j) => v + (stops[i + 1][j] - v) * k);
}

const buffers = new Map();
function buffer(key, w, h) {
  let c = buffers.get(key);
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    buffers.set(key, c);
  }
  return c;
}

/** Телевизор: рамка, экран-canvas, световая линия включения и подставка. */
export function createTV(host, w) {
  const h = Math.round((w * 9) / 16);
  const bezel = Math.max(4, Math.round(w * 0.005));
  const sw = w - bezel * 2;
  const sh = h - bezel * 2;
  host.innerHTML = `
    <div class="tv" style="width:${w}px">
      <div class="tv-floor"></div>
      <div class="tv-frame" style="height:${h}px;padding:${bezel}px">
        <div class="tv-screen">
          <canvas width="${sw}" height="${sh}"></canvas>
          <div class="tv-line"></div>
          <div class="tv-sheen"></div>
        </div>
      </div>
      <div class="tv-stand">
        <div class="tv-neck" style="width:${Math.round(w * 0.075)}px;height:${Math.round(w * 0.03)}px"></div>
        <div class="tv-base" style="width:${Math.round(w * 0.385)}px;height:${Math.round(w * 0.014)}px"></div>
      </div>
    </div>`;
  const q = (s) => host.querySelector(s);
  const canvas = q('canvas');
  return {
    root: q('.tv'),
    frame: q('.tv-frame'),
    screen: q('.tv-screen'),
    line: q('.tv-line'),
    floor: q('.tv-floor'),
    stand: q('.tv-stand'),
    canvas,
    ctx: canvas.getContext('2d'),
    w: sw,
    h: sh,
  };
}

/** Шёлковые цветные ленты на чёрном фоне — «демо-картинка» OLED. */
export function paintRibbons(ctx, w, h, t, gain = 1) {
  const lines = buffer('ribbons-' + w, w, h);
  const lc = lines.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, w, h);
  lc.globalCompositeOperation = 'lighter';
  lc.lineWidth = Math.max(1, w / 720);
  const N = 76;
  const steps = 96;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const [r, g, b] = mix(RIBBON, f);
    const a = (0.05 + 0.32 * Math.pow(Math.sin(Math.PI * f), 1.4)) * gain;
    lc.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
    lc.beginPath();
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      const x = -10 + u * (w + 20);
      const spread = 0.62 + 0.38 * Math.sin(u * 3.1 + t * 0.35 + 1.0);
      const y =
        h *
        (0.52 +
          0.16 * Math.sin(u * 2.4 + t * 0.5 + f * 1.2) +
          0.06 * Math.sin(u * 5.9 - t * 0.7 + f * 2.7) +
          (f - 0.5) * 0.38 * spread);
      if (j === 0) lc.moveTo(x, y);
      else lc.lineTo(x, y);
    }
    lc.stroke();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // мягкие цветовые пятна
  const fields = [
    [0.22 + 0.05 * Math.sin(t * 0.3), 0.38, 0.5, [255, 77, 141], 0.2],
    [0.78 + 0.04 * Math.cos(t * 0.25), 0.62, 0.55, [77, 123, 255], 0.2],
    [0.5, 0.2 + 0.05 * Math.sin(t * 0.4), 0.4, [169, 92, 255], 0.14],
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const [fx, fy, fr, c, fa] of fields) {
    const g = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, fr * w);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${fa * gain})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.filter = `blur(${Math.round(w / 90)}px)`;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(lines, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.drawImage(lines, 0, 0);
  ctx.restore();
}

/** Пиксели OLED крупным планом: 3×3 пикселя по 4 субпикселя (W, R, G, B). */
export function paintPixels(ctx, size, t, k) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, size, size);
  const n = 3;
  const cell = size / n;
  const pad = cell * 0.12;
  const sub = (cell - pad * 2) / 4;
  const colors = [
    [255, 255, 255],
    [255, 60, 90],
    [60, 230, 120],
    [70, 120, 255],
  ];
  const R = rng(42);
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const idx = gy * n + gx;
      const on = clamp((k * 11 - idx) / 1.5);
      const phase = R() * 6.28;
      for (let s = 0; s < 4; s++) {
        const lvl = on * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2 + phase + s * 1.3)));
        const [r, g, b] = colors[s];
        const x = gx * cell + pad + s * sub + sub * 0.12;
        const y = gy * cell + pad;
        ctx.fillStyle = `rgba(${r},${g},${b},${(0.12 + 0.88 * lvl).toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(x, y, sub * 0.76, cell - pad * 2, sub * 0.3);
        ctx.fill();
      }
    }
  }
}

/** Ночная сцена для сравнения LED и OLED. */
export function paintNight(ctx, w, h, t, led) {
  const R = rng(7);
  const bg = led ? [16, 19, 27] : [0, 0, 0];
  const bgc = `rgb(${bg.join(',')})`;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bgc;
  ctx.fillRect(0, 0, w, h);

  const moon = { x: w * 0.7, y: h * 0.3, r: 44 };
  // Город: силуэты и окна
  const horizon = h * 0.74;
  const buildings = [];
  let bx = -10;
  while (bx < w) {
    const bw = 34 + R() * 60;
    const bh = h * (0.08 + R() * 0.2);
    buildings.push({ x: bx, w: bw, top: h - bh - (h - horizon) * 0.1 });
    bx += bw + 4 + R() * 10;
  }
  const windows = [];
  for (const b of buildings) {
    for (let y = b.top + 10; y < h - 8; y += 14) {
      for (let x = b.x + 7; x < b.x + b.w - 8; x += 11) {
        if (R() < 0.22) windows.push({ x, y, a: 0.55 + R() * 0.45 });
      }
    }
  }

  if (led) {
    // Зоны локального затемнения: «блоки» подсветки вокруг ярких объектов
    const zone = 52;
    const zl = buffer('zones', w, h);
    const zc = zl.getContext('2d');
    zc.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += zone) {
      for (let x = 0; x < w; x += zone) {
        const cx = x + zone / 2;
        const cy = y + zone / 2;
        const dm = Math.hypot(cx - moon.x, cy - moon.y);
        let lum = clamp(1.25 - dm / 190);
        if (cy > horizon - zone) lum = Math.max(lum, 0.55 + 0.25 * Math.sin(cx * 0.05));
        if (lum > 0) {
          zc.fillStyle = `rgba(150,170,215,${(lum * 0.16).toFixed(3)})`;
          zc.fillRect(x, y, zone, zone);
        }
      }
    }
    ctx.filter = 'blur(10px)';
    ctx.drawImage(zl, 0, 0);
    ctx.filter = 'none';
    // Ореол вокруг луны
    const halo = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.6, moon.x, moon.y, moon.r * 5);
    halo.addColorStop(0, 'rgba(210,222,255,0.42)');
    halo.addColorStop(1, 'rgba(210,222,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
  } else {
    const halo = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.9, moon.x, moon.y, moon.r * 1.7);
    halo.addColorStop(0, 'rgba(230,236,255,0.18)');
    halo.addColorStop(1, 'rgba(230,236,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
  }

  // Звёзды
  const S = rng(99);
  for (let i = 0; i < 170; i++) {
    const x = S() * w;
    const y = S() * horizon * 0.95;
    const size = 0.5 + Math.pow(S(), 3) * 2.2;
    const ph = S() * 6.283;
    const tw = 0.55 + 0.45 * Math.sin(t * 1.6 + ph);
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 1.3) continue;
    if (led) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
      g.addColorStop(0, `rgba(200,210,235,${(0.35 * tw).toFixed(3)})`);
      g.addColorStop(1, 'rgba(200,210,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - size * 5, y - size * 5, size * 10, size * 10);
      ctx.fillStyle = `rgba(215,220,235,${(0.7 * tw).toFixed(3)})`;
    } else {
      ctx.fillStyle = `rgba(255,255,255,${(0.95 * tw).toFixed(3)})`;
    }
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Луна-полумесяц: вырезаем диск на отдельном слое, чтобы сквозь вырез был виден фон
  const mb = buffer('moon', moon.r * 2 + 4, moon.r * 2 + 4);
  const mc = mb.getContext('2d');
  const c0 = moon.r + 2;
  mc.globalCompositeOperation = 'source-over';
  mc.clearRect(0, 0, mb.width, mb.height);
  mc.fillStyle = led ? '#e8ecf5' : '#fffaf0';
  mc.beginPath();
  mc.arc(c0, c0, moon.r, 0, Math.PI * 2);
  mc.fill();
  mc.globalCompositeOperation = 'destination-out';
  mc.beginPath();
  mc.arc(c0 - moon.r * 0.42, c0 - moon.r * 0.22, moon.r * 0.92, 0, Math.PI * 2);
  mc.fill();
  ctx.drawImage(mb, moon.x - c0, moon.y - c0);

  // Дома и окна
  ctx.fillStyle = led ? 'rgb(22,26,36)' : '#000';
  for (const b of buildings) ctx.fillRect(b.x, b.top, b.w, h - b.top);
  for (const wdw of windows) {
    const flick = 0.85 + 0.15 * Math.sin(t * 0.8 + wdw.x * 0.3);
    if (led) {
      const g = ctx.createRadialGradient(wdw.x + 2, wdw.y + 3, 0, wdw.x + 2, wdw.y + 3, 14);
      g.addColorStop(0, `rgba(255,200,120,${(0.22 * wdw.a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(wdw.x - 12, wdw.y - 11, 28, 28);
    }
    ctx.fillStyle = `rgba(255,${led ? 205 : 196},${led ? 135 : 110},${(wdw.a * flick).toFixed(3)})`;
    ctx.fillRect(wdw.x, wdw.y, 4, 6);
  }

  if (led) {
    // «Приподнятый» чёрный: вуаль подсветки по всему кадру
    ctx.fillStyle = 'rgba(40,48,66,0.10)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** Закат над горами и водой — сцена для сравнения SDR/HDR. */
export function paintLandscape(ctx, w, h, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const horizon = h * 0.64;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#060a26');
  sky.addColorStop(0.42, '#2c1a63');
  sky.addColorStop(0.72, '#b02f6e');
  sky.addColorStop(0.9, '#ff6d45');
  sky.addColorStop(1, '#ffc56e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);

  // Звёзды в верхней части неба
  const S = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = S() * w;
    const y = S() * horizon * 0.4;
    const a = (0.3 + 0.5 * S()) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }

  const sun = { x: w * 0.66, y: h * 0.3 - t * 1.5, r: 30 };
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, w * 0.45);
  glow.addColorStop(0, 'rgba(255,220,160,0.75)');
  glow.addColorStop(0.15, 'rgba(255,150,90,0.35)');
  glow.addColorStop(1, 'rgba(255,90,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff7e2';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();

  // Горы: три плана
  const layers = [
    { base: 0.5, amp: 0.13, col: '#4a2159', seed: 11, f: 1.0 },
    { base: 0.56, amp: 0.1, col: '#2a1238', seed: 12, f: 1.6 },
    { base: 0.61, amp: 0.07, col: '#12081a', seed: 13, f: 2.4 },
  ];
  for (const L of layers) {
    const Rr = rng(L.seed);
    const ph = [Rr() * 6, Rr() * 6, Rr() * 6];
    ctx.fillStyle = L.col;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= w; x += 6) {
      const u = x / w;
      const y =
        h *
        (L.base -
          L.amp *
            (0.55 * Math.abs(Math.sin(u * 3.1 * L.f + ph[0])) +
              0.3 * Math.abs(Math.sin(u * 7.3 * L.f + ph[1])) +
              0.15 * Math.sin(u * 17 * L.f + ph[2])));
      ctx.lineTo(x, Math.min(y, horizon + 2));
    }
    ctx.lineTo(w, horizon + 2);
    ctx.closePath();
    ctx.fill();
  }

  // Вода с отражением
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, '#ff9a5a');
  water.addColorStop(0.08, '#8e2a62');
  water.addColorStop(0.5, '#2a124d');
  water.addColorStop(1, '#070817');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const y = horizon + 6 + i * ((h - horizon) / 28);
    const spread = 18 + i * 5;
    const wob = Math.sin(t * 2.4 + i * 1.7) * 8;
    const a = 0.55 * (1 - i / 28);
    ctx.fillStyle = `rgba(255,214,150,${a.toFixed(3)})`;
    ctx.fillRect(sun.x - spread / 2 + wob, y, spread, 2.2);
  }
  ctx.restore();
}
