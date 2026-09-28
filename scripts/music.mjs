// Фоновая музыка, синтезированная с нуля (без внешних сэмплов): мягкий пэд, бас, арпеджио,
// лёгкие ударные и «вжухи» на переходах между сценами. Хронометраж — по сценам модели.
//
//   node scripts/music.mjs --product <id> [файл.wav]
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../src/timeline.js';

const SR = 48000;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const TAU = Math.PI * 2;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Пила без алиасинга (PolyBLEP)
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

// Фильтр второго порядка (формулы RBJ)
class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  set(type, f, q) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // полосовой
    const a0 = 1 + al;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// Стереореверберация по схеме Freeverb
function reverb(inL, inR, { room = 0.84, damp = 0.25, wet = 1 } = {}) {
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round(d * k));
  const alls = [556, 441, 341, 225].map((d) => Math.round(d * k));
  const spread = Math.round(23 * k);
  const n = inL.length;
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  for (const [src, out, off] of [
    [inL, outL, 0],
    [inR, outR, spread],
  ]) {
    const cb = combs.map((d) => ({ buf: new Float32Array(d + off), i: 0, store: 0 }));
    const ab = alls.map((d) => ({ buf: new Float32Array(d + off), i: 0 }));
    for (let s = 0; s < n; s++) {
      const x = src[s] * 0.015;
      let acc = 0;
      for (const c of cb) {
        const y = c.buf[c.i];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * room;
        if (++c.i >= c.buf.length) c.i = 0;
        acc += y;
      }
      for (const a of ab) {
        const b = a.buf[a.i];
        const y = -acc + b;
        a.buf[a.i] = acc + b * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        acc = y;
      }
      out[s] = acc * wet;
    }
  }
  return [outL, outR];
}

// Гармония: IV – vi – V – I в до мажоре, по такту на аккорд
const CHORDS = [
  { bass: 41, pad: [53, 57, 60, 64] }, // Fmaj7
  { bass: 45, pad: [52, 55, 60, 64] }, // Am7
  { bass: 43, pad: [50, 55, 59, 64] }, // G6
  { bass: 36, pad: [52, 55, 60, 62] }, // Cadd9
];
const chordAt = (t) => CHORDS[Math.floor(Math.max(0, t) / BAR) % CHORDS.length];

export function synthesize(product) {
  const { scenes: SCENES, duration: DURATION } = buildTimeline(product);
  const N = Math.ceil((DURATION + 0.2) * SR);
  const bus = () => [new Float32Array(N), new Float32Array(N)];
  const pad = bus();
  const bass = bus();
  const arp = bus();
  const drums = bus();
  const fx = bus();
  const R = rng(2026);

  // Опорные моменты: начало первой главы, «игровая» часть (плотнее ритм), финал
  const sceneStart = Object.fromEntries(SCENES.map((s) => [s.id, s.start]));
  const game = SCENES.find((s) => s.id === 'gaming');
  const gameA = game ? game.start : Infinity;
  const gameB = game ? game.end - 0.5 : Infinity;
  const outro = sceneStart.outro;
  const end = DURATION;
  const firstChapter = SCENES[1].start;
  const hatsFrom = (SCENES[2] || SCENES[1]).start;

  // ── Пэд: по три расстроенные пилы на ноту, общий фильтр с медленным «дыханием»
  {
    const voices = [];
    const bars = Math.ceil(end / BAR) + 1;
    for (let b = 0; b < bars; b++) {
      const ch = CHORDS[b % CHORDS.length];
      for (const n of ch.pad) voices.push({ n, t0: b * BAR, t1: (b + 1) * BAR });
    }
    const detune = [-0.07, 0, 0.07];
    for (const v of voices) {
      const a = Math.max(0, Math.floor((v.t0 - 0.05) * SR));
      const z = Math.min(N, Math.floor((v.t1 + 1.6) * SR));
      for (let ch = 0; ch < 2; ch++) {
        const out = pad[ch];
        const ph = detune.map(() => R());
        const inc = detune.map((d, i) => midi(v.n + d + (ch ? 0.03 : -0.03) * (i - 1)) / SR);
        for (let s = a; s < z; s++) {
          const t = s / SR;
          const env = smooth(v.t0 - 0.05, v.t0 + 0.9, t) * (1 - smooth(v.t1 - 0.1, v.t1 + 1.5, t));
          if (env <= 0) continue;
          let x = 0;
          for (let i = 0; i < 3; i++) {
            ph[i] += inc[i];
            if (ph[i] >= 1) ph[i] -= 1;
            x += 2 * ph[i] - 1 - blep(ph[i], inc[i]);
          }
          out[s] += x * env * 0.06;
        }
      }
    }
    // Фильтр: открывается в заставке и в игровой части, закрывается к финалу
    for (let ch = 0; ch < 2; ch++) {
      const f1 = new Biquad();
      const f2 = new Biquad();
      const x = pad[ch];
      for (let s = 0; s < N; s++) {
        if (s % 64 === 0) {
          const t = s / SR;
          const open = 0.35 + 0.65 * smooth(0, 6, t) - 0.25 * smooth(outro + 4, end, t) + 0.25 * (smooth(gameA - 1, gameA + 1, t) - smooth(gameB - 1, gameB + 1, t));
          const cut = 380 + 1500 * open * (0.85 + 0.15 * Math.sin(TAU * t * 0.07 + ch));
          f1.set('lp', cut, 0.6);
          f2.set('lp', cut, 0.6);
        }
        x[s] = f2.run(f1.run(x[s]));
      }
    }
  }

  // ── Бас: синус с лёгкой второй гармоникой, «дышит» по долям (эффект сайдчейна)
  {
    let ph = 0;
    const lp = new Biquad().set('lp', 220, 0.7);
    for (let s = 0; s < N; s++) {
      const t = s / SR;
      const on = smooth(firstChapter - 0.8, firstChapter + 0.2, t) * (1 - smooth(outro - 0.2, outro + 1.2, t) * 0.7);
      if (on <= 0) {
        ph = 0;
        continue;
      }
      const f = midi(chordAt(t).bass);
      ph += f / SR;
      const beatPh = (t % BEAT) / BEAT;
      const pump = 1 - 0.55 * Math.exp(-beatPh * 7);
      const x = Math.sin(TAU * ph) + 0.25 * Math.sin(TAU * ph * 2) + 0.08 * Math.sin(TAU * ph * 3);
      const y = lp.run(x) * pump * on * 0.2;
      bass[0][s] += y;
      bass[1][s] += y;
    }
  }

  // ── Арпеджио: FM-«колокольчик» по звукам аккорда
  {
    // Сетка шестнадцатых; плотность нот зависит от части ролика
    const notes = [];
    const pattern = [0, 2, 1, 3, 2, 4, 3, 5];
    const q = BEAT / 4;
    for (let k = Math.ceil(2.4 / q); k * q < end - 1.5; k++) {
      const t = k * q;
      const inGame = t >= gameA && t < gameB;
      const every = t < firstChapter || t >= outro ? 4 : inGame ? 1 : 2;
      if (k % every) continue;
      const idx = k / every;
      const ch = chordAt(t);
      const pool = [...ch.pad.map((n) => n + 12), ch.pad[1] + 24, ch.pad[2] + 24];
      const n = pool[pattern[idx % pattern.length] % pool.length];
      const vel = (inGame ? 0.8 : 1) * (idx % 4 === 0 ? 1 : 0.75);
      notes.push({ t, n, vel, pan: idx % 2 ? 0.35 : -0.35 });
    }
    for (const nt of notes) {
      const a = Math.floor(nt.t * SR);
      const z = Math.min(N, a + Math.floor(1.4 * SR));
      const f = midi(nt.n);
      const gl = Math.cos(((nt.pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((nt.pan + 1) * Math.PI) / 4);
      for (let s = a; s < z; s++) {
        const t = (s - a) / SR;
        const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.32);
        const idxFm = 1.6 * Math.exp(-t / 0.08);
        const x = Math.sin(TAU * f * t + idxFm * Math.sin(TAU * f * 3.5 * t)) * 0.8 + 0.2 * Math.sin(TAU * f * 2 * t);
        const y = x * env * nt.vel * 0.2;
        arp[0][s] += y * gl;
        arp[1][s] += y * gr;
      }
    }
    // Пинг-понг задержка на 3/16
    const d = Math.round(BEAT * 0.75 * SR);
    const [L, Rr] = arp;
    for (let s = d; s < N; s++) {
      L[s] += Rr[s - d] * 0.32;
      Rr[s] += L[s - d] * 0.32;
    }
  }

  // ── Ударные: бочка, хэт и хлопок (в игровой части — плотнее)
  {
    const kick = (t0, g) => {
      const a = Math.floor(t0 * SR);
      let ph = 0;
      for (let s = a; s < Math.min(N, a + 0.45 * SR); s++) {
        const t = (s - a) / SR;
        const f = 44 + 90 * Math.exp(-t * 32);
        ph += f / SR;
        const y = (Math.sin(TAU * ph) * Math.exp(-t * 6.5) + (t < 0.004 ? (R() - 0.5) * 0.3 : 0)) * g;
        drums[0][s] += y;
        drums[1][s] += y;
      }
    };
    const hat = (t0, g, pan) => {
      const a = Math.floor(t0 * SR);
      const hp = new Biquad().set('hp', 7500, 0.7);
      for (let s = a; s < Math.min(N, a + 0.08 * SR); s++) {
        const t = (s - a) / SR;
        const y = hp.run(R() * 2 - 1) * Math.exp(-t * 70) * g;
        drums[0][s] += y * (1 - pan);
        drums[1][s] += y * (1 + pan);
      }
    };
    const clap = (t0, g) => {
      const a = Math.floor(t0 * SR);
      const bp = new Biquad().set('bp', 1600, 0.9);
      for (let s = a; s < Math.min(N, a + 0.25 * SR); s++) {
        const t = (s - a) / SR;
        const burst = t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 900) : 1;
        const y = bp.run(R() * 2 - 1) * Math.exp(-t * 18) * burst * g;
        drums[0][s] += y;
        drums[1][s] += y;
      }
    };
    const start = firstChapter;
    for (let b = Math.ceil(start / BEAT); b * BEAT < outro - 0.1; b++) {
      const t = b * BEAT;
      const inGame = t >= gameA - 0.01 && t < gameB;
      const beatInBar = b % 4;
      if (inGame || beatInBar === 0 || beatInBar === 2) kick(t, inGame ? 0.5 : 0.42);
      if (inGame && (beatInBar === 1 || beatInBar === 3)) clap(t, 0.16);
      if (t >= hatsFrom) {
        hat(t + BEAT / 2, 0.05, 0.2);
        if (inGame) {
          hat(t + BEAT / 4, 0.03, -0.3);
          hat(t + (3 * BEAT) / 4, 0.03, 0.3);
        }
      }
    }
  }

  // ── Эффекты: нарастающий шум к каждой смене сцены, удар в заставке и финальный аккорд
  {
    const whoosh = (tp, g = 0.1, rise = 0.9) => {
      const a = Math.max(0, Math.floor((tp - rise) * SR));
      const z = Math.min(N, Math.floor((tp + 0.5) * SR));
      const bl = new Biquad();
      const br = new Biquad();
      for (let s = a; s < z; s++) {
        const t = s / SR;
        const k = t < tp ? Math.pow(clamp((t - (tp - rise)) / rise), 2.4) : Math.exp(-(t - tp) * 9);
        if (s === a || s % 32 === 0) {
          const f = t < tp ? 300 * Math.pow(2, 3.6 * clamp((t - (tp - rise)) / rise)) : 3600 * Math.exp(-(t - tp) * 3);
          bl.set('bp', f, 1.4);
          br.set('bp', f * 1.06, 1.4);
        }
        const pan = clamp((t - (tp - rise)) / (rise + 0.5));
        fx[0][s] += bl.run(R() * 2 - 1) * k * g * (1.2 - pan * 0.6);
        fx[1][s] += br.run(R() * 2 - 1) * k * g * (0.6 + pan * 0.6);
      }
    };
    for (const sc of SCENES.slice(1)) whoosh(sc.start + 0.12);
    whoosh(1.2, 0.12, 1.0);

    const boom = (t0, g, f0 = 58) => {
      const a = Math.floor(t0 * SR);
      let ph = 0;
      for (let s = a; s < Math.min(N, a + 2.5 * SR); s++) {
        const t = (s - a) / SR;
        ph += (f0 * (0.6 + 0.4 * Math.exp(-t * 4))) / SR;
        const y = Math.sin(TAU * ph) * Math.exp(-t * 2.2) * Math.min(1, t / 0.01) * g;
        fx[0][s] += y;
        fx[1][s] += y;
      }
    };
    boom(1.2, 0.5);
    boom(sceneStart.outro + 5.45, 0.35, 52);
  }

  // ── Сведение
  const [padRevL, padRevR] = reverb(
    pad[0].map((v, i) => v * 0.6 + arp[0][i] * 1.2 + fx[0][i] * 0.5),
    pad[1].map((v, i) => v * 0.6 + arp[1][i] * 1.2 + fx[1][i] * 0.5),
    { room: 0.86, damp: 0.3 },
  );
  const L = new Float32Array(N);
  const Rt = new Float32Array(N);
  const hpL = new Biquad().set('hp', 28, 0.7);
  const hpR = new Biquad().set('hp', 28, 0.7);
  for (let s = 0; s < N; s++) {
    const t = s / SR;
    const master = smooth(0, 1.2, t) * (1 - smooth(end - 2.4, end, t));
    L[s] = hpL.run(pad[0][s] + bass[0][s] + arp[0][s] + drums[0][s] + fx[0][s] + padRevL[s] * 0.35) * master;
    Rt[s] = hpR.run(pad[1][s] + bass[1][s] + arp[1][s] + drums[1][s] + fx[1][s] + padRevR[s] * 0.35) * master;
  }

  // Громкость: RMS ≈ −18 dBFS, пики мягко ограничиваются около −1 dBFS
  let sum = 0;
  for (let s = 0; s < N; s++) sum += L[s] * L[s] + Rt[s] * Rt[s];
  const rms = Math.sqrt(sum / (2 * N));
  const gain = Math.pow(10, -18 / 20) / rms;
  const ceil = Math.pow(10, -1 / 20);
  let peak = 0;
  for (const ch of [L, Rt]) {
    for (let s = 0; s < N; s++) {
      const x = ch[s] * gain;
      ch[s] = Math.tanh(x / ceil) * ceil;
      peak = Math.max(peak, Math.abs(ch[s]));
    }
  }
  return { L, R: Rt, rmsDb: -18, peakDb: 20 * Math.log10(peak) };
}

function wav16(L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  const D = rng(7);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const x = (c ? R : L)[i];
      const dither = (D() - D()) / 32768; // треугольный дизер
      const v = Math.max(-32768, Math.min(32767, Math.round((x + dither) * 32767)));
      buf.writeInt16LE(v, 44 + i * 4 + c * 2);
    }
  }
  return buf;
}

export async function renderMusic(file, product) {
  const t0 = Date.now();
  const { L, R, peakDb } = synthesize(product);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, wav16(L, R));
  const sec = (L.length / SR).toFixed(1);
  console.log(`Музыка: ${file} (${sec} с, пик ${peakDb.toFixed(1)} dBFS, ${((Date.now() - t0) / 1000).toFixed(1)} с)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadProduct, positional } = await import('./product.mjs');
  const { id, product } = await loadProduct();
  await renderMusic(positional()[0] || `build/${id}/music.wav`, product);
}
