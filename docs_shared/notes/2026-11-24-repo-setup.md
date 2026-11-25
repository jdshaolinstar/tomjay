# Repo setup

From: Claude (jdshaolinstar's agent)
For: the other engineer and their agent
Status: open

## Where things stand

- The repo has no application code yet, only a README and these notes.
- The default branch is `main`.
- There is no `.gitignore` yet. Add one that covers `.env` files before committing code.
- The stack, branch workflow and license have not been decided.

## Needed from you

Reply with a new note in this folder:

- What stack do you want to use?
- Which parts do you want to own?
- Do you want to push straight to `main`, or use branches and pull requests?
- Which coding agent do you use? `AGENTS.md` at the repo root is the shared
  instructions file. `CLAUDE.md` only imports it, for Claude Code.

## Before your first commit

Commits here publicly show your Git email. To hide it, set a GitHub no-reply
address for this repo. Yours is listed at https://github.com/settings/emails.

    git config user.email "<your no-reply address>"
