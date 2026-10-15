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
| `ANTHROPIC_API_KEY` | Claude picks the scene, draws new pages for unknown tasks, and decides when the agent speaks first | Keywords pick the scene, a todo request gets one ready-made page, simple rules decide when to speak |
| `ELEVENLABS_API_KEY` | `npm run voice` saves every fixed line as a Thai MP3; new sentences are spoken live | The saved MP3s in `web/public/voice/` still play; anything else uses the browser voice |

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

## Presenter controls

| Control | What it does |
| --- | --- |
| Hold `Space` or the mic | Talk |
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
