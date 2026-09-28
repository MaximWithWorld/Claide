// Хронометраж ролика. Общий модуль для страницы (браузер) и для скриптов рендера и музыки (Node).
// Соседние сцены перекрываются на OVERLAP секунд — в это время идёт переход.

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const OVERLAP = 0.5;

/** Все сцены шаблона в порядке по умолчанию и их длительность, с. */
export const DEFAULT_SCENES = ['intro', 'screen', 'contrast', 'cpu', 'hdr', 'gaming', 'sound', 'smart', 'size', 'ports', 'outro'];

export const DEFAULT_DURATIONS = {
  intro: 7.0,
  screen: 7.5,
  contrast: 7.5,
  cpu: 8.0,
  hdr: 7.5,
  gaming: 9.0,
  sound: 7.5,
  smart: 7.5,
  size: 8.0,
  ports: 7.5,
  outro: 9.5,
};

/** Раскладывает сцены модели по времени: [{ id, dur, start, end }], и общая длительность. */
export function buildTimeline(product) {
  const ids = product.scenes || DEFAULT_SCENES;
  if (ids[0] !== 'intro' || ids[ids.length - 1] !== 'outro') {
    throw new Error('Список scenes должен начинаться с intro и заканчиваться outro');
  }
  let acc = 0;
  const scenes = ids.map((id) => {
    if (!(id in DEFAULT_DURATIONS)) throw new Error(`Неизвестная сцена «${id}»`);
    const dur = product.durations?.[id] ?? DEFAULT_DURATIONS[id];
    const s = { id, dur, start: acc, end: acc + dur };
    acc += dur - OVERLAP;
    return s;
  });
  return { scenes, duration: scenes[scenes.length - 1].end };
}
