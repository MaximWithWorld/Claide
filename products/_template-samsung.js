// ШАБЛОН для телевизоров Samsung. Как пользоваться:
//   1) скопируйте файл в products/<id>.js, например products/samsung-qe65qn90f.js;
//   2) замените всё, что в [квадратных скобках], — и тексты, и числа — на данные конкретной модели
//      (скобки убрать); неподтверждённое лучше удалить, чем оставить;
//   3) npm run check -- --product <id>  →  npm run render -- --product <id>.
// Подсказки по линейкам Samsung (проверяйте по конкретной модели):
//   • Neo QLED (QN…) — подсветка Mini LED: panel 'miniled', в «Контрасте» справа mode 'miniled'.
//   • OLED (S85/S90/S95) — panel 'qd-oled' (часть размеров S90/S85 — WOLED: 'oled'), справа mode 'oled';
//     в «Экране» третью строку замените на самосветящиеся пиксели, как в файле LG.
//   • QLED и Crystal UHD без локального затемнения — panel 'led'; сцену 'contrast' лучше убрать из scenes.
//   • Samsung не поддерживает Dolby Vision — его HDR-формат HDR10+.
//   • Сервисы, которые не работают в России (облачный гейминг и т. п.), в ролик не включайте.
// Источники характеристик — перечислите ссылками в комментарии в начале файла модели.

export default {
  file: '[Samsung_QE65QN90F]_infographic',
  theme: 'samsung',
  panel: 'miniled',
  stand: 'center', // у многих моделей Samsung ножки по краям — тогда 'feet'

  hud: { brand: 'Samsung Neo QLED [QN90F]', model: '[QE65QN90FAUXRU]' },

  scenes: ['intro', 'screen', 'contrast', 'cpu', 'hdr', 'gaming', 'sound', 'smart', 'size', 'ports', 'outro'],

  intro: {
    pill: 'Модель [2025] года',
    title: ['Samsung Neo QLED', '[QN90F]'],
    sub: '[65]" · 4K Ultra HD · [QE65QN90FAUXRU]',
    chips: ['[NQ4 AI Gen3]', 'до [144] Гц', 'HDR10+ · Dolby Atmos'],
  },

  screen: {
    title: 'Экран Neo QLED с подсветкой Mini LED',
    inches: '[65]',
    diagonal: '[163] см по диагонали',
    stats: [
      { badge: '4K', value: '3840 × 2160', label: 'разрешение 4K Ultra HD' },
      { badge: 'pixels', value: '8,3 млн', count: true, accent: true, label: 'пикселей с квантовыми точками' },
      { icon: 'grid-3x3', value: 'Mini LED', label: 'тысячи мини-светодиодов в подсветке' },
    ],
  },

  contrast: {
    title: 'Глубокий чёрный',
    left: { mode: 'led', tag: 'Обычная LED-подсветка', note: 'крупные зоны: ореолы вокруг ярких объектов' },
    right: { mode: 'miniled', tag: 'Neo QLED · Mini LED', note: 'мелкие зоны затемнения, чистый чёрный' },
    // Число зон затемнения Samsung обычно не публикует — блок stat не используем, подпись идёт во всю ширину
    caption: 'Тысячи мини-светодиодов управляются зонами: тёмные участки гаснут, а яркие светятся в полную силу.',
  },

  cpu: {
    title: 'Процессор [NQ4 AI Gen3]',
    lead: 'Нейросеть улучшает изображение и звук в реальном времени',
    chip: ['[NQ4]', 'AI Processor', '[Gen3]'],
    cards: [
      { icon: 'scan-eye', title: '[4K AI Upscaling Pro]', text: 'Доводит видео низкого разрешения до уровня 4K' },
      { icon: 'sun-medium', title: '[Real Depth Enhancer Pro]', text: 'Добавляет объём объектам на переднем плане' },
      { icon: 'wand-sparkles', title: '[AI Motion Enhancer Pro]', text: 'Делает движение в спорте и играх чётким' },
      { icon: 'audio-lines', title: '[Active Voice Amplifier Pro]', text: 'Делает речь разборчивой на фоне шума' },
    ],
  },

  hdr: {
    kicker: 'Яркость и HDR',
    toc: 'HDR',
    title: 'Свет, цвет и детали',
    cards: [
      { title: 'HDR10+', text: 'динамический HDR для фильмов и сериалов' },
      { title: 'HDR10 · HLG', text: 'HDR-фильмы, сериалы и телетрансляции' },
      { title: '[Pantone Validated]', text: 'точные цвета по стандарту Pantone' },
      { title: '[Anti-Glare]', text: 'матовый экран без бликов от окон и ламп', accent: true },
    ],
  },

  gaming: {
    title: 'Создан для игр',
    hz: '[144]',
    caption: 'Motion Xcelerator до [144] Гц',
    stats: [
      { icon: 'gamepad-2', value: 'Game Bar', label: 'игровая панель: частота, задержка, режимы' },
      { icon: 'hdmi-port', value: '[4] × HDMI 2.1', label: '[4K 144 Гц на всех портах]' },
    ],
    badges: ['[AMD FreeSync Premium Pro]', '[HDR10+ Gaming]', 'ALLM', 'VRR'],
  },

  sound: {
    title: ['Объёмный звук', 'Dolby Atmos'],
    stats: [
      { value: '[40] Вт', label: 'акустика [2.2] канала' },
      { value: '[OTS+]', accent: true, label: 'Object Tracking Sound: звук следует за объектом на экране' },
    ],
    card: { icon: 'speaker', title: 'Q-Symphony', text: 'телевизор и саундбар Samsung звучат вместе' },
    room: { speakers: 7, height: true, label: 'Объёмный звук Dolby Atmos · вид сверху' },
  },

  smart: {
    title: 'Платформа Tizen OS',
    remote: 'buttons',
    stats: [
      { icon: 'layout-grid', title: 'Tizen OS', text: 'приложения и сервисы Samsung' },
      { icon: 'house', title: 'SmartThings', text: 'управление умным домом с экрана телевизора' },
      { icon: 'wifi', title: '[Wi-Fi 5]', text: 'беспроводной интернет' },
      { icon: 'sun', title: '[SolarCell Remote]', text: 'пульт с солнечной батареей' },
    ],
  },

  size: {
    title: 'Размеры и вес',
    mm: { width: '[1443]', height: '[826]', depth: '[26.9]', heightWithStand: '[883]', standWidth: '[1277]', standDepth: '[280]' },
    stats: [
      { value: '[24,1] кг', label: 'без подставки' },
      { value: '[28,4] кг', label: 'с подставкой' },
      { value: '[883] мм', label: 'высота с подставкой' },
      { value: '[400 × 300]', label: 'крепление VESA, мм' },
    ],
  },

  ports: {
    title: 'Всё подключается сразу',
    groups: [
      { type: 'hdmi', count: 4, numbered: true, title: 'HDMI 2.1 × [4]', sub: '[4K 144 Гц · eARC]' },
      { type: 'usb', count: 2, title: 'USB × [2]', sub: 'USB 2.0' },
      { type: 'lan', title: 'LAN', sub: 'Ethernet' },
      { type: 'optical', title: 'Оптический', sub: 'аудиовыход' },
      { type: 'coax', title: 'Антенна', sub: 'эфир и кабель' },
      { type: 'coax', title: 'Спутник', sub: 'DVB-S2' },
    ],
    wireless: [
      { icon: 'wifi', title: '[Wi-Fi 5]', text: 'беспроводной интернет' },
      { icon: 'bluetooth', title: 'Bluetooth [5.2]', text: 'наушники, акустика, геймпады' },
      { icon: 'satellite-dish', title: 'DVB-T2 / C / S2', text: 'эфирное, кабельное и спутниковое ТВ' },
    ],
  },

  outro: {
    kicker: 'Коротко о главном',
    title: 'Samsung Neo QLED [QN90F] · [65]"',
    tiles: [
      { value: '[65]" · Mini LED', label: 'Neo QLED, 3840 × 2160' },
      { value: '[NQ4 AI Gen3]', label: 'процессор с ИИ' },
      { value: 'до [144] Гц', label: '[FreeSync Premium Pro]' },
      { value: '[4] × HDMI 2.1', label: 'VRR · ALLM' },
      { value: 'HDR10+', label: 'HDR10 · HLG' },
      { value: 'Dolby Atmos', label: '[40] Вт · [OTS+] · Q-Symphony' },
      { value: 'Tizen OS', label: 'SmartThings · [Wi-Fi 5]' },
      { value: '[26,9] мм', label: 'толщина · [24,1] кг' },
    ],
    lockup: { title: ['Samsung Neo QLED', '[QN90F]'], model: '[QE65QN90FAUXRU]', tagline: 'Яркость Mini LED и глубокий чёрный.' },
    note: 'Характеристики приведены по открытым источникам и могут быть изменены производителем.',
  },
};
