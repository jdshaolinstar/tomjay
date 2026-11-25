# Dress Rehearsal

Film crews rehearse the hard scenes. Now you can.

Tell it about an event you're nervous about, who you are, and who else is going.
It stages three ways it could go: the one you fear, the odd one, and the one you
hope for. Each ends with one thing to go and do.

## Run it

Needs Node 20+ and ffmpeg.

    npm install
    cp .env.example .env
    npm start

Open the link the server prints. It includes the access code. With no keys, the app
uses sample takes and paper figures, so everything can be tried for free.

To share it: `npm run tunnel` in a second window, then add `/#code=<access code>` to
the address it prints. Don't post the code publicly: it lets people use your credits.

## Keys (.env)

| Key | Used for | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Writing the takes | Sample takes |
| `PANGRAM_API_KEY` | Checking answers are people's own words | Not checked |
| `FAL_KEY` and `VIDEO_LIVE=1` | Optional: making clips in the app (paid) | Paper figures, or upload clips made in Kino |

`VIDEO_MAX_CLIPS` caps paid clips.

## Where things are

- `prompts/` the look, the video prompt and the script prompt. Edit the files, or use `/lab`.
- `server.js`, `lib/` the server. `public/` the pages. `data/` local only, not in git.
