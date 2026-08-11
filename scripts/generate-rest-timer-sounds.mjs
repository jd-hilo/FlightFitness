/**
 * Generates rest-timer preview sounds (run: node scripts/generate-rest-timer-sounds.mjs)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../assets/sounds/rest-timer');
fs.mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 44100;

function writeWav(filename, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  const full = path.join(outDir, filename);
  fs.writeFileSync(full, buffer);
  console.log('wrote', full);
}

function render(durationSec, fn) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(i / SAMPLE_RATE, i / n);
  }
  return out;
}

function mixPartials(t, partials) {
  let s = 0;
  for (const p of partials) {
    const env = Math.exp(-t * p.decay) * (p.attack ? Math.min(1, t * p.attack) : 1);
    s += Math.sin(2 * Math.PI * p.freq * t) * p.amp * env;
  }
  return s;
}

const sounds = {
  /** Delicate single strike — airy high bell */
  'bell-light.wav': () =>
    render(0.9, (t) =>
      mixPartials(t, [
        { freq: 1046, amp: 0.42, decay: 5.2, attack: 80 },
        { freq: 1568, amp: 0.22, decay: 7.5, attack: 90 },
        { freq: 2093, amp: 0.1, decay: 10, attack: 100 },
      ]) * 0.95
    ),

  /** Warm temple bell — mid tone, longer tail */
  'bell-soft.wav': () =>
    render(1.1, (t) =>
      mixPartials(t, [
        { freq: 622, amp: 0.5, decay: 3.8, attack: 40 },
        { freq: 932, amp: 0.28, decay: 5.5, attack: 50 },
        { freq: 1244, amp: 0.14, decay: 8, attack: 60 },
        { freq: 1866, amp: 0.06, decay: 12, attack: 70 },
      ]) * 0.9
    ),

  /** Bright glass chime — short and clean */
  'chime-bright.wav': () =>
    render(0.65, (t) => {
      const strike = t < 0.02 ? Math.sin(2 * Math.PI * 2200 * t) * 0.08 : 0;
      return (
        (mixPartials(t, [
          { freq: 1318, amp: 0.45, decay: 8, attack: 120 },
          { freq: 1975, amp: 0.3, decay: 11, attack: 130 },
        ]) +
          strike) *
        0.92
      );
    }),

  /** Gentle two-note notification bell */
  'bell-duo.wav': () =>
    render(1.0, (t) => {
      const noteA =
        t < 0.45
          ? mixPartials(t, [
              { freq: 880, amp: 0.38, decay: 6, attack: 60 },
              { freq: 1320, amp: 0.18, decay: 9, attack: 70 },
            ])
          : 0;
      const t2 = Math.max(0, t - 0.38);
      const noteB =
        t >= 0.38
          ? mixPartials(t2, [
              { freq: 1174, amp: 0.4, decay: 5.5, attack: 70 },
              { freq: 1760, amp: 0.2, decay: 8, attack: 80 },
            ])
          : 0;
      return (noteA + noteB) * 0.88;
    }),
};

for (const [file, gen] of Object.entries(sounds)) {
  writeWav(file, gen());
}
