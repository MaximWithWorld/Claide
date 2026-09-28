// Хронометраж ролика. Общий модуль для страницы (браузер) и для скриптов рендера и музыки (Node).
// Соседние сцены перекрываются на OVERLAP секунд — в это время идёт переход.

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const OVERLAP = 0.5;

export const SCENES = [
  { id: 'intro', dur: 7.0, chapter: null },
  { id: 'screen', dur: 7.5, chapter: 'Экран' },
  { id: 'black', dur: 7.5, chapter: 'Контраст' },
  { id: 'cpu', dur: 8.0, chapter: 'Процессор' },
  { id: 'hdr', dur: 7.5, chapter: 'HDR' },
  { id: 'gaming', dur: 9.0, chapter: 'Игры' },
  { id: 'sound', dur: 7.5, chapter: 'Звук' },
  { id: 'smart', dur: 7.5, chapter: 'Smart TV' },
  { id: 'size', dur: 8.0, chapter: 'Габариты' },
  { id: 'ports', dur: 7.5, chapter: 'Разъёмы' },
  { id: 'outro', dur: 9.5, chapter: null },
];

let acc = 0;
for (const s of SCENES) {
  s.start = acc;
  s.end = acc + s.dur;
  acc += s.dur - OVERLAP;
}

export const DURATION = SCENES[SCENES.length - 1].end;
