// LG OLED55C6RLA — OLED evo AI C6, 55", 2026.
// Файл модели для шаблона: все тексты и цифры ролика. Тексты пишутся ровно так, как они появятся на экране.
// Проверка вёрстки: npm run check -- --product lg-oled55c6rla   ·   Рендер: npm run render -- --product lg-oled55c6rla
//
// Источники характеристик: README.md, раздел «Характеристики и источники».

export default {
  file: 'LG_OLED55C6RLA_infographic', // имя MP4 и обложки в output/<id>/
  theme: 'lg', // палитра: lg | samsung | sony | neutral
  panel: 'oled', // oled | qd-oled | miniled | led — рисунок пикселей и профиль корпуса
  stand: 'center', // center — подставка по центру; feet — две ножки по краям

  // Надписи в верхних углах кадра
  hud: { brand: 'LG OLED evo AI C6', model: 'OLED55C6RLA' },

  // Порядок сцен: первая всегда intro, последняя — outro. Ненужные можно убрать.
  // Длительность сцены можно поменять: durations: { gaming: 8 }
  scenes: ['intro', 'screen', 'contrast', 'cpu', 'hdr', 'gaming', 'sound', 'smart', 'size', 'ports', 'outro'],

  intro: {
    pill: 'Модель 2026 года',
    title: ['LG OLED evo', 'AI C6'], // вторая строка — цветным градиентом
    sub: '55" · 4K Ultra HD · OLED55C6RLA',
    chips: ['α11 AI Gen3', 'до 165 Гц', 'Dolby Vision · Atmos'],
  },

  screen: {
    title: 'Большой экран 4K Ultra HD',
    inches: 55,
    diagonal: '139 см по диагонали',
    // badge: '4K' — надпись в плашке, 'pixels' — анимированные пиксели; icon — иконка Lucide
    // count: true — число в value «набегает» от нуля; accent: true — значение градиентом
    stats: [
      { badge: '4K', value: '3840 × 2160', label: 'разрешение 4K Ultra HD' },
      { badge: 'pixels', value: '8,3 млн', count: true, accent: true, label: 'самосветящихся пикселей' },
      { icon: 'lightbulb-off', value: '0 ламп', label: 'подсветки: каждый пиксель светится сам' },
    ],
  },

  contrast: {
    title: 'Идеальный чёрный',
    // mode: led — обычная подсветка, miniled — Mini LED с мелкими зонами, oled — попиксельно
    left: { mode: 'led', tag: 'Обычный LED-экран', note: 'серый «чёрный» и ореолы вокруг ярких объектов' },
    right: { mode: 'oled', tag: 'OLED evo', note: 'глубокий чёрный и точные детали' },
    // infinity: true рисует знак ∞ перед value; без stat подпись займёт всю ширину
    stat: { infinity: true, value: ': 1', label: 'контрастность' },
    caption: 'Каждый пиксель включается и гаснет отдельно — чёрный остаётся чёрным даже в тёмной комнате, без засветов по краям экрана.',
  },

  cpu: {
    title: 'α11 AI Processor Gen3',
    lead: 'Искусственный интеллект улучшает каждый кадр и звук',
    chip: ['α11', 'AI Processor', 'Gen3'], // крупная надпись на кристалле, затем 1–2 строки мелко
    cards: [
      { icon: 'scan-eye', title: 'AI Super Upscaling 4K', text: 'Повышает чёткость любого видео до уровня 4K' },
      { icon: 'sun-medium', title: 'Dynamic Tone Mapping', text: 'Подстраивает HDR под каждую сцену' },
      { icon: 'wand-sparkles', title: 'AI Picture Pro', text: 'Анализирует кадр, улучшает детали и цвет' },
      { icon: 'audio-lines', title: 'AI Sound Pro', text: 'Делает диалоги чётче, а звук — объёмнее' },
    ],
  },

  hdr: {
    kicker: 'Яркость и HDR',
    toc: 'HDR',
    title: 'Свет, цвет и детали',
    cards: [
      { title: 'Dolby Vision', text: 'динамический HDR: настройка каждой сцены' },
      { title: 'HDR10 · HLG', text: 'HDR-фильмы, сериалы и телетрансляции' },
      { title: 'Filmmaker Mode', text: 'кино таким, каким его задумал режиссёр' },
      { title: 'Brightness Booster', text: 'технология повышения яркости OLED evo', accent: true },
    ],
  },

  gaming: {
    title: 'Создан для игр',
    hz: 165, // максимум шкалы и счётчика
    caption: 'частота обновления до 165 Гц',
    // count: { from: 9.9 } — число «отсчитывается» от 9,9 к значению
    stats: [
      { icon: 'timer', value: '0,1 мс', count: { from: 9.9 }, label: 'время отклика' },
      { icon: 'hdmi-port', value: '4 × HDMI 2.1', label: '48 Гбит/с на каждом порту' },
    ],
    badges: ['NVIDIA G-SYNC Compatible', 'AMD FreeSync Premium', 'VRR', 'ALLM'],
  },

  sound: {
    title: ['Объёмный звук', 'Dolby Atmos'], // вторая строка — градиентом
    stats: [
      { value: '40 Вт', label: 'акустика 2.2 канала' },
      { value: '11.1.2', accent: true, label: 'виртуальный объёмный звук AI Sound Pro' },
    ],
    card: { icon: 'speaker', title: 'WOW Orchestra', text: 'телевизор и саундбар LG звучат вместе' },
    // Схема комнаты: число виртуальных колонок вокруг зрителя, верхние каналы, подпись
    room: { speakers: 11, height: true, label: 'Виртуальные каналы 11.1.2 · вид сверху' },
  },

  smart: {
    title: 'Платформа webOS 26',
    remote: 'pointer', // pointer — пульт-указка с курсором; buttons — обычный пульт, фокус прыгает по плиткам
    stats: [
      { icon: 'layout-grid', title: 'webOS 26', text: 'современная платформа Smart TV' },
      { icon: 'wifi', title: 'Wi-Fi 6', text: 'быстрый беспроводной интернет' },
      { icon: 'bluetooth', title: 'Bluetooth 5.3', text: 'наушники, акустика и геймпады' },
      { icon: 'mouse-pointer-2', title: 'Magic Remote', text: 'пульт-указка: курсор как у мыши' },
    ],
  },

  size: {
    title: 'Размеры и вес',
    // Миллиметры для чертежа: корпус без подставки, высота с подставкой, подставка (ширина × глубина)
    mm: { width: 1222, height: 703, depth: 45.1, heightWithStand: 757, standWidth: 470, standDepth: 230 },
    stats: [
      { value: '14,1 кг', label: 'без подставки' },
      { value: '15,9 кг', label: 'с подставкой' },
      { value: '757 мм', label: 'высота с подставкой' },
      { value: '300 × 200', label: 'крепление VESA, мм' },
    ],
  },

  ports: {
    title: 'Всё подключается сразу',
    // type: hdmi | usb | lan | optical | coax | jack; count — сколько разъёмов нарисовать
    groups: [
      { type: 'hdmi', count: 4, numbered: true, title: 'HDMI 2.1 × 4', sub: '4K 165 Гц · eARC' },
      { type: 'usb', count: 2, title: 'USB × 2', sub: 'USB 2.0' },
      { type: 'lan', title: 'LAN', sub: 'Ethernet' },
      { type: 'optical', title: 'Оптический', sub: 'аудиовыход' },
      { type: 'coax', title: 'Антенна', sub: 'эфир и кабель' },
      { type: 'coax', title: 'Спутник', sub: 'DVB-S2' },
    ],
    wireless: [
      { icon: 'wifi', title: 'Wi-Fi 6', text: 'быстрый беспроводной интернет' },
      { icon: 'bluetooth', title: 'Bluetooth 5.3', text: 'наушники, акустика, геймпады' },
      { icon: 'satellite-dish', title: 'DVB-T2 / C / S2', text: 'эфирное, кабельное и спутниковое ТВ' },
    ],
  },

  outro: {
    kicker: 'Коротко о главном',
    title: 'LG OLED evo AI C6 · 55"',
    tiles: [
      { value: '55" · 4K', label: 'OLED evo, 3840 × 2160' },
      { value: 'α11 AI Gen3', label: 'процессор с ИИ' },
      { value: 'до 165 Гц', label: 'отклик 0,1 мс' },
      { value: '4 × HDMI 2.1', label: 'VRR · G-SYNC · FreeSync' },
      { value: 'Dolby Vision', label: 'HDR10 · HLG · Filmmaker Mode' },
      { value: 'Dolby Atmos', label: '40 Вт · 2.2 · вирт. 11.1.2' },
      { value: 'webOS 26', label: 'Wi-Fi 6 · Bluetooth 5.3' },
      { value: '45,1 мм', label: 'толщина · 14,1 кг' },
    ],
    lockup: { title: ['LG OLED evo', 'AI C6'], model: 'OLED55C6RLA', tagline: 'Идеальный чёрный. Бесконечный контраст.' },
    note: 'Характеристики приведены по открытым источникам и могут быть изменены производителем.',
  },
};
