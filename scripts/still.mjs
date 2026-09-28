// Сохраняет отдельные кадры в PNG: node scripts/still.mjs --product <id> 4.5 20 33.2 [--out папка]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { loadProduct, positional, option } from './product.mjs';
import { WIDTH, HEIGHT } from '../src/timeline.js';

const { id } = await loadProduct();
const outDir = option('out', join(ROOT, 'build', id, 'stills'));
const times = positional().map(Number);
if (!times.length || times.some(Number.isNaN)) {
  console.error('Укажите время кадров в секундах, например: node scripts/still.mjs --product lg-oled55c6rla 4.5 20');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const { server, port } = await startServer(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('pageerror', (e) => console.error('[страница]', e.message));
await page.goto(`http://127.0.0.1:${port}/src/index.html?render=1&product=${id}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await page.evaluate(() => window.__error);
if (err) {
  console.error(err);
  process.exit(1);
}
for (const t of times) {
  await page.evaluate((tt) => window.seek(tt), t);
  const file = join(outDir, `frame_${t.toFixed(2).padStart(6, '0')}.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
await browser.close();
server.close();
