import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DATA, MEDIA, UserError, env } from './config.js';

const run = promisify(execFile);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SPEND = path.join(DATA, 'clips-made.json');

const clipsMade = () => { try { return JSON.parse(fs.readFileSync(SPEND, 'utf8')).count || 0; } catch { return 0; } };
export const newFile = (ext) => `${crypto.randomBytes(8).toString('hex')}.${ext}`;

export function videoStatus() {
  return {
    key: Boolean(env('FAL_KEY')),
    live: env('VIDEO_LIVE') === '1',
    made: clipsMade(),
    max: Number(env('VIDEO_MAX_CLIPS', '6')),
    seconds: env('VIDEO_SECONDS', '5'),
    resolution: env('VIDEO_RESOLUTION', '480p'),
    model: env('FAL_VIDEO_MODEL', 'bytedance/seedance-2.0/fast/text-to-video'),
  };
}

// Throws before any money is spent if generation is not allowed.
export function reserveClip() {
  const s = videoStatus();
  if (!s.key) throw new UserError('Video is not connected. Add FAL_KEY to .env, or add a clip you made elsewhere.');
  if (!s.live) throw new UserError('Paid video is switched off. Set VIDEO_LIVE=1 in .env to allow it.');
  if (s.made >= s.max) throw new UserError(`The clip limit (${s.max}) is used up. Raise VIDEO_MAX_CLIPS in .env to make more.`);
  fs.writeFileSync(SPEND, JSON.stringify({ count: s.made + 1 }));
  return s;
}

export async function makeClip(prompt, s) {
  const headers = { Authorization: `Key ${env('FAL_KEY')}`, 'Content-Type': 'application/json' };
  const getJson = async (url, options = {}) => {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000), ...options });
    if (!res.ok) throw new Error(`fal HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
  const job = await getJson(`https://queue.fal.run/${s.model}`, {
    method: 'POST',
    body: JSON.stringify({ prompt, duration: s.seconds, resolution: s.resolution, aspect_ratio: '16:9' }),
  });
  for (const url of [job.status_url, job.response_url]) {
    if (new URL(url).hostname !== 'queue.fal.run') throw new Error('fal returned an unexpected address');
  }
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    await wait(3000);
    const { status } = await getJson(job.status_url);
    if (status !== 'COMPLETED') continue;
    const result = await getJson(job.response_url);
    const res = await fetch(result.video.url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Could not download the clip (HTTP ${res.status})`);
    const file = newFile('mp4');
    fs.writeFileSync(path.join(MEDIA, file), Buffer.from(await res.arrayBuffer()));
    return file;
  }
  throw new Error('The clip took longer than 8 minutes');
}

export async function cutTogether(files) {
  const work = fs.mkdtempSync(path.join(DATA, 'cut-'));
  try {
    const parts = [];
    for (const [i, file] of files.entries()) {
      const input = path.join(MEDIA, file);
      const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', input]);
      const silent = !probe.stdout.trim();
      const out = path.join(work, `${i}.mp4`);
      await run('ffmpeg', [
        '-y', '-v', 'error', '-i', input,
        ...(silent ? ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'] : []),
        '-map', '0:v:0', '-map', silent ? '1:a:0' : '0:a:0', ...(silent ? ['-shortest'] : []),
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', out,
      ], { timeout: 120_000 });
      parts.push(out);
    }
    const list = path.join(work, 'list.txt');
    fs.writeFileSync(list, parts.map((p) => `file '${path.basename(p)}'`).join('\n'));
    const file = newFile('mp4');
    await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(MEDIA, file)], { timeout: 120_000 });
    return file;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
