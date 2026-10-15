# hackathon-team

**Agent OS**: talk to an agent, and it answers with real UI instead of text.
One home screen, no app switching. When the agent does a task, a full-screen
UI for it grows out of the home. When the task is done, it folds back.

U-Hackathon 2026 by U-topia. Stage demo: Friday 16 October 2026, about
3 minutes. Read [AGENTS.md](AGENTS.md) and [docs/workflow.md](docs/workflow.md)
before you work here.

## Run the demo

You need Node 20 or newer and Google Chrome.

```text
cd web
npm install
npm start          # http://localhost:5173
```

It runs with **no keys**. Keys only make it smarter. Put them in `.env` at
the repo root (copy [.env.example](.env.example)). `.env` is never committed.

| Key | With it | Without it |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` | The brain is a live ElevenLabs agent (Claude Sonnet 5.5, Thai voice and speech to text). It opens scenes, draws new pages and decides when to speak first, only through client tools | Keywords pick the scene, a todo request gets one ready-made page, simple rules decide when to speak first |
| `ELEVENLABS_API_KEY` with Image & Video (Pro plan) | Generated pages can show pictures: a grey frame first, then the picture fades in. Cached by prompt, at most 3 new pictures per page | The frame stays with a small picture icon |
| `ELEVENLABS_API_KEY` alone | `npm run voice` saves every fixed line as a Thai MP3; new sentences are spoken live | The saved MP3s in `web/public/voice/` still play; anything else uses the browser voice |

Create or update the live agent from code (needs the key's Agents permission,
scope `convai_write`). It writes `ELEVENLABS_AGENT_ID` to `.env`:

```text
cd web
npm run agent:sync -- --dry-run   # show what would be sent
npm run agent:sync
```

Manual smoke test of the live agent (Playwright covers only the no-key path
and a stubbed agent): run `npm start`, open http://localhost:5173 in Chrome,
hold the mic and say "สัปดาห์นี้ยุ่งมาก". The page should show
`data-brain="agent"` on `<body>`, the agent should answer in Thai, and the
shopping list should open. Then say "จ่ายเลย" on the payment card: it must not
pay.

The browser's speech recognition (Thai) needs Chrome on `localhost` or HTTPS.

## Demo flow

Storyboard: [docs/agent-os-storyboard.md](docs/agent-os-storyboard.md).

1. Hold the mic and say "this week is hectic". The agent reads a fake email
   and builds a shopping list item by item.
2. The list slides up into a payment card. Only a tap on **Allow** pays.
   Saying "allow" does not.
3. The agent speaks first: good sleep, and a 10K race. The race form fills
   itself and submits. Confetti.
4. The agent speaks first: the flight is delayed 2 hours. Say "yes" and it
   books a faster flight.
5. Ask for something it has no scene for, like "help me make a todo list".
   It draws a page, asks if you like it, and changes it when you answer.
   Say you like it, and it offers to keep the page for next time.

Steps 3 and 4 come from the always-on agent on the server. It watches fake
feeds and speaks when the page is idle. A script fires the feed events after
the payment and training scenes close, so the order stays the same.

## Run log: find what to fix

Every server run writes one file, `web/logs/run-<time>.jsonl`. It is local
only and never committed, because it holds what testers said. Each line has
a millisecond time and records one of these:
- what the user said
- what the agent replied
- every tool call
- every voice start and end, with its source (live agent, saved MP3, TTS or
  browser)
- scenes opening and closing
- feed events, and the agent's choice to speak or wait
- errors

Check the latest run, or a named one:

```text
cd web
npm run log:check
npm run log:check -- logs/run-2026-10-15T17-41-34-352Z.jsonl
```

It reports how fast the agent replies, and flags these problems:
- two voices at once
- a reply slower than 3 s
- a scene that opened before the agent said anything
- a feed event pushed while something was speaking
- the mic hearing the agent's own words (self-hearing)
- errors

To test the live agent end to end in Chrome, run
`npm run smoke:live -- --wav my-thai-request.wav`. The WAV is played as the
microphone.

## Presenter controls

| Control | What it does |
| --- | --- |
| First tap | The mascot greets once ("แตะหน้าจอเพื่อเริ่ม" shows until then) |
| Hold `Space` or the mic | Talk. Pressing it first silences the agent, so the mic never hears it |
| `/` | Hidden text box, if the mic fails |
| Tap the clock 3 times | Hidden feed panel: sleep synced, flight delayed, new email, reset |
| `Shift+T`, `Shift+F`, `Shift+R` | Feed events: sleep synced, flight delayed, reset |
| `s`, `p`, `t`, `f` | Last resort: open shopping, payment, training or flight directly |
| `Esc` | Fold back to home |

## Test

```text
cd web
npm run lint
npm test           # unit tests + Playwright in Chrome, with no API keys
```

Out of scope for the demo: real payments, outside websites, LINE.
