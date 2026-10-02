// Renders siwes-film.html to MP4, frame by frame, on the film's own clock.
//   cd promo && npm install && node render.mjs [out.mp4] [--stills 1,10.5,30]
// Env: FPS (default 30), CHROME (path to Chrome), needs ffmpeg on PATH.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stillsAt = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const out = args.find(a => a.endsWith('.mp4')) || path.join(here, 'siwes-film.mp4');
const fps = Number(process.env.FPS || 30);
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'siwes-film.html')).href + '?render=1', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__film && window.__film.ready', { timeout: 60000 });
const duration = await page.evaluate('window.__film.duration');

if (stillsAt) {
  for (const t of stillsAt) {
    await page.evaluate(t => window.__film.seek(t), t);
    await page.screenshot({ path: path.join(here, `still-${t.toFixed(2)}.png`) });
  }
  await browser.close();
  console.log(`wrote ${stillsAt.length} stills`);
  process.exit(0);
}

const frames = Math.ceil(duration * fps);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.__film.seek(t), i / fps);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`done → ${out} (${duration.toFixed(1)}s @ ${fps}fps)`);
