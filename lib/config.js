import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
export const MEDIA = path.join(DATA, 'media');
export const ROOMS = path.join(DATA, 'rooms');
for (const dir of [DATA, MEDIA, ROOMS]) fs.mkdirSync(dir, { recursive: true });

const ENV_FILE = path.join(ROOT, '.env');
let cached = { mtime: -1, values: {} };

// .env is re-read when it changes, so keys can be added while the server runs.
export function env(name, fallback = '') {
  let mtime = 0;
  try { mtime = fs.statSync(ENV_FILE).mtimeMs; } catch { /* no .env yet */ }
  if (mtime !== cached.mtime) {
    const values = {};
    if (mtime) {
      for (const line of fs.readFileSync(ENV_FILE, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m) values[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
      }
    }
    cached = { mtime, values };
  }
  return cached.values[name] || process.env[name] || fallback;
}

function loadAccessCode() {
  const file = path.join(DATA, 'access-code.txt');
  try {
    const code = fs.readFileSync(file, 'utf8').trim();
    if (code) return code;
  } catch { /* first run */ }
  const code = crypto.randomBytes(9).toString('base64url');
  fs.writeFileSync(file, code);
  return code;
}
export const ACCESS_CODE = loadAccessCode();

export class UserError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
