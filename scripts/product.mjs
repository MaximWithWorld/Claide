// Выбор модели для скриптов: --product <id> или переменная PRODUCT; если модель одна — берётся она.
import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './server.mjs';

export const PRODUCTS = join(ROOT, 'products');

const exists = (f) => access(f).then(() => true, () => false);

export async function listProducts() {
  return (await readdir(PRODUCTS)).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort();
}

export async function loadProduct(argv = process.argv) {
  const i = argv.indexOf('--product');
  let id = i >= 0 ? argv[i + 1] : process.env.PRODUCT;
  const all = await listProducts();
  if (!id) {
    if (all.length !== 1) throw new Error(`Укажите модель: --product <id>. Есть: ${all.join(', ')}`);
    id = all[0];
  }
  // Файлы с «_» в начале (шаблоны) не попадают в список, но их можно указать явно
  if (!all.includes(id) && !(await exists(join(PRODUCTS, `${id}.js`)))) {
    throw new Error(`Нет файла products/${id}.js. Есть: ${all.join(', ')}`);
  }
  const mod = await import(`${pathToFileURL(join(PRODUCTS, `${id}.js`)).href}?v=${Date.now()}`);
  return { id, product: mod.default };
}

/** Аргументы командной строки без пар «--ключ значение» и флагов из flags. */
export function positional(argv = process.argv.slice(2), flags = []) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      if (!flags.includes(argv[i])) i++;
      continue;
    }
    out.push(argv[i]);
  }
  return out;
}

/** Значение «--ключ значение» или def. */
export function option(name, def, argv = process.argv) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
}
