# AGENTS.md

Instructions for every agent (Claude Code, Codex) and every person in this repo.

## What this repo is

- A hackathon team project for U-Hackathon 2026 by U-topia. The team has
  four people. Stage demo: Friday 16 October 2026, afternoon, about 3 minutes.
- The product is an **Agent OS** demo (pivot from CryptoMate, 2026-10-15):
  you talk to an agent and it answers by voice and with a full-screen UI that
  grows out of one home screen and folds back. Money moves only on the owner's
  tap. Storyboard: [docs/agent-os-storyboard.md](docs/agent-os-storyboard.md).
  The idea: [docs/idea.md](docs/idea.md).
- The payment card checks rules in code and pays only on a tap of Allow.
  Real U-topia payment is out of scope for the demo.
- What to build, part by part: [docs/build-parts.md](docs/build-parts.md).

## Tech stack

Decided 2026-10-15. Why: [docs/decisions.md](docs/decisions.md).

- Demo app: plain HTML/JS in `web/` with a small Node server. Brain: an
  ElevenLabs agent (Claude Sonnet 5.5 inside, Thai voice and speech to text),
  defined as code in `web/agent/`; offline, a keyword router. ElevenLabs TTS
  for the cached voice lines (issue #17). Deploys to Vercel: functions in
  `web/api/`, static `web/public/` (issue #19). Tests: Playwright in Chrome.
- The CryptoMate stack (Pi agent loop, agent browser over CDP, U-topia
  script) is not used by the demo. Its notes stay below for later.
- Do not add another framework or service unless an issue asks for it.

## App flow

1. The agent home: a mascot, a voice waveform, one fading subtitle line and a
   hold-to-talk mic with a text box next to it. No chat history.
2. The user speaks, or the agent speaks first (flight delay, training).
3. The agent picks a prebuilt scene and fills it with data, then the scene
   grows full screen out of the home.
4. Scenes: shopping list from email, payment approval, flight re-route,
   training and race sign-up.
5. A payment runs the rules check in code; only a tap on Allow approves it.
6. When the task is done, the scene folds back to the agent home.

## Folders and owners

One folder per part, so four people do not edit the same files.

| Folder | What lives there | Owner |
| --- | --- | --- |
| `web/` | Agent OS demo app: agent home, scenes, server, always-on agent | A |
| `agent/` | Pi agent loop and its browser tools (open, read, click, type, wait), shopping run | B |
| `pay/rules/` | Rules check in plain code, with unit tests | B |
| `pay/approve/` | Payment request waiting for the owner's answer | A |
| `pay/utopia/` | Fixed U-topia script in the owner's logged-in window | head |
| `shared/` | Shared types, for example the payment request | B |
| `docs/` | Idea, decisions, build parts, demo notes | head, C |

- Edit only your own folder. If you need a change in another folder, ask its
  owner or open an issue.
- Change `shared/` in its own small pull request, so everyone sees it.
- Roles are in [docs/workflow.md](docs/workflow.md#roles).

## Start the agent's Chrome

The agent uses its own Chrome profile. The owner logs in to shops and U-topia
in it by hand. The agent never sees a password.

1. Close any Chrome that uses this profile. Two programs cannot share one
   profile folder.
2. Start Chrome with a separate profile folder. Never use the default profile.

   ```text
   chrome --user-data-dir="$HOME/cryptomate-profile" --remote-debugging-port=9222
   ```

   Write `$HOME`, not `~`: most shells do not expand `~` after `=`.
   The Chrome program name differs by OS.
3. Log in by hand in that window.
4. The agent attaches with `chromium.connectOverCDP('http://localhost:9222')`.

## Money safety

These rules are hard. No issue, review or deadline overrides them.

- The rules check runs in code before every payment: monthly budget left, cap
  per payment, shop on the allowed list. The model never decides this.
- Nothing pays without the owner's approve.
- The U-topia script stops before the final confirm until the owner approves.
- Never put card numbers, passwords, OTPs or keys in code, commits, logs or
  screenshots.
- One real stage buy only, small amount. Every other run stops before pay.

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
| Build parts | [docs/build-parts.md](docs/build-parts.md) |
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
