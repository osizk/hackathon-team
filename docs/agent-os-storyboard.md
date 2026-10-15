# Agent OS demo storyboard

Confirmed by the team lead on 2026-10-15. Built in `web/` (issue #17).

The team changed the demo from CryptoMate to an **Agent OS**: you talk to an
agent and it answers with real UI instead of text, on one screen, never
switching apps. When the agent does a task, a full-screen UI for it grows out
of the agent home. When the task is done, it folds back to the agent home.
A demo need not be pretty.

## Rule for every scene

Agent home → grows into a full-screen UI for the task → folds back to agent
home. No other app ever opens.

## Agent home

- A mascot in the middle, with a voice waveform while it talks.
- One subtitle line that fades by itself.
- A hold-to-talk mic button.
- No chat history, no stacked bubbles, no text box.
- The user talks. The agent answers by voice (ElevenLabs Thai TTS) and by
  building UI. User speech goes through speech to text (Thai is "Good" tier,
  10-20% word error).

## Scenes

The use cases are the three of the Muse launch video (YouTube `We8BTITLvb4`).

| # | Time | Scene | User does | Ends with |
|---|---|---|---|---|
| 0 | 0:00-0:02 | Agent home, mascot breathing, mic button | - | - |
| 1 | 0:02-0:10 | User says "this week is hectic"; agent says it will check email; full-screen shopping list builds item by item with prices | speaks | list slides up |
| 2 | 0:10-0:18 | Full-screen payment approval card, total, Deny / Allow | taps Allow (never by voice) | agent says it ordered; back to home |
| 3 | 0:18-0:24 | Agent speaks unasked about training and a 10K race; full-screen training page (sleep score, run plan, race card); race card becomes a sign-up form that fills itself and submits | watches | mascot on treadmill, confetti |
| 4 | 0:24-0:30 | Agent speaks unasked: flight delayed 2 h, change it?; full-screen flight card with timeline and Yes button | says yes or taps Yes | new flight, check; back to home |

## Message per scene

1. The agent builds UI instead of text.
2. Money moves only on the owner's approve.
3. Multi-step work for you.
4. The agent speaks first, and everything ends on one home screen (the OS).

## How to run it on stage

```text
cd web
npm install
npm run voice   # once, with ELEVENLABS_API_KEY in .env: pre-renders every line to MP3
npm start       # http://localhost:5173
```

Scenes 3 and 4 start by themselves: the always-on agent on the server watches
fake feeds and speaks when the page is idle. The demo script fires "sleep
synced" 6 seconds after the payment card closes, and "flight delayed" 6
seconds after the training page closes. Set `AGENT_SCRIPT=off` to stop it.

After scene 4, ask "help me make a todo list" to show a generated page and
the like-and-adjust loop (see [decisions](decisions.md)).

Presenter controls (keys work when not typing):

| Control | What it does |
| --- | --- |
| hold `Space` or the mic | Talk (browser speech recognition, th-TH) |
| `/` | Show the hidden text input, if the mic fails |
| tap the clock 3 times | Hidden feed panel: sleep synced, flight delayed, new email, reset |
| `Shift+T`, `Shift+F`, `Shift+R` | Feed events: sleep synced, flight delayed, reset |
| `s`, `p`, `t`, `f` | Last resort: open shopping, payment, training or flight directly |
| `Esc` or `h` | Fold back to home |

Voice order: cached MP3 in `web/public/voice/`, then live ElevenLabs, then the
browser voice. With `ANTHROPIC_API_KEY` set, Claude picks the scene; without
it, a keyword router does. The app runs with no keys at all.

Out of scope: real payments, outside websites, LINE, CryptoMate code.

## Mockup videos (old chat-style home)

- Parts 1-2: Gemini chat https://gemini.google.com/app/52b0d6e44856ce2d
- Parts 3-4: ElevenLabs Image & Video history (Gemini Omni Flash 1.1)
