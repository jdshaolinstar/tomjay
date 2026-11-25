import fs from 'node:fs';
import path from 'node:path';
import { ROOT, UserError, env } from './config.js';

const NAMES = ['script', 'video', 'style'];
const fileFor = (name) => {
  if (!NAMES.includes(name)) throw new UserError('No prompt by that name.', 404);
  return path.join(ROOT, 'prompts', `${name}.md`);
};

export const readPrompt = (name) => fs.readFileSync(fileFor(name), 'utf8').replace(/\r\n/g, '\n');
export function writePrompt(name, text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw new UserError('Write some prompt text first.');
  fs.writeFileSync(fileFor(name), text.replace(/\r\n/g, '\n').trimEnd() + '\n');
}

// Single pass, so text people type can never be expanded as a placeholder.
const fill = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (all, key) => (key in values ? values[key] : all));

const describe = (p) => `${p.name}: ${p.about || 'has not said anything about themselves'}`;

export function scriptPrompt(room) {
  const [you, ...others] = room.people;
  return fill(readPrompt('script'), {
    event: room.event,
    worry: room.worry || 'They did not say.',
    you: describe(you),
    others: others.length ? others.map(describe).join('\n') : 'Nobody named.',
  });
}

export function videoPrompt(room, take) {
  return fill(readPrompt('video'), {
    style: readPrompt('style').trim(),
    seconds: env('VIDEO_SECONDS', '5'),
    event: room.event,
    people: room.people.map((p) => p.name).join(', '),
    shot: take.shot,
    beats: take.beats.map((b, i) => `${i + 1}. ${b.speaker} (${b.action}): "${b.line}"`).join('\n'),
  }).trim();
}

export const SAMPLE_ROOM = {
  event: 'A one-day hackathon in a warehouse space. Demos at 7:30.',
  worry: 'Standing alone by the food while everyone else already knows each other.',
  people: [
    { id: 'a', name: 'Alex', about: 'Makes visual effects and games.' },
    { id: 'b', name: 'Sam', about: 'Industrial engineer who also codes.' },
  ],
};
