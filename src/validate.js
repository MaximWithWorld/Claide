// Проверка файла модели до рендера: понятные сообщения вместо ошибок в середине работы.
import { DEFAULT_SCENES } from './timeline.js';

const THEMES = ['lg', 'samsung', 'sony', 'neutral'];
const PANELS = ['oled', 'qd-oled', 'miniled', 'led'];
const MODES = ['led', 'miniled', 'oled'];
const PORTS = ['hdmi', 'usb', 'lan', 'optical', 'coax', 'jack'];

/** Все строки из данных с путями, например «cpu.cards[0].title». */
function strings(v, path = '', out = []) {
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out);
  return out;
}

/**
 * Число из данных: 65, '65' или заготовка шаблона '[65]' (скобки означают «пример, заменить»).
 */
export function num(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Незаполненные места шаблона: всё, что в [квадратных скобках], — и тексты, и числа.
 * В шаблонах (_template-*.js) это нормально, в файле модели — ошибка.
 */
export function placeholders(P) {
  return strings(P)
    .filter(([, v]) => /\[[^\]]*\]/.test(v))
    .map(([k, v]) => `${k}: «${v}»`);
}

export function validateProduct(P) {
  const errors = [];
  const need = (cond, msg) => cond || errors.push(msg);
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  const list = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max;

  need(THEMES.includes(P.theme), `theme: одна из ${THEMES.join(', ')}`);
  need(PANELS.includes(P.panel), `panel: один из ${PANELS.join(', ')}`);
  need(['center', 'feet'].includes(P.stand), 'stand: center или feet');
  need(P.hud && str(P.hud.brand) && str(P.hud.model), 'hud: нужны brand и model');
  const scenes = P.scenes || DEFAULT_SCENES;
  need(scenes[0] === 'intro' && scenes[scenes.length - 1] === 'outro', 'scenes: первая — intro, последняя — outro');
  for (const id of scenes) {
    need(DEFAULT_SCENES.includes(id), `scenes: неизвестная сцена «${id}»`);
    need(P[id], `нет раздела ${id} (он указан в scenes)`);
  }
  const has = (id) => scenes.includes(id) && P[id];

  if (has('intro')) {
    need(list(P.intro.title, 1, 2), 'intro.title: одна или две строки');
    need(list(P.intro.chips || [], 0, 4), 'intro.chips: не больше 4');
  }
  if (has('screen')) {
    need(num(P.screen.inches) > 0, 'screen.inches: число');
    need(list(P.screen.stats, 1, 3), 'screen.stats: от 1 до 3 строк');
  }
  if (has('contrast')) {
    const K = P.contrast;
    need(K.left && MODES.includes(K.left.mode), `contrast.left.mode: ${MODES.join(', ')}`);
    need(K.right && MODES.includes(K.right.mode), `contrast.right.mode: ${MODES.join(', ')}`);
  }
  if (has('cpu')) {
    need(list(P.cpu.chip, 1, 3), 'cpu.chip: крупная надпись и до двух строк');
    need(list(P.cpu.cards, 4, 4), 'cpu.cards: ровно 4 карточки');
  }
  if (has('hdr')) need(list(P.hdr.cards, 1, 4), 'hdr.cards: от 1 до 4 карточек');
  if (has('gaming')) {
    need(num(P.gaming.hz) > 60, 'gaming.hz: число больше 60');
    need(list(P.gaming.stats || [], 0, 2), 'gaming.stats: не больше 2');
  }
  if (has('sound')) {
    need(list(P.sound.title, 1, 2), 'sound.title: одна или две строки');
    need(list(P.sound.stats || [], 0, 2), 'sound.stats: не больше 2');
  }
  if (has('smart')) need(list(P.smart.stats, 1, 4), 'smart.stats: от 1 до 4');
  if (has('size')) {
    const mm = P.size.mm || {};
    for (const k of ['width', 'height', 'depth']) need(num(mm[k]) > 0, `size.mm.${k}: число, мм`);
    need(list(P.size.stats, 1, 4), 'size.stats: от 1 до 4');
  }
  if (has('ports')) {
    need(list(P.ports.groups, 1, 8), 'ports.groups: от 1 до 8 групп');
    for (const g of P.ports.groups || []) need(PORTS.includes(g.type), `ports.groups: тип «${g.type}» — один из ${PORTS.join(', ')}`);
    need(list(P.ports.wireless || [], 0, 4), 'ports.wireless: не больше 4');
  }
  if (has('outro')) {
    need(list(P.outro.tiles, 3, 8), 'outro.tiles: от 3 до 8 плиток');
    need(P.outro.lockup && list(P.outro.lockup.title, 1, 2), 'outro.lockup.title: одна или две части');
  }
  return errors;
}
