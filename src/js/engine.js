// Минимальный детерминированный «движок» анимации: всё состояние кадра
// вычисляется из времени t, поэтому любой кадр можно отрисовать в любом порядке.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

export const E = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inCubic: (k) => k * k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  outQuint: (k) => 1 - Math.pow(1 - k, 5),
  outExpo: (k) => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
};

/** Прогресс 0..1 участка [start, start + dur] с функцией сглаживания. */
export const prog = (t, start, dur, ease = 'outCubic') =>
  E[ease](clamp((t - start) / dur));

/** Проставляет прозрачность, сдвиг, масштаб, поворот и размытие элемента. */
export function style(el, { o = 1, x = 0, y = 0, s = 1, sx = s, sy = s, r = 0, blur = 0 } = {}) {
  el.style.opacity = o.toFixed(4);
  el.style.transform =
    `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) ` +
    `scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) rotate(${r.toFixed(3)}deg)`;
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
  el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
}

/** Стандартное появление: снизу вверх с проявлением и лёгким размытием. */
export function reveal(el, t, start, { dur = 0.8, dx = 0, dy = 34, blur = 8, s0 = 1, ease = 'outCubic' } = {}) {
  const k = prog(t, start, dur, ease);
  style(el, { o: k, x: dx * (1 - k), y: dy * (1 - k), s: lerp(s0, 1, k), blur: blur * (1 - k) });
  return k;
}

/** Детерминированный генератор псевдослучайных чисел. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Число с запятой как десятичным разделителем и пробелами между разрядами. */
export function fmt(v, digits = 0) {
  const [i, f] = v.toFixed(digits).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return f ? `${int},${f}` : int;
}
