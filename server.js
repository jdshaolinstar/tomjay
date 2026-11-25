import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { ROOT, MEDIA, ROOMS, ACCESS_CODE, UserError, env } from './lib/config.js';
import { readPrompt, writePrompt, videoPrompt, scriptPrompt, SAMPLE_ROOM } from './lib/prompts.js';
import { writeTakes, sampleTakes } from './lib/takes.js';
import { checkWords } from './lib/pangram.js';
import { videoStatus, reserveClip, makeClip, cutTogether, newFile } from './lib/video.js';

const PORT = 4310;
const PUBLIC = path.join(ROOT, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };
const SLOTS = ['fear', 'odd', 'hope', 'real'];
const MAX_PEOPLE = 6;

// ---- rooms -------------------------------------------------------------
const roomFile = (id) => {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new UserError('No rehearsal at this link.', 404);
  return path.join(ROOMS, `${id}.json`);
};
function loadRoom(id) {
  try { return JSON.parse(fs.readFileSync(roomFile(id), 'utf8')); } catch (err) {
    if (err instanceof UserError) throw err;
    throw new UserError('No rehearsal at this link.', 404);
  }
}
const saveRoom = (room) => fs.writeFileSync(roomFile(room.id), JSON.stringify(room, null, 2));

const text = (value, max, message) => {
  const s = typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (!s && message) throw new UserError(message);
  return s;
};
async function person(body) {
  const name = text(body.name, 40, 'Add a name first.');
  const about = text(body.about, 2000);
  const words = about ? await checkWords(about) : { state: 'unchecked', note: '' };
  return { id: crypto.randomBytes(4).toString('hex'), name, about, words };
}
function addPerson(id, p) {
  const room = loadRoom(id);
  if (room.people.length >= MAX_PEOPLE) throw new UserError(`The stage is full at ${MAX_PEOPLE} people.`);
  if (room.people.some((q) => q.name.toLowerCase() === p.name.toLowerCase())) throw new UserError(`${p.name} is already on stage. Use a different name.`);
  room.people.push(p);
  saveRoom(room);
  return room;
}

// ---- http helpers ------------------------------------------------------
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};
async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new UserError('That is too much text.', 413);
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new UserError('That request could not be read.'); }
}
function allowed(req) {
  const given = Buffer.from(String(req.headers['x-app-code'] || ''));
  const want = Buffer.from(ACCESS_CODE);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}
function serveFile(req, res, base, name) {
  const file = path.resolve(base, name);
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end('Not found');
  }
  const { size } = fs.statSync(file);
  const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': base === MEDIA ? 'private, max-age=3600' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  fs.createReadStream(file).pipe(res);
}
async function receiveClip(req) {
  const ext = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }[String(req.headers['content-type']).split(';')[0]];
  if (!ext) throw new UserError('Use an MP4, MOV or WebM video.');
  const file = newFile(ext);
  const full = path.join(MEDIA, file);
  let size = 0;
  try {
    await pipeline(req, async function* (source) {
      for await (const chunk of source) {
        size += chunk.length;
        if (size > 95 * 1024 * 1024) throw new UserError('Keep the video under 95 MB.', 413);
        yield chunk;
      }
    }, fs.createWriteStream(full));
  } catch (err) { fs.rmSync(full, { force: true }); throw err; }
  return file;
}

// ---- api ---------------------------------------------------------------
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1);
  const [area, id, sub, slot, verb] = parts;
  const is = (method, length) => req.method === method && parts.length === length;

  // Invite links: no access code, and they only reveal the event and who invited you.
  if (area === 'join' && id) {
    const room = loadRoom(id);
    if (req.method === 'GET') return send(res, 200, { event: room.event, host: room.people[0].name });
    if (req.method === 'POST') {
      if (room.people.length >= MAX_PEOPLE) throw new UserError(`The stage is full at ${MAX_PEOPLE} people.`);
      const p = await person(await readJson(req));
      if (p.words.state === 'ai') return send(res, 200, { added: false, words: p.words });
      addPerson(id, p);
      return send(res, 200, { added: true, words: p.words });
    }
  }

  if (!allowed(req)) throw new UserError('Open the link with the access code to use this.', 401);

  if (area === 'status' && is('GET', 1)) {
    return send(res, 200, { claude: Boolean(env('ANTHROPIC_API_KEY')), pangram: Boolean(env('PANGRAM_API_KEY')), video: videoStatus() });
  }
  if (area === 'check' && is('POST', 1)) return send(res, 200, await checkWords(text((await readJson(req)).text, 2000)));

  if (area === 'prompts' && parts.length === 2) {
    if (req.method === 'PUT') writePrompt(id, (await readJson(req)).text);
    return send(res, 200, { text: readPrompt(id) });
  }
  if (area === 'preview' && is('POST', 1)) {
    const { room: roomId, slot: takeId } = await readJson(req);
    const room = roomId ? loadRoom(roomId) : SAMPLE_ROOM;
    const takes = room.takes?.length ? room.takes : sampleTakes(room);
    const take = takes.find((t) => t.id === takeId) || takes[0];
    return send(res, 200, { script: scriptPrompt(room), video: videoPrompt(room, take) });
  }

  if (area !== 'rooms') throw new UserError('Nothing here.', 404);

  if (is('POST', 1)) {
    const body = await readJson(req);
    const event = text(body.event, 2000, 'Tell us about the event first.');
    const you = await person(body.you || {});
    if (you.words.state === 'ai') return send(res, 200, { needsRewrite: true, words: you.words });
    const room = { id: crypto.randomBytes(8).toString('hex'), event, worry: text(body.worry, 1000), people: [you], takes: [], source: '', clips: {}, createdAt: new Date().toISOString() };
    saveRoom(room);
    return send(res, 200, room);
  }
  if (is('GET', 2)) return send(res, 200, loadRoom(id));
  if (is('PUT', 2)) {
    const body = await readJson(req);
    const event = text(body.event, 2000, 'Tell us about the event first.');
    const you = await person(body.you || {});
    if (you.words.state === 'ai') return send(res, 200, { needsRewrite: true, words: you.words });
    const room = loadRoom(id);
    you.id = room.people[0].id;
    Object.assign(room, { event, worry: text(body.worry, 1000) });
    room.people[0] = you;
    saveRoom(room);
    return send(res, 200, room);
  }
  if (sub === 'people' && is('POST', 3)) return send(res, 200, addPerson(id, await person(await readJson(req))));
  if (sub === 'people' && is('DELETE', 4)) {
    const room = loadRoom(id);
    room.people = room.people.filter((p, i) => i === 0 || p.id !== slot);
    saveRoom(room);
    return send(res, 200, room);
  }
  if (sub === 'takes' && is('POST', 3)) {
    const result = await writeTakes(loadRoom(id));
    const room = loadRoom(id);
    const real = room.clips.real;
    Object.assign(room, result, { clips: real ? { real } : {} });
    saveRoom(room);
    return send(res, 200, room);
  }
  if (sub === 'clips' && SLOTS.includes(slot) && is('POST', 5)) {
    const room = loadRoom(id);
    if (verb === 'upload') {
      const file = await receiveClip(req);
      const fresh = loadRoom(id);
      fresh.clips[slot] = { state: 'ready', file };
      saveRoom(fresh);
      return send(res, 200, fresh);
    }
    if (verb === 'generate') {
      const take = room.takes.find((t) => t.id === slot);
      if (!take) throw new UserError('Write the takes first.');
      if (room.clips[slot]?.state === 'making') throw new UserError('This clip is already being made.');
      const settings = reserveClip();
      const job = crypto.randomBytes(4).toString('hex');
      room.clips[slot] = { state: 'making', job };
      saveRoom(room);
      const finish = (clip) => {
        const fresh = loadRoom(id);
        if (fresh.clips[slot]?.job !== job) return;
        fresh.clips[slot] = clip;
        saveRoom(fresh);
      };
      makeClip(videoPrompt(room, take), settings).then(
        (file) => finish({ state: 'ready', file }),
        (err) => { console.error('[video]', err.message); finish({ state: 'failed', error: err.message }); },
      );
      return send(res, 202, room);
    }
  }
  if (sub === 'cut' && is('POST', 3)) {
    const room = loadRoom(id);
    const files = SLOTS.map((s) => room.clips[s]).filter((c) => c?.state === 'ready').map((c) => c.file);
    if (!files.length) throw new UserError('Add at least one clip, then cut them together.');
    const file = await cutTogether(files);
    return send(res, 200, { file });
  }
  throw new UserError('Nothing here.', 404);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    if (url.pathname.startsWith('/media/')) return serveFile(req, res, MEDIA, decodeURIComponent(url.pathname.slice(7)));
    const page = { '/': 'index.html', '/lab': 'lab.html', '/join': 'join.html' }[url.pathname];
    return serveFile(req, res, PUBLIC, page || decodeURIComponent(url.pathname.slice(1)));
  } catch (err) {
    if (!(err instanceof UserError)) console.error(err);
    if (res.headersSent) return res.destroy();
    send(res, err.status || 500, { error: err instanceof UserError ? err.message : 'Something broke on the server. Check its window for details.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dress Rehearsal  http://localhost:${PORT}/#code=${ACCESS_CODE}`);
  console.log(`Prompt lab       http://localhost:${PORT}/lab#code=${ACCESS_CODE}`);
});
