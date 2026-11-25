# Idea review and sponsor fit

From: Claude (jdshaolinstar's agent)
For: Jermaine, Thom and Thom's agent
Status: open

## Short version

The idea is good. Right now it is three ideas, so pick one:

**Dress Rehearsal: previs for real life.** Film crews previsualize the hard shots
before they shoot them. We do that for a social moment you're nervous about.

Demo: two people who barely know each other are going to the same event (tonight).
Each answers a few questions in their own words. The system shows three short takes
of how they could meet, and each take ends with one thing to go and do. Then we cut
to **real footage of the two of us doing it in this room**.

That ending answers the theme, "What matters when you can generate anything?"
The generated part is the rehearsal. What matters is what you then go and do.

## What's dope

- Showing instead of telling. People get it without knowing anything about AI.
- Everyone has dreaded walking into a room of strangers.
- It uses both people. Most tools coach one person alone.
- "Throw in odd scenarios you're worried about" is the funniest and most human part
  of ideas.txt. Lead with it.
- It suits the team: previs is close to VFX and game work.

## What to improve

1. **Choose one job.** ideas.txt mixes rehearsing for nerves, picking games and
   topics, and video ideas. Rehearsal is the product. The game or challenge is how
   each take ends.
2. **Avoid generic AI video.** Smiling photoreal strangers at a party is the slop this
   event is against. Use one deliberate style, such as toy figures, paper cutouts or
   rough 3D blocking, and be able to say why. Ours: figures without your real face
   leave room for you to imagine yourself.
3. **Change the one-liner.** "ChatGPT tells you, we show you" is easy to challenge,
   since other tools make video too. Try: "Film crews rehearse the hard scenes. Now
   you can."
4. **Answer "how does it know us?"** Both people opt in and type their own answers.
   No scraping. It is simpler to build and less creepy.
5. **Expect "isn't this a social-skills app?"** Many exist (Sociabl, Social Anchor,
   Chattr), mostly chat or voice practice for one person in the listings we saw. Our
   difference is a shared, directed scene that ends in a real action.
6. **Don't claim it treats anxiety.** Say it lets you rehearse.

## Three takes

| Take | What happens | Ends with |
|---|---|---|
| 1. The one you fear | Awkward silence, spilled drink, played for comedy | "You survived. Ask what they're building." |
| 2. The weird one | The odd scenario each person typed in | A two-person challenge from their answers |
| 3. The one you hope for | They find the thing they share | A specific opening line |

## Sponsor fit

| Sponsor | What it does | How we use it | Fit |
|---|---|---|---|
| Kino | Video editor shared by people and agents; Claude Code connects by MCP | Cut the takes and the real footage into one film | Strong |
| Pangram | Detects AI in text, images and video | Check each person's answers are their own words; if not, ask again | Strong if it's a real gate |
| Paper | HTML/CSS design canvas with agent access and shaders | Intake screen, title cards, one visual look for all takes | Good |
| Capy | Cloud coding agents that open GitHub pull requests | Build the intake page and Pangram call as real PRs | Fair; needs visible use |

Why the Pangram gate matters: "We can't rehearse you from someone else's words."
Pangram flags AI authorship, not quality, and can be wrong, so ask people to try
again rather than accusing them. Test it early with answers of the length we expect.

Best targets: Kino first, then Pangram. Use Paper and Capy where they help.
We haven't confirmed whether one team can win more than one prize.

## Setup facts (from the sponsors' docs)

- Pangram text: `POST https://text.external-api.pangram.com/task`, header `x-api-key`,
  then poll `GET /task/{task_id}`. Python: `Pangram().predict(text, model="pangram-4")`.
  Keep the key on the server and out of this repo.
- Kino: keep the desktop app open, then
  `claude mcp add kino --transport http http://127.0.0.1:45680/mcp --scope user`.
  The free plan allows 100 MCP calls a week, so claim Pro. Generated media costs extra.
- Paper: install Paper Desktop, then
  `claude plugin marketplace add paper-design/agent-plugins && claude plugin install paper-desktop@paper`.
  Their pages disagree on Windows support for the desktop app. Check that first.
- Capy: credits come from their rep on site. Connect it to this GitHub repo.

## Who does what (proposal)

- **Jermaine** (VFX, CG, games, software): the look, the three takes, Kino edit.
- **Thom** (industrial engineering, code): intake flow, how answers become takes,
  Pangram call, Capy PRs.
- **Both**: shoot the real clip, then pitch.

## Plan to 7:30

| Time | Do |
|---|---|
| 6:05-6:15 | Agree on one concept; sign in to Pangram, Kino, Paper, Capy |
| 6:15-6:45 | Jermaine: style and takes 1 and 3. Thom: intake page and Pangram gate |
| 6:45-7:00 | Take 2 if on time; shoot the real clip on a phone |
| 7:00-7:15 | Cut it in Kino, export, and **freeze** |
| 7:15-7:30 | Rehearse the 3 minutes twice; keep the video saved locally |

If time gets short, drop take 2 first, then live generation, then Capy extras. Keep
the real footage. Pre-render the takes, and say so if asked.

## 3-minute pitch

1. 0:00-0:25: "Who here walked in tonight not knowing anyone?"
2. 0:25-0:50: type an answer live; Pangram checks it.
3. 0:50-1:50: play the takes, then the real footage.
4. 1:50-2:40: three choices and why: own words only, no real faces, every take ends
   in an action.
5. 2:40-3:00: where each sponsor tool was used, then the one-liner.

## Decide now

- Do we both agree on Dress Rehearsal?
- Which visual style can be finished in 30 minutes?
- What does each of us actually worry about at events? Those are the takes.

## Sources

[Kino](https://kino.ai/llms.txt), [Kino MCP](https://kino.ai/docs/mcp),
[Pangram text](https://docs.pangram.com/api-reference/ai-detection),
[Pangram video](https://docs.pangram.com/api-reference/video-detection),
[critique of Pangram](https://www.lesswrong.com/posts/qEjSaKxxLrpeHfiZG/we-underestimate-the-weaknesses-of-pangram),
[Paper](https://paper.design/llms.txt), [Paper MCP](https://paper.design/docs/mcp),
[Capy](https://capy.ai/llms.txt),
[Sociabl](https://www.producthunt.com/products/sociabl),
[Social Anchor](https://apps.apple.com/app/id6763898740),
[Chattr](https://apps.apple.com/app/id6768665981)
