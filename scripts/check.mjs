// Проверка модели перед рендером — без просмотра видео:
//  1) данные: обязательные поля, допустимые значения;
//  2) вёрстка: в каждой сцене в момент, когда она полностью собрана, ищет надписи,
//     которые накладываются друг на друга, вылезают из карточек или за безопасную зону кадра;
//  3) листы превью: build/<id>/sheet_1.png … — по 4 сцены на листе (--no-sheets, чтобы пропустить).
//
//   npm run check -- --product <id>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { startServer, ROOT } from './server.mjs';
import { loadProduct } from './product.mjs';
import { validateProduct, placeholders } from '../src/validate.js';
import { WIDTH, HEIGHT } from '../src/timeline.js';

const { id, product } = await loadProduct();
const sheets = !process.argv.includes('--no-sheets');

const errors = validateProduct(product);
const todo = placeholders(product);
const template = id.startsWith('_template');
if (errors.length || (todo.length && !template)) {
  console.log(`✗ products/${id}.js — ошибки в данных:`);
  errors.forEach((e) => console.log(`  • ${e}`));
  todo.forEach((e) => console.log(`  • не заполнено — ${e}`));
  process.exit(1);
}
if (todo.length) console.log(`Шаблон: ${todo.length} незаполненных мест — в файле модели их нужно заменить.`);

const { server, port } = await startServer(0);
const browser = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('pageerror', (e) => console.error('[страница]', e.message));
await page.goto(`http://127.0.0.1:${port}/src/index.html?render=1&product=${id}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await page.evaluate(() => window.__error);
if (err) {
  console.log(`✗ Страница не собралась:\n${err}`);
  await browser.close();
  server.close();
  process.exit(1);
}

const results = await page.evaluate(() => window.checkAll());
let problems = 0;
console.log(`Проверка вёрстки: ${id}`);
for (const r of results) {
  const mark = r.issues.length ? '✗' : '✓';
  console.log(`  ${mark} ${r.id.padEnd(9)} ${r.T.toFixed(1).padStart(5)} с${r.issues.length ? '' : '  — ок'}`);
  r.issues.forEach((i) => console.log(`      • ${i}`));
  problems += r.issues.length;
}

if (sheets) {
  const dir = join(ROOT, 'build', id, 'check');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const shots = [];
  for (const [i, r] of results.entries()) {
    await page.evaluate((t) => window.seek(t), r.T);
    const file = join(dir, `${String(i).padStart(2, '0')}_${r.id}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
  }
  const ff = (args) =>
    new Promise((res, rej) => {
      const p = spawn(process.env.FFMPEG || ffmpegInstaller.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: код ${c}`))));
    });
  const out = [];
  for (let s = 0; s * 4 < shots.length; s++) {
    const group = shots.slice(s * 4, s * 4 + 4);
    const inputs = [];
    group.forEach((f) => inputs.push('-i', f));
    for (let k = group.length; k < 4; k++) inputs.push('-f', 'lavfi', '-i', `color=black:s=${WIDTH}x${HEIGHT}`);
    const file = join(ROOT, 'build', id, `sheet_${s + 1}.png`);
    await ff([
      ...inputs,
      '-filter_complex',
      '[0]scale=960:540[a];[1]scale=960:540[b];[2]scale=960:540[c];[3]scale=960:540[d];[a][b]hstack[t];[c][d]hstack[u];[t][u]vstack',
      '-frames:v', '1',
      file,
    ]);
    out.push(file);
  }
  console.log(`Листы превью (по 4 сцены, слева направо и сверху вниз):\n${out.map((f) => `  ${f}`).join('\n')}`);
}

await browser.close();
server.close();
console.log(problems ? `Найдено проблем: ${problems}` : 'Проблем с вёрсткой не найдено');
process.exit(problems ? 1 : 0);
