// Предпросмотр в браузере: npm run preview → ссылки на все модели из папки products.
// Пробел — пауза, ← / → — перемотка на 5 секунд, &t=12.5 в адресе — стоп-кадр на нужной секунде.
import { readdir } from 'node:fs/promises';
import { startServer } from './server.mjs';
import { listProducts, PRODUCTS } from './product.mjs';

const port = Number(process.env.PORT || 8080);
await startServer(port);
const templates = (await readdir(PRODUCTS)).filter((f) => f.startsWith('_template')).map((f) => f.slice(0, -3));
console.log('Предпросмотр:');
for (const id of [...(await listProducts()), ...templates]) console.log(`  http://localhost:${port}/src/index.html?product=${id}`);
