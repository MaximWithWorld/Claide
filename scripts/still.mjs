// Сохраняет отдельные кадры в PNG: node scripts/still.mjs 4.5 20 33.2 [--out папка]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { WIDTH, HEIGHT } from '../src/timeline.js';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? args[outIdx + 1] : join(ROOT, 'build', 'stills');
const times = args.filter((a, i) => i !== outIdx && i !== outIdx + 1).map(Number);
if (!times.length) {
  console.error('Укажите время кадров в секундах, например: node scripts/still.mjs 4.5 20');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const { server, port } = await startServer(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page]', e.message));
await page.goto(`http://127.0.0.1:${port}/src/index.html?render=1`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await page.evaluate(() => window.__error);
if (err) throw new Error(err);

for (const t of times) {
  await page.evaluate((tt) => window.seek(tt), t);
  const file = join(outDir, `frame_${t.toFixed(2).padStart(6, '0')}.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
await browser.close();
server.close();
