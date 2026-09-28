// Предпросмотр ролика в браузере: npm run preview → http://localhost:8080
// Пробел — пауза, ← / → — перемотка на 5 секунд, ?t=12.5 — стоп-кадр на нужной секунде.
import { startServer } from './server.mjs';

const port = Number(process.env.PORT || 8080);
await startServer(port);
console.log(`Предпросмотр: http://localhost:${port}/src/index.html`);
