// ШАБЛОН для телевизоров Sony BRAVIA. Как пользоваться:
//   1) скопируйте файл в products/<id>.js, например products/sony-k-65xr70.js;
//   2) замените всё, что в [квадратных скобках], — и тексты, и числа — на данные конкретной модели
//      (скобки убрать); неподтверждённое лучше удалить, чем оставить;
//   3) npm run check -- --product <id>  →  npm run render -- --product <id>.
// Подсказки по линейкам Sony (проверяйте по конкретной модели):
//   • BRAVIA 9 и BRAVIA 7 — подсветка Mini LED: panel 'miniled', в «Контрасте» справа mode 'miniled'.
//   • BRAVIA 8 / 8 II — OLED: panel 'oled' (8 II — 'qd-oled'), справа mode 'oled';
//     звук у OLED — Acoustic Surface Audio+ (экран сам звучит), третью строку «Экрана» замените
//     на самосветящиеся пиксели, как в файле LG.
//   • BRAVIA 3 и 2 — обычная LED-подсветка: panel 'led', сцену 'contrast' лучше убрать.
//   • Sony: Google TV, Dolby Vision, обычно 120 Гц и только часть HDMI-портов — 2.1.
//   • Сервисы, которые не работают в России, в ролик не включайте.
// Источники характеристик — перечислите ссылками в комментарии в начале файла модели.

export default {
  file: '[Sony_K-65XR70]_infographic',
  theme: 'sony',
  panel: 'miniled',
  stand: 'feet', // у BRAVIA обычно ножки; если подставка по центру — 'center'

  hud: { brand: 'Sony BRAVIA [7]', model: '[K-65XR70]' },

  scenes: ['intro', 'screen', 'contrast', 'cpu', 'hdr', 'gaming', 'sound', 'smart', 'size', 'ports', 'outro'],

  intro: {
    pill: 'Модель [2024] года',
    title: ['Sony BRAVIA', '[7]'],
    sub: '[65]" · 4K Ultra HD · [K-65XR70]',
    chips: ['[XR Processor]', 'Google TV', 'Dolby Vision · Atmos'],
  },

  screen: {
    title: 'Экран 4K с подсветкой Mini LED',
    inches: '[65]',
    diagonal: '[164] см по диагонали',
    stats: [
      { badge: '4K', value: '3840 × 2160', label: 'разрешение 4K Ultra HD' },
      { badge: 'pixels', value: '8,3 млн', count: true, accent: true, label: 'пикселей в каждом кадре' },
      { icon: 'palette', value: '[XR Triluminos Pro]', label: 'широкий цветовой охват' },
    ],
  },

  contrast: {
    title: 'Глубокий чёрный',
    left: { mode: 'led', tag: 'Обычная LED-подсветка', note: 'крупные зоны: ореолы вокруг ярких объектов' },
    right: { mode: 'miniled', tag: 'BRAVIA · Mini LED', note: 'мелкие зоны затемнения, чистый чёрный' },
    caption: '[XR Backlight Master Drive] точно управляет тысячами мини-светодиодов: чёрный глубже, светлые детали ярче.',
  },

  cpu: {
    title: 'Процессор [XR]',
    lead: 'Анализирует кадр так, как его воспринимает человек',
    chip: ['[XR]', 'Processor'],
    cards: [
      { icon: 'scan-eye', title: '[XR 4K Upscaling]', text: 'Повышает чёткость видео до уровня 4K' },
      { icon: 'sun-medium', title: '[XR Contrast Booster]', text: 'Добавляет яркости светлым участкам кадра' },
      { icon: 'palette', title: '[XR Triluminos Pro]', text: 'Насыщенные и естественные цвета' },
      { icon: 'audio-lines', title: '[Voice Zoom 3]', text: 'Выделяет голоса в фильмах и новостях' },
    ],
  },

  hdr: {
    kicker: 'Яркость и HDR',
    toc: 'HDR',
    title: 'Свет, цвет и детали',
    cards: [
      { title: 'Dolby Vision', text: 'динамический HDR: настройка каждой сцены' },
      { title: 'HDR10 · HLG', text: 'HDR-фильмы, сериалы и телетрансляции' },
      { title: '[IMAX Enhanced]', text: 'кино в формате IMAX дома' },
      { title: '[Studio Calibrated Mode]', text: 'картинка, как на студийном мониторе', accent: true },
    ],
  },

  gaming: {
    title: 'Идеален для PlayStation 5',
    hz: '[120]',
    caption: 'частота обновления до [120] Гц',
    stats: [
      { icon: 'gamepad-2', value: 'Perfect for PlayStation 5', label: 'Auto HDR Tone Mapping и Auto Genre Picture Mode' },
      { icon: 'hdmi-port', value: '[2] × HDMI 2.1', label: '[4K 120 Гц · VRR · ALLM]' },
    ],
    badges: ['[VRR]', '[ALLM]', '[4K 120 Гц]'],
  },

  sound: {
    title: ['Объёмный звук', 'Dolby Atmos'],
    stats: [
      { value: '[30] Вт', label: 'акустика [2.1] канала' },
      { value: '[Acoustic Multi-Audio+]', accent: true, label: 'звук идёт из той точки, где объект на экране' },
    ],
    card: { icon: 'speaker', title: '[BRAVIA Theatre Sync]', text: 'телевизор и саундбар Sony звучат вместе' },
    room: { speakers: 5, height: false, label: '3D Surround Upscaling · вид сверху' },
  },

  smart: {
    title: 'Платформа Google TV',
    remote: 'buttons',
    stats: [
      { icon: 'layout-grid', title: 'Google TV', text: 'приложения и рекомендации в одном месте' },
      { icon: 'cast', title: '[Chromecast built-in]', text: 'видео с телефона на экран в одно касание' },
      { icon: 'wifi', title: '[Wi-Fi 5]', text: 'беспроводной интернет' },
      { icon: 'bluetooth', title: 'Bluetooth [5.0]', text: 'наушники, акустика и геймпады' },
    ],
  },

  size: {
    title: 'Размеры и вес',
    mm: { width: '[1446]', height: '[834]', depth: '[60]', heightWithStand: '[900]', standWidth: '[1300]', standDepth: '[330]' },
    stats: [
      { value: '[23,6] кг', label: 'без подставки' },
      { value: '[24,1] кг', label: 'с подставкой' },
      { value: '[900] мм', label: 'высота с подставкой' },
      { value: '[300 × 300]', label: 'крепление VESA, мм' },
    ],
  },

  ports: {
    title: 'Всё подключается сразу',
    groups: [
      { type: 'hdmi', count: 4, numbered: true, title: 'HDMI × [4]', sub: '[2 × HDMI 2.1 · eARC]' },
      { type: 'usb', count: 2, title: 'USB × [2]', sub: 'USB 2.0' },
      { type: 'lan', title: 'LAN', sub: 'Ethernet' },
      { type: 'optical', title: 'Оптический', sub: 'аудиовыход' },
      { type: 'jack', title: 'Наушники', sub: '[mini-jack 3,5 мм]' },
      { type: 'coax', title: 'Антенна', sub: 'эфир и кабель' },
      { type: 'coax', title: 'Спутник', sub: 'DVB-S2' },
    ],
    wireless: [
      { icon: 'wifi', title: '[Wi-Fi 5]', text: 'беспроводной интернет' },
      { icon: 'bluetooth', title: 'Bluetooth [5.0]', text: 'наушники, акустика, геймпады' },
      { icon: 'satellite-dish', title: 'DVB-T2 / C / S2', text: 'эфирное, кабельное и спутниковое ТВ' },
    ],
  },

  outro: {
    kicker: 'Коротко о главном',
    title: 'Sony BRAVIA [7] · [65]"',
    tiles: [
      { value: '[65]" · Mini LED', label: '4K Ultra HD, 3840 × 2160' },
      { value: '[XR Processor]', label: 'обработка как у человеческого зрения' },
      { value: 'до [120] Гц', label: 'Perfect for PlayStation 5' },
      { value: '[2] × HDMI 2.1', label: '[VRR · ALLM]' },
      { value: 'Dolby Vision', label: 'HDR10 · HLG · [IMAX Enhanced]' },
      { value: 'Dolby Atmos', label: '[30] Вт · [Acoustic Multi-Audio+]' },
      { value: 'Google TV', label: '[Chromecast built-in] · [Wi-Fi 5]' },
      { value: '[60] мм', label: 'толщина · [23,6] кг' },
    ],
    lockup: { title: ['Sony BRAVIA', '[7]'], model: '[K-65XR70]', tagline: 'Кино, как задумал режиссёр.' },
    note: 'Характеристики приведены по открытым источникам и могут быть изменены производителем.',
  },
};
