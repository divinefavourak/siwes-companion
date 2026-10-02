// Mixes picture + sound design (+ optional music) into the final film.
//   node mix.mjs                                        → siwes-film-sfx.mp4   (effects only)
//   node mix.mjs track.mp3 [--offset 1.025] [--music 0] [--out name.mp4]
//                                                       → siwes-film-sound.mp4 (music + effects)
// --offset  seconds to skip into the track (line its biggest hit up with the hard cut at the turn)
// --music   music level trim in dB (default 0 = music bed at −20 LUFS under the effects)
// The music is measured and set to a fixed loudness first (tracks arrive mastered at very
// different levels), then ducked by the effects so hits and ticks cut through.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const flagValues = new Set(['--offset', '--music', '--out'].map(f => opt(f)).filter(Boolean));
const track = args.find(a => !a.startsWith('--') && !flagValues.has(a));
const offset = Number(opt('--offset', 0));
const musicDb = Number(opt('--music', 0));

const video = path.join(here, 'siwes-film.mp4');
const sfx = path.join(here, 'sfx.wav');
for (const f of [video, sfx, ...(track ? [track] : [])]) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
const probe = f => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString().trim());
const dur = probe(video);

const out = path.join(here, opt('--out', track ? 'siwes-film-sound.mp4' : 'siwes-film-sfx.mp4'));
const inputs = ['-i', video, '-i', sfx];
let graph = '[1:a]aformat=sample_rates=48000:channel_layouts=stereo[fx];';
if (track) {
  // measure the stretch of the track the film will actually use
  const meter = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(offset), '-t', String(dur), '-i', track, '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const lufs = Number((meter.stderr.toString().match(/I:\s+(-?[\d.]+) LUFS\s*$/m) || [])[1]);
  if (!Number.isFinite(lufs)) throw new Error('could not measure the track loudness');
  const gain = -20 + musicDb - lufs;
  const needLoop = probe(track) - offset < dur;
  inputs.push(...(needLoop ? ['-stream_loop', '-1'] : []), '-ss', String(offset), '-i', track);
  graph +=
    '[fx]asplit[fxa][fxkey];' +
    `[2:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${dur},asetpts=N/SR/TB,volume=${gain.toFixed(2)}dB,` +
    `afade=t=in:d=0.3,afade=t=out:st=${(dur - 1.6).toFixed(2)}:d=1.6[mu];` +
    '[mu][fxkey]sidechaincompress=threshold=0.04:ratio=3:attack=5:release=280[duck];' +
    '[duck][fxa]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89:level=false[mix];[mix]';
  console.log(`track ${lufs.toFixed(1)} LUFS → bed at ${(-20 + musicDb).toFixed(1)} LUFS (gain ${gain.toFixed(1)} dB), offset ${offset}s${needLoop ? ', looped' : ''}`);
} else {
  graph += '[fx]';
}
graph += 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]';

const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', graph,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(dur), '-movflags', '+faststart', out],
  { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`done → ${out}`);
