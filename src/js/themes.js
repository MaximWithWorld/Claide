// Палитры брендов. Задаются в данных модели полем theme; все акцентные цвета страницы берутся отсюда.

export const THEMES = {
  // LG: розовый → фиолетовый → синий
  lg: {
    stops: ['#ff4d8d', '#a95cff', '#4d9fff'],
    ink: '#e0c6ff',
    ink2: '#d4b3ff',
    line: '#c79bff',
    hero: 'linear-gradient(120deg, #2a1150 0%, #6a1f6e 45%, #1c3d8f 100%)',
    ribbon: [[255, 150, 70], [255, 77, 141], [169, 92, 255], [77, 123, 255], [61, 214, 255]],
  },
  // Samsung: синий → голубой → бирюзовый
  samsung: {
    stops: ['#4d7cff', '#2fb5ff', '#34e3c4'],
    ink: '#c9ddff',
    line: '#8fb6ff',
    hero: 'linear-gradient(120deg, #0e1a5c 0%, #10437f 45%, #0a5d66 100%)',
    ribbon: [[130, 100, 255], [77, 124, 255], [47, 181, 255], [52, 227, 196], [180, 255, 235]],
  },
  // Sony: янтарный → коралловый → фиолетовый
  sony: {
    stops: ['#ffb347', '#ff5f6d', '#c86bff'],
    ink: '#ffd9c7',
    line: '#ffa98f',
    hero: 'linear-gradient(120deg, #4d2508 0%, #6e1d36 45%, #3d1a70 100%)',
    ribbon: [[255, 214, 130], [255, 179, 71], [255, 95, 109], [200, 107, 255], [120, 110, 255]],
  },
  // Нейтральная: серебро и холодный синий — для любого бренда
  neutral: {
    stops: ['#f1f3f8', '#9fb0d0', '#5f7bb0'],
    ink: '#dde5f5',
    line: '#aebfe0',
    hero: 'linear-gradient(120deg, #1b2233 0%, #2b3550 45%, #1a2a4d 100%)',
    ribbon: [[255, 255, 255], [200, 212, 235], [150, 172, 215], [95, 123, 176], [70, 90, 150]],
  },
};

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgba = (hex, a) => `rgba(${hexRgb(hex).join(',')},${a})`;

/** Смешивает цвет с белым: amt = 0 — исходный цвет, 1 — белый. */
export function tint(hex, amt) {
  const c = hexRgb(hex).map((v) => Math.round(v + (255 - v) * amt));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Возвращает палитру по имени и проставляет CSS-переменные на :root. */
export function applyTheme(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`Нет палитры «${name}». Доступны: ${Object.keys(THEMES).join(', ')}`);
  const [a1, a2, a3] = t.stops;
  const vars = {
    '--a1': a1,
    '--a2': a2,
    '--a3': a3,
    '--grad': `linear-gradient(90deg, ${a1} 0%, ${a2} 52%, ${a3} 100%)`,
    '--ink': t.ink,
    '--ink2': t.ink2 || t.ink,
    '--soft': rgba(a2, 0.16),
    '--hero': t.hero,
    '--glow1': rgba(a1, 0.13),
    '--glow1-0': rgba(a1, 0),
    '--glow2': rgba(a3, 0.12),
    '--glow2-0': rgba(a3, 0),
    '--glow3': rgba(a2, 0.1),
    '--glow3-0': rgba(a2, 0),
    '--a1-22': rgba(a1, 0.22),
    '--a1-45': rgba(a1, 0.45),
    '--a2-0': rgba(a2, 0),
    '--a2-28': rgba(a2, 0.28),
    '--a2-45': rgba(a2, 0.45),
    '--a2-55': rgba(a2, 0.55),
    '--a2-85': rgba(a2, 0.85),
  };
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  return t;
}
