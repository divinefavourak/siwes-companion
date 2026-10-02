// Synthesizes the film's sound-design track, cued from the same SCENES timings the
// visuals use (parsed out of siwes-film.html), so re-timing a beat moves its sounds.
//   node sfx.mjs            → sfx.wav (48kHz stereo, film length)
// Everything is generated here — no samples, nothing to license. Deterministic (seeded).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'siwes-film.html'), 'utf8');
const S = {};
let TOTAL = 0;
for (const m of html.matchAll(/\{\s*id:'(\w+)',\s*act:\d,\s*dur:([\d.]+)/g)) {
  S[m[1]] = { start: TOTAL, dur: +m[2] };
  TOTAL += +m[2];
}
if (!S.opener || !S.end) throw new Error('could not read SCENES from siwes-film.html');
const at = (id, lt) => S[id].start + lt;

// ───────── engine ─────────
const SR = 48000, N = Math.round(TOTAL * SR);
const L = new Float32Array(N), R = new Float32Array(N), RV = new Float32Array(N);
let seed = 0x5eed;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const noise = () => rnd() * 2 - 1;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);

function voice(t0, dur, fn, { pan = 0, gain = 1, send = 0.25 } = {}) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
  const gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i < 0 || i >= N) continue;
    const v = fn(k / SR);
    L[i] += v * gl; R[i] += v * gr; RV[i] += v * gain * send;
  }
}
// TPT state-variable filter (stable at any cutoff)
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, Q) => {
    const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / Q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}

// ───────── instruments ─────────
function tone(t0, { f = 440, f2 = f, dur = 0.5, a = 0.004, d = 0.12, amp = 0.3, harm = 0, pan = 0, send = 0.25 }) {
  let ph = 0;
  voice(t0, dur, t => {
    ph += 2 * Math.PI * f * Math.pow(f2 / f, Math.min(1, t / dur)) / SR;
    return amp * env(t, a, d) * (Math.sin(ph) + harm * Math.sin(2 * ph));
  }, { pan, send });
}
// soft UI tap — word/line landings
const tap = (t0, f = 520, amp = 0.16, pan = 0) => {
  tone(t0, { f, f2: f * 0.97, dur: 0.35, a: 0.002, d: 0.07, amp, harm: 0.25, pan, send: 0.3 });
  tick(t0, { f: f * 5, amp: amp * 0.25, pan });
};
function tick(t0, { f = 3200, amp = 0.08, pan = 0 } = {}) {
  const flt = svf();
  voice(t0, 0.05, t => amp * (flt(noise(), 2400, 0.8).hp * env(t, 0.0005, 0.004) + 0.6 * Math.sin(2 * Math.PI * f * t) * env(t, 0.0008, 0.012)), { pan, send: 0.12 });
}
const pluck = (t0, f, amp = 0.2, pan = 0) => tone(t0, { f, dur: 0.9, a: 0.003, d: 0.2, amp, harm: 0.35, pan, send: 0.4 });
function whoosh(t0, dur, { f0 = 400, f1 = 3000, amp = 0.25, peak = 0.65, Q = 1.1, pan = 0, send = 0.35 } = {}) {
  const flt = svf();
  voice(t0, dur, t => {
    const u = t / dur;
    const e = u < peak ? Math.pow(u / peak, 2) : Math.pow((1 - u) / (1 - peak), 1.6);
    return amp * e * flt(noise(), f0 * Math.pow(f1 / f0, u), Q).bp;
  }, { pan, send });
}
function boom(t0, amp = 0.9) {
  let ph = 0;
  const flt = svf();
  voice(t0, 2.2, t => {
    ph += 2 * Math.PI * (38 + 42 * Math.exp(-t * 5)) / SR;
    return amp * (Math.sin(ph) * env(t, 0.004, 0.55) + 0.5 * flt(noise(), 900, 0.7).lp * env(t, 0.001, 0.03));
  }, { send: 0.3 });
}
function chime(t0, freqs, amp = 0.12, d = 0.7) {
  freqs.forEach((f, i) => {
    tone(t0 + i * 0.06, { f, dur: 2.4, a: 0.004, d, amp, harm: 0.08, pan: i % 2 ? 0.25 : -0.25, send: 0.55 });
    tone(t0 + i * 0.06, { f: f * 1.003, dur: 2.4, a: 0.004, d, amp: amp * 0.5, pan: i % 2 ? -0.2 : 0.2, send: 0.55 });
  });
}
function pad(t0, dur, freqs, amp = 0.05, attack = 0.8) {
  freqs.forEach((f, i) => {
    let ph = 0;
    voice(t0, dur, t => {
      ph += 2 * Math.PI * f * (1 + 0.002 * Math.sin(2 * Math.PI * 0.3 * t + i)) / SR;
      const e = Math.min(1, t / attack) * Math.min(1, (dur - t) / 0.8);
      return amp * e * Math.sin(ph);
    }, { pan: (i / (freqs.length - 1 || 1)) * 1.2 - 0.6, send: 0.6 });
  });
}
function riser(t0, dur, amp = 0.2) {
  whoosh(t0, dur, { f0: 250, f1: 5200, amp, peak: 0.92, Q: 1.6, send: 0.45 });
  tone(t0, { f: 110, f2: 220, dur, a: dur * 0.8, d: 0.25, amp: amp * 0.35, send: 0.3 });
}
const ping = (t0, amp = 0.06, pan = -0.3) => tone(t0, { f: 1480, f2: 1420, dur: 1.2, a: 0.002, d: 0.3, amp, pan, send: 0.7 });
const thump = (t0, amp = 0.35) => tone(t0, { f: 120, f2: 60, dur: 0.4, a: 0.002, d: 0.08, amp, send: 0.2 });

// same Emphasized curve the film counts with
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 30; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } return Y(t); };
}
const emph = bezier(.2, 0, 0, 1);
function countTicks(t0, t1, target, base, minGap = 0.035) {
  let last = -1, lastT = -1;
  for (let t = t0; t <= t1; t += 0.001) {
    const n = Math.round(target * emph(clamp((t - t0) / (t1 - t0))));
    if (n !== last && t - lastT >= minGap) { tick(t, { f: 2600 + n * 18, amp: 0.05, pan: 0.3 }); last = n; lastT = t; }
  }
}

// ───────── cue sheet (mirrors the beat list) ─────────
// Act 1 — the problem: no effects. The music's quiet build carries the tension alone.

// The turn — weight only, nothing playful: the hit (lands with the music's hit), the
// riser under the book drawing open, the bars landing, and the flood's whoosh.
boom(at('turn', 0.0), 0.5);
riser(at('turn', 0.2), 1.1, 0.14);                                                        // book draws open
[0, 1, 2].forEach(i => tap(at('turn', 1.15 + i * 0.12), [392, 493.88, 587.33][i], 0.07)); // bars grow
whoosh(at('turn', 4.55), 1.4, { f0: 300, f1: 6000, amp: 0.3, peak: 0.45, Q: 0.9, send: 0.5 }); // flood

// Act 2 — the product
whoosh(at('key', 0.25), 0.8, { f0: 1800, f1: 700, amp: 0.1, peak: 0.3 });                // mark to the corner
tap(at('key', 0.55), 523.25, 0.14);
[0, 1, 2].forEach(i => pluck(at('key', 1.6 + i * 0.14), [587.33, 739.99, 880][i], 0.13, -0.4 + i * 0.4));

thump(at('capture', 0.15));
whoosh(at('capture', 0.65), 0.45, { f0: 900, f1: 3800, amp: 0.08, peak: 0.7, pan: 0.35 }); // note sent
tick(at('capture', 0.8), { f: 3000, amp: 0.06, pan: 0.35 });
tap(at('capture', 1.3), 440, 0.1);
tick(at('capture', 2.2), { f: 2400, amp: 0.05, pan: -0.35 });                             // bot replies
pluck(at('capture', 3.55), 659.25, 0.12, -0.3);                                           // draft ready

thump(at('draft', 0.15));
whoosh(at('draft', 1.2), 1.6, { f0: 500, f1: 2200, amp: 0.1, peak: 0.6 });               // lean in
[0, 1, 2].forEach(i => tick(at('draft', 3.0 + i * 0.14), { f: 2600 + i * 200, amp: 0.05, pan: 0.3 })); // tags
[4.0, 4.5, 5.0].forEach((a, i) => pluck(at('draft', a), [659.25, 783.99, 987.77][i], 0.12, -0.35)); // claims traced
chime(at('draft', 5.25), [987.77, 1318.51], 0.1, 0.8);                                    // grounded
whoosh(at('draft', 6.0), 1.6, { f0: 2200, f1: 500, amp: 0.09, peak: 0.35 });              // pull out
tap(at('draft', 6.1), 440, 0.1);

thump(at('record', 0.15));
for (let i = 0; i < 5; i++) tick(at('record', 0.9 + i * 0.09), { f: 2200 + i * 120, amp: 0.05, pan: -0.3 });
countTicks(at('record', 0.9), at('record', 3.1), 30, 0);
tap(at('record', 1.8), 440, 0.1);
chime(at('record', 3.15), [783.99, 987.77], 0.05, 0.7);

thump(at('defense', 0.15));
tap(at('defense', 0.7), 392, 0.1);                                                        // examiner asks
tick(at('defense', 1.7), { f: 2600, amp: 0.05, pan: -0.3 });
tap(at('defense', 2.4), 523.25, 0.1);                                                     // your answer
chime(at('defense', 3.4), [783.99, 1174.66], 0.07, 0.7);                                  // backed by your record
tap(at('defense', 3.9), 440, 0.1);

// Act 3 — payoff
whoosh(at('answer', -0.1), 0.9, { f0: 900, f1: 4000, amp: 0.08, peak: 0.5 });           // dark → light
tap(at('answer', 0.4), 440, 0.16);
tap(at('triple', 0.15), 440, 0.15);
tap(at('triple', 1.1), 494, 0.15);
tap(at('triple', 2.05), 392, 0.2); thump(at('triple', 2.05), 0.3);                        // "Defend it."
whoosh(at('end', 0.1), 1.0, { f0: 600, f1: 1800, amp: 0.12, peak: 0.5 });                // mark returns
pad(at('end', 0.3), S.end.dur - 0.3, [293.66, 440, 587.33, 739.99], 0.04, 1.2);
tap(at('end', 0.75), 392, 0.18);
whoosh(at('end', 2.35), 1.1, { f0: 3000, f1: 9000, amp: 0.06, peak: 0.5, Q: 2.5, send: 0.6 }); // light sweep
chime(at('end', 2.45), [587.33, 880, 1174.66], 0.05, 1.4);

// ───────── reverb (Schroeder: 4 combs + 2 allpasses per side) ─────────
function reverb(input, combs, aps, fb = 0.8, damp = 0.3) {
  const out = new Float32Array(N);
  for (const len of combs) {
    const buf = new Float32Array(len); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx]; lp = y * (1 - damp) + lp * damp;
      buf[idx] = input[i] + lp * fb; idx = (idx + 1) % len; out[i] += y / combs.length;
    }
  }
  for (const len of aps) {
    const buf = new Float32Array(len); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx], y = -out[i] + b; buf[idx] = out[i] + b * 0.5; idx = (idx + 1) % len; out[i] = y; }
  }
  return out;
}
const sc = SR / 44100;
const wetL = reverb(RV, [1557, 1617, 1491, 1422].map(n => Math.round(n * sc)), [556, 441].map(n => Math.round(n * sc)));
const wetR = reverb(RV, [1580, 1640, 1514, 1445].map(n => Math.round(n * sc)), [579, 464].map(n => Math.round(n * sc)));

// ───────── master: sum, soft clip, fade with the picture, normalise to −1 dBFS ─────────
const fadeFrom = N - Math.round(0.8 * SR);
let peak = 0;
for (let i = 0; i < N; i++) {
  const f = i < fadeFrom ? 1 : 1 - (i - fadeFrom) / (N - fadeFrom);
  L[i] = Math.tanh((L[i] + wetL[i] * 0.55) * 1.1) * f;
  R[i] = Math.tanh((R[i] + wetR[i] * 0.55) * 1.1) * f;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(here, 'sfx.wav'), buf);
console.log(`sfx.wav · ${TOTAL.toFixed(1)}s · ${Object.keys(S).length} beats cued`);
