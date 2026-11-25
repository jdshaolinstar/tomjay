import Anthropic from '@anthropic-ai/sdk';
import { UserError, env } from './config.js';
import { scriptPrompt } from './prompts.js';

const ACTIONS = ['enter', 'approach', 'retreat', 'gesture', 'laugh', 'freeze', 'drop'];
const IDS = ['fear', 'odd', 'hope'];
const str = { type: 'string' };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['takes'],
  properties: {
    takes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'logline', 'shot', 'beats', 'do_this'],
        properties: {
          id: { type: 'string', enum: IDS },
          title: str,
          logline: str,
          shot: str,
          do_this: str,
          beats: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'action', 'line'],
              properties: { speaker: str, action: { type: 'string', enum: ACTIONS }, line: str },
            },
          },
        },
      },
    },
  },
};

export async function writeTakes(room) {
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) return { source: 'sample', takes: sampleTakes(room) };
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });
  let response;
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: scriptPrompt(room) }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new UserError('Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.', 502);
    if (err instanceof Anthropic.RateLimitError) throw new UserError('Claude is rate limited. Wait a minute and try again.', 502);
    if (err instanceof Anthropic.APIConnectionError) throw new UserError('Could not reach Claude. Check the connection and try again.', 502);
    if (err instanceof Anthropic.APIError) throw new UserError(`Claude returned an error (${err.status}): ${err.message}`, 502);
    throw err;
  }
  if (response.stop_reason === 'refusal') throw new UserError('Claude would not write this one. Reword the event or the worry.', 422);
  if (response.stop_reason === 'max_tokens') throw new UserError('The script ran too long. Try again.', 502);
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let takes;
  try { takes = JSON.parse(text).takes; } catch { throw new UserError('The script came back unreadable. Try again.', 502); }
  const ordered = IDS.map((id) => takes.find((t) => t.id === id));
  if (ordered.some((t) => !t || !t.beats.length)) throw new UserError('The script came back incomplete. Try again.', 502);
  return { source: 'claude', takes: ordered };
}

export function sampleTakes(room) {
  const a = room.people[0].name;
  const b = room.people[1]?.name || 'Stranger';
  const beat = (speaker, action, line) => ({ speaker, action, line });
  return [
    {
      id: 'fear', title: 'The long silence', logline: `${a} says hello and then runs out of words.`,
      shot: `${a} reaches for a drink, knocks it over, and ${b} watches it roll across the floor.`,
      beats: [beat(a, 'enter', 'Hi. I had a second sentence planned.'), beat(b, 'freeze', 'Take your time.'), beat(a, 'drop', 'That was my drink.'), beat(b, 'laugh', 'Good. Now we have something to talk about.')],
      do_this: 'Ask the nearest person what they are working on.',
    },
    {
      id: 'odd', title: 'Lights out', logline: 'The power goes and the room has to improvise.',
      shot: `The lamp cuts out and ${a} and ${b} hold up phones to light the stage.`,
      beats: [beat(b, 'freeze', 'Was that us?'), beat(a, 'gesture', 'I only touched one thing.'), beat(b, 'approach', 'Phones up. We can light this ourselves.'), beat(a, 'laugh', 'This is the best part of the night.')],
      do_this: 'Offer to help someone carry, plug in or set up one thing.',
    },
    {
      id: 'hope', title: 'One good question', logline: `${a} and ${b} find something to trade.`,
      shot: `${a} and ${b} lean over one table and start sketching on the same sheet of paper.`,
      beats: [beat(a, 'approach', 'What are you stuck on tonight?'), beat(b, 'gesture', 'This part. I cannot see it yet.'), beat(a, 'gesture', 'Can I draw it?'), beat(b, 'laugh', 'Yes. Then I will build it.')],
      do_this: `Ask ${b} what they are stuck on, and draw it with them.`,
    },
  ];
}
