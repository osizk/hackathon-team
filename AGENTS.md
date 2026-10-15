# AGENTS.md

Instructions for every agent (Claude Code, Codex) and every person in this repo.

## What this repo is

- A hackathon team project. The team has four people.
- The product idea is not chosen yet. See [docs/idea.md](docs/idea.md).
- No tech stack is chosen yet. Do not pick one unless an issue asks for it.

## Team rules

- Context lives in this GitHub repo: `AGENTS.md`, `docs/idea.md`,
  `docs/decisions.md`, issues and the board. Chat is for people only.
- If something was agreed in chat, write it in the repo. Agents read the
  repo, not the chat.
- Slack channels: `#all-u-hackathon` for talk, `#decisions` for decision
  summaries, `#build` for asking `@Claude` or `@Codex`, `#demo` for demo
  preparation.
- The repo is public and owned by `phittayanan`.
- Every pull request needs one review by a teammate before merge.
- There is no local validation pipeline yet. Run tests and lint before you
  open a pull request, and paste their output in the pull request.
- Never commit keys or passwords. Keys go in `.env`, which is never committed.

## Where context lives

| What | Where |
| --- | --- |
| The idea | [docs/idea.md](docs/idea.md) |
| Decisions and why | [docs/decisions.md](docs/decisions.md) |
| How the team works | [docs/workflow.md](docs/workflow.md) |
| Tasks | GitHub issues |

Read these before you start. If they disagree with chat, the repo wins.

## How an agent works

1. Work on one issue per branch.
2. Name the branch `<issue-number>-<short-slug>`, for example `12-login-page`.
3. Make small commits with clear messages.
4. Before you open a pull request, run the project's tests and lint.
   Paste the result in the pull request.
5. Use the pull request template. Write `Closes #<n>` for the issue.
6. Never push to `main`. All changes go through a pull request.
7. Open one pull request per session.
8. If the issue is not clear, ask in the issue. Do not guess.
