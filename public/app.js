import { api, $, el, showWords } from './api.js';
import { Stage, TAPES } from './stage.js';

const stage = new Stage($('scene'), $('line'));
const STEPS = ['event', 'you', 'others', 'takes'];
let room = null;
let status = null;
let step = 'event';

const names = () => (room ? room.people.map((p) => p.name) : []);
function notice(message) { $('notice').textContent = message || ''; $('notice').hidden = !message; }
function go(next) {
  step = next;
  for (const name of STEPS) $(`step-${name}`).hidden = name !== next;
  notice('');
  showStage();
}
function showStage() {
  $('clip').pause(); $('clip').hidden = true; $('todo').hidden = true; $('swag').hidden = true;
  stage.cast(names());
}

// Runs an action with its button disabled and any error shown.
async function busy(button, label, action) {
  const before = button.textContent;
  button.disabled = true; if (label) button.textContent = label;
  notice('');
  try { return await action(); } catch (err) { notice(err.message); } finally { button.disabled = false; button.textContent = before; }
}
function setRoom(next) {
  room = next;
  localStorage.setItem('room', room.id);
  $('lab-link').href = `/lab?room=${room.id}`;
  renderCast();
  renderTakes();
}

function renderCast() {
  $('cast').replaceChildren(...room.people.map((p, i) => {
    const item = el('li', {}, p.name);
    item.style.background = TAPES[i % TAPES.length];
    if (i > 0) {
      const remove = el('button', { type: 'button', textContent: '×', ariaLabel: `Remove ${p.name}` });
      remove.onclick = () => busy(remove, '', async () => { setRoom(await api('DELETE', `rooms/${room.id}/people/${p.id}`)); showStage(); });
      item.append(remove);
    }
    return item;
  }));
}

const clipOf = (slot) => room.clips?.[slot];
function clipNote(clip) {
  if (clip?.state === 'making') return 'Making the clip. This can take a few minutes.';
  if (clip?.state === 'failed') return `The clip failed: ${clip.error}`;
  return '';
}
function uploadButton(slot, label) {
  const input = el('input', { type: 'file', accept: 'video/mp4,video/quicktime,video/webm', hidden: true });
  const button = el('button', { type: 'button', textContent: label });
  button.onclick = () => input.click();
  input.onchange = () => input.files[0] && busy(button, 'Adding…', async () => {
    const file = input.files[0];
    setRoom(await api('POST', `rooms/${room.id}/clips/${slot}/upload`, file, file.type || 'video/mp4'));
  });
  return [button, input];
}
function renderTakes() {
  if (!room.takes?.length) return;
  const rows = room.takes.map((take, i) => {
    const clip = clipOf(take.id);
    const play = el('button', { type: 'button', textContent: clip?.state === 'ready' ? 'Play clip' : 'Play take' });
    play.onclick = () => playTake(take);
    const tools = [play];
    if (clip?.state === 'ready') {
      const paper = el('button', { type: 'button', className: 'plain', textContent: 'Play paper version' });
      paper.onclick = () => playTake(take, true);
      tools.push(paper);
    } else if (status?.video.live && status?.video.key && clip?.state !== 'making') {
      const make = el('button', { type: 'button', textContent: 'Make video clip' });
      make.onclick = () => {
        if (make.dataset.sure) {
          return busy(make, 'Sending…', async () => { setRoom(await api('POST', `rooms/${room.id}/clips/${take.id}/generate`)); status = await api('GET', 'status'); });
        }
        make.dataset.sure = '1';
        make.textContent = `Spend 1 of ${Math.max(0, status.video.max - status.video.made)} clips left?`;
      };
      tools.push(make);
    }
    tools.push(...uploadButton(take.id, clip?.state === 'ready' ? 'Replace clip' : 'Add a clip'));
    const item = el('li', {}, el('h3', { textContent: take.title }), el('p', { textContent: take.logline }), el('p', { className: 'do', textContent: take.do_this }), el('div', { className: 'row' }, ...tools));
    if (clipNote(clip)) item.append(el('p', { className: 'state', textContent: clipNote(clip) }));
    item.style.setProperty('--tape', TAPES[i]);
    return item;
  });
  const real = clipOf('real');
  const tools = [...uploadButton('real', real ? 'Replace footage' : 'Add real footage')];
  if (real?.state === 'ready') {
    const play = el('button', { type: 'button', textContent: 'Play footage' });
    play.onclick = () => showClip(real.file, '');
    tools.unshift(play);
  }
  const last = el('li', {}, el('h3', { textContent: 'What really happened' }), el('p', { textContent: 'Go and do it, film it, and put it here. It plays last.' }), el('div', { className: 'row' }, ...tools));
  last.style.setProperty('--tape', '#16272c');
  $('takes').replaceChildren(...rows, last);
}

// The ending: the thing to go and do, then SWAG if it is switched on.
function finish(todo) {
  $('todo').textContent = todo; $('todo').hidden = !todo;
  $('swag').hidden = !$('swag-on').checked;
}
$('swag-on').checked = localStorage.getItem('swag') === '1';
$('swag-on').onchange = () => localStorage.setItem('swag', $('swag-on').checked ? '1' : '0');

function showClip(file, todo) {
  stage.cast(names());
  const video = $('clip');
  video.src = `/media/${file}`;
  video.hidden = false;
  $('todo').hidden = true; $('swag').hidden = true;
  video.onended = () => finish(todo);
  video.play().catch(() => {});
}
async function playTake(take, paper = false) {
  const clip = clipOf(take.id);
  if (!paper && clip?.state === 'ready') return showClip(clip.file, take.do_this);
  showStage();
  if (await stage.play(take, names())) finish(take.do_this);
}

// ---- steps -------------------------------------------------------------
document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
$('step-event').onsubmit = (e) => { e.preventDefault(); go('you'); };
$('step-you').onsubmit = (e) => {
  e.preventDefault();
  busy(e.submitter, 'Reading…', async () => {
    const body = { event: $('event').value, worry: $('worry').value, you: { name: $('you-name').value, about: $('you-about').value } };
    const result = await (room ? api('PUT', `rooms/${room.id}`, body) : api('POST', 'rooms', body));
    if (result.needsRewrite) return showWords($('you-words'), result.words);
    showWords($('you-words'), result.people[0].words);
    setRoom(result);
    go('others');
    if (result.people[0].about) notice(result.people[0].words.note);
  });
};
$('add-person').onsubmit = (e) => {
  e.preventDefault();
  busy(e.submitter, 'Adding…', async () => {
    setRoom(await api('POST', `rooms/${room.id}/people`, { name: $('other-name').value, about: $('other-about').value }));
    showWords($('other-words'), $('other-about').value ? room.people.at(-1).words : null);
    e.target.reset();
    showStage();
  });
};
$('copy-invite').onclick = async () => {
  const link = `${location.origin}/join?room=${room.id}`;
  try { await navigator.clipboard.writeText(link); notice('Invite link copied. They appear on stage when they join.'); } catch { notice(link); }
};
async function writeTakes(button) {
  await busy(button, 'Writing…', async () => {
    setRoom(await api('POST', `rooms/${room.id}/takes`));
    go('takes');
    if (room.source === 'sample') notice('These are sample takes. Add ANTHROPIC_API_KEY to .env to write them from your answers.');
  });
}
$('write').onclick = () => writeTakes($('write'));
$('rewrite').onclick = () => writeTakes($('rewrite'));
$('cut').onclick = () => busy($('cut'), 'Cutting…', async () => showClip((await api('POST', `rooms/${room.id}/cut`)).file, ''));

// Picks up people who join by link, and clips that finish.
setInterval(async () => {
  if (!room || document.hidden) return;
  const making = Object.values(room.clips || {}).some((c) => c.state === 'making');
  if (step !== 'others' && !making) return;
  try {
    const next = await api('GET', `rooms/${room.id}`);
    if (JSON.stringify(next) === JSON.stringify(room)) return;
    const joined = next.people.length !== room.people.length;
    setRoom(next);
    if (joined && step === 'others') showStage();
  } catch { /* try again next time */ }
}, 4000);

try {
  status = await api('GET', 'status');
  const saved = new URLSearchParams(location.search).get('room') || localStorage.getItem('room');
  if (saved) {
    try {
      setRoom(await api('GET', `rooms/${saved}`));
      $('event').value = room.event; $('worry').value = room.worry;
      $('you-name').value = room.people[0].name; $('you-about').value = room.people[0].about;
      go(room.takes.length ? 'takes' : 'others');
    } catch { localStorage.removeItem('room'); }
  }
} catch (err) { notice(err.message); }
if (!room) stage.cast(['You', 'Stranger']);
