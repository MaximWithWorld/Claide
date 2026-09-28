// Рендер ролика: Chromium (Playwright) отрисовывает каждый кадр страницы src/index.html,
// кадры параллельно кодируются в H.264 кусками, затем склеиваются и сводятся с музыкой.
//
//   npm run render                 — полный рендер в output/
//   node scripts/render.mjs --from 20 --to 30   — только отрезок (для проверки)
//   WORKERS=2 npm run render       — число параллельных вкладок браузера
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { join } from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { startServer, ROOT } from './server.mjs';
import { renderMusic } from './music.mjs';
import { DURATION, FPS, WIDTH, HEIGHT } from '../src/timeline.js';

const FFMPEG = process.env.FFMPEG || ffmpegInstaller.path;
const BUILD = join(ROOT, 'build');
const OUT = join(ROOT, 'output');
const NAME = 'LG_OLED55C6RLA_infographic';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const from = arg('from', 0);
const to = Math.min(arg('to', DURATION), DURATION);
const partial = from > 0 || to < DURATION;
const workers = Number(process.env.WORKERS || Math.max(1, Math.min(4, cpus().length)));

const firstFrame = Math.round(from * FPS);
const lastFrame = Math.round(to * FPS); // не включительно
const total = lastFrame - firstFrame;

function run(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'],
    });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg завершился с кодом ${code}`))));
    if (input) input(p.stdin);
  });
}

/** Открывает страницу в режиме рендера и ждёт загрузки шрифтов и иконок. */
async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[страница]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render=1`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(err);
  return page;
}

/** Рендерит кадры [a, b) в отдельный видеофайл. */
async function renderChunk(browser, port, a, b, file, progress) {
  const page = await openPage(browser, port);
  const cdp = await page.context().newCDPSession(page);
  await run(
    [
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
      '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-x264-params', 'aq-mode=3',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      file,
    ],
    {
      input: async (stdin) => {
        try {
          for (let f = a; f < b; f++) {
            await page.evaluate((t) => window.seek(t), f / FPS);
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
            const buf = Buffer.from(data, 'base64');
            if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
            progress();
          }
        } finally {
          stdin.end();
        }
      },
    },
  );
  await page.close();
}

async function main() {
  await rm(join(BUILD, 'chunks'), { recursive: true, force: true });
  await mkdir(join(BUILD, 'chunks'), { recursive: true });
  await mkdir(OUT, { recursive: true });

  console.log(`Кадров: ${total} (${from}–${to} с, ${FPS} к/с), потоков: ${workers}`);
  const { server, port } = await startServer(0);
  const browser = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none'] });

  const started = Date.now();
  let done = 0;
  const progress = () => {
    done++;
    if (done % 30 === 0 || done === total) {
      const sec = (Date.now() - started) / 1000;
      const eta = (sec / done) * (total - done);
      process.stdout.write(`\r  ${done}/${total} кадров · ${sec.toFixed(0)} с · осталось ~${eta.toFixed(0)} с   `);
    }
  };

  // Делим кадры на непрерывные куски — каждый кодируется своим ffmpeg
  const size = Math.ceil(total / workers);
  const chunks = [];
  for (let i = 0; i < workers; i++) {
    const a = firstFrame + i * size;
    const b = Math.min(lastFrame, a + size);
    if (a < b) chunks.push({ a, b, file: join(BUILD, 'chunks', `part_${String(i).padStart(2, '0')}.mp4`) });
  }
  await Promise.all(chunks.map((c) => renderChunk(browser, port, c.a, c.b, c.file, progress)));
  process.stdout.write('\n');

  // Обложка — кадр заставки без сжатия
  if (!partial) {
    const page = await openPage(browser, port);
    await page.evaluate((t) => window.seek(t), 5.8);
    await page.screenshot({ path: join(OUT, `${NAME}_cover.png`) });
    await page.close();
  }
  await browser.close();
  server.close();

  // Склейка кусков без перекодирования
  const list = join(BUILD, 'chunks', 'list.txt');
  await writeFile(list, chunks.map((c) => `file '${c.file}'`).join('\n'));
  const silent = join(BUILD, 'video_silent.mp4');
  await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  // Музыка по хронометражу сцен и сведение
  const wav = join(BUILD, 'music.wav');
  await renderMusic(wav);
  // Пробные отрезки кладём в build/, чтобы не смешивать с итоговым роликом
  const final = partial ? join(BUILD, `${NAME}_${from}-${to}s.mp4`) : join(OUT, `${NAME}.mp4`);
  await run([
    '-i', silent,
    '-ss', String(from), '-t', String(to - from), '-i', wav,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest',
    final,
  ]);
  console.log(`Готово за ${((Date.now() - started) / 1000).toFixed(0)} с: ${final}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
