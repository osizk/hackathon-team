# Build parts

The Agent OS demo, part by part. Parts 1 to 7 are done in
[pull request #18](https://github.com/phittayanan/hackathon-team/pull/18)
(issue #17). The list after them is work a teammate can pick up. Copy one
into a new GitHub issue with the
[Task template](../.github/ISSUE_TEMPLATE/task.md).

The CryptoMate build parts were dropped on 2026-10-15. They are in the git
history of this file.

Folders and owners: [AGENTS.md](../AGENTS.md#folders-and-owners).
Hard rules for every part: [Money safety](../AGENTS.md#money-safety).
How to run and test: [README.md](../README.md).

## Done

| # | Part | Where | Status |
| --- | --- | --- | --- |
| 1 | Agent home, scene system, payment card | `web/public/js/app.js`, `scenes/payment.js`, `web/lib/router.js` | Done |
| 2 | Shopping list from email, voice | `scenes/shopping.js`, `web/public/js/voice.js`, `web/scripts/render-voice.js` | Done |
| 3 | Flight delay card | `scenes/flight.js` | Done |
| 4 | Training page, race sign-up, docs | `scenes/training.js`, `docs/agent-os-storyboard.md` | Done |
| 5 | Generated pages, like-and-adjust, keep liked pages | `web/lib/genui.js`, `scenes/generated.js` | Done |
| 6 | Always-on agent | `web/lib/agent-loop.js`, `web/lib/feeds.js`, `web/lib/brain.js`, `web/public/js/agent-link.js` | Done |
| 7 | Repo docs up to date | `README.md`, `docs/` | Done |

### Part 1: Agent home, scene system, payment card

A mascot, voice waveform, one fading subtitle line and a hold-to-talk mic.
Scenes grow out of the home and fold back. The router picks a scene: Claude
with a key, keywords without. The payment card checks the rules in code and
pays only on a tap of Allow.

### Part 2: Shopping list and voice

The shopping list builds item by item from a fake email, then slides up into
the payment card. Every fixed line is saved as an MP3 with ElevenLabs
(`npm run voice`). Voice order: saved MP3, live ElevenLabs, browser voice.

### Part 3: Flight delay card

The agent offers a faster flight. "Yes" or the Yes button books it and the
timeline changes. "No" keeps the old flight.

### Part 4: Training page and race sign-up

Sleep score, run plan, race card. The race card turns into a form that fills
itself and submits, inside our own UI. Then the mascot runs on a treadmill.

### Part 5: Generated pages

When no prebuilt scene fits, Claude returns a page as JSON from a fixed set of
parts: text, stat, progress, checklist, list, card, chart, field, button,
divider. The browser draws it; it never runs model-written HTML or JS. The
agent asks if you like it and proposes changes. Your answer changes the page
in place. If you like it, the agent offers to keep it; a kept page opens at
once next time, without a new generation. Without a key, "todo list" gets one
ready-made page.

### Part 6: Always-on agent

A loop on the server watches fake feeds (email, calendar, sleep and runs,
flight) every few seconds. It decides by itself when to speak and which scene
to open, and pushes it to the page over SSE. It never speaks over an open
scene or while anyone talks. A script fires the feed events in a fixed order;
the presenter can fire one from a hidden panel.

### Part 7: Docs

README, idea, build parts, decisions and the storyboard describe Agent OS.

## Pick up next

| Part | Why | Size |
| --- | --- | --- |
| Test the Claude paths with a real key | Scene choice, generated pages and speak-or-wait are only tested with fake answers | 1 h |
| Pick a better Thai voice | The account has no Thai-only voice; try voices, then `npm run voice -- --force` | 0.5 h |
| HTTPS for the phone | The mic needs HTTPS on a phone (for example a tunnel) | 0.5 h |
| Stage rehearsal and backup video | Time the 3 minutes; record a backup in case the room Wi-Fi fails | 1.5 h |
| Thai keywords | Speech to text makes mistakes in Thai; add the words people really say | 1 h |
| More generated page parts | For example a date picker or an image card, in `web/lib/genui.js` and `scenes/generated.js` | 1-2 h |
| Real U-topia payment behind Allow | Only after the demo; follow [Money safety](../AGENTS.md#money-safety) | 3 h |
