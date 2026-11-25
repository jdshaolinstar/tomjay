import { env } from './config.js';

const BASE = 'https://text.external-api.pangram.com';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns { state: 'human' | 'mixed' | 'ai' | 'unchecked', note }.
// A failed check never blocks anyone: detection can be wrong or unavailable.
export async function checkWords(text) {
  const key = env('PANGRAM_API_KEY');
  const clean = String(text || '').trim();
  if (!clean) return { state: 'unchecked', note: 'Nothing to check yet.' };
  if (!key) return { state: 'unchecked', note: 'Not checked: Pangram is not connected.' };
  const call = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 402) throw new Error('the Pangram account has no credits');
    if (res.status === 401 || res.status === 403) throw new Error('Pangram rejected the key');
    if (!res.ok) throw new Error(`Pangram HTTP ${res.status}`);
    return res.json();
  };
  try {
    const { task_id } = await call(`${BASE}/task`, { method: 'POST', body: JSON.stringify({ text: clean, model: 'default' }) });
    for (let i = 0; i < 20; i++) {
      await wait(700);
      const result = await call(`${BASE}/task/${encodeURIComponent(task_id)}`);
      if (result.stage === 'STAGE_FAILED') throw new Error('Pangram could not read this text');
      if (result.stage !== 'STAGE_SUCCESS') continue;
      const short = String(result.prediction_short || '').toLowerCase();
      const state = short === 'ai' ? 'ai' : short === 'human' ? 'human' : 'mixed';
      const note = {
        human: 'Pangram reads this as your own words.',
        mixed: 'Pangram reads part of this as AI. Say more of it your way if you can.',
        ai: 'Pangram reads this as AI writing. We can’t rehearse you from someone else’s words, so try it again in yours.',
      }[state];
      return { state, note, fractionAi: result.fraction_ai };
    }
    throw new Error('Pangram took too long');
  } catch (err) {
    console.error('[pangram]', err.message);
    return { state: 'unchecked', note: `Not checked: ${err.message}.` };
  }
}
