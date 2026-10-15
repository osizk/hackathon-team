# Decisions

One entry per decision. Put the newest entry at the top.
First post a short summary in `#decisions` on Slack, then write it here.

## Template

Copy this block for a new decision:

```markdown
## YYYY-MM-DD: <short title>

- **Decision:** what we chose.
- **Why:** the reason.
- **Who decided:** names, or "whole team".
```

## 2026-10-15: Product is CryptoMate

- **Decision:** We build CryptoMate, "เพื่อนคู่ใจที่ดูแลเงิน crypto ของคุณ
  ให้ง่ายและปลอดภัย" - a friend that keeps your crypto money easy and safe.
  A web app is the main product. LINE is connected later if time allows.
- **Why:** Paying with crypto today is hard and risky: few shops accept it,
  fees, price swings, scams. The event is run by U-topia, a PayFi company.
- **Who decided:** head (team lead)

## 2026-10-15: App flow

- **Decision:** The user types what they want. The agent shows a marketplace
  list labelled 1, 2, 3. The user picks one. A detail view compares price and
  shipping across shops. The user presses buy. The agent opens the shop,
  fills the address form and reaches payment. The human only approves.
- **Why:** The agent does the work; the human keeps the one decision that
  moves money.
- **Who decided:** head (team lead)

## 2026-10-15: Our own crypto payment assistant pays, with rules and approve

- **Decision:** Payment goes through our own crypto payment assistant. Before
  every payment it checks rules in plain code, not by the model: monthly
  budget left, cap per payment, shop on the allowed list. Then the owner
  approves in the web app. Only after approval does it pay, with the U-Card
  (U-topia's Visa card, funded from crypto). The agent drives the real
  U-topia app with the team lead's main U-topia account, made for this.
  The U-topia steps are a fixed script that stops before the final confirm.
- **Why:** "Easy and safe" means the model can never move money on its own.
  U-topia has no public API, SDK or sandbox, so the agent must drive the app.
- **Who decided:** head (team lead)

## 2026-10-15: Tech stack

- **Decision:** Agent base loop: Pi v1.2.0
  (`@earendil-works/pi-coding-agent@1.2.0`) on Node. Browser: Playwright as a
  library, attached by CDP to a dedicated Chrome profile the owner logged in
  to by hand. Approve in the web app. On stage, share the real Chrome window
  next to the web app; stream the agent screen into the web app
  (CDP `Page.startScreencast` over a WebSocket) only if time allows. Use shops
  checked to work; Shopee, Lazada and Amazon often block agent browsers.
- **Why:** The agent never sees a password. A fixed script is safer than model
  guesses for the payment steps.
- **Who decided:** head (team lead)

## 2026-10-15: Money story

- **Decision:** A 0.5-1% fee per purchase now. Later, sell the rules engine as
  an API to agent builders. On stage the fee is shown on a slide only; no real
  fee is taken.
- **Why:** A simple fee is easy to explain in a 3-minute demo. The rules
  engine is useful to anyone building shopping agents.
- **Who decided:** head (team lead)

## 2026-10-15: Demo story

- **Decision:** Three beats. First, one real small buy of a physical item
  from a real online shop, paid with the U-Card (candidate: NaRaYa on Shopify,
  coin pouch at 60 THB; runner-up 7-Eleven ALL Online; not final). Second, a
  fake concert-ticket seller is blocked because the shop is not on the allowed
  list. Third, a purchase over the monthly budget is stopped.
- **Why:** A real buy proves the app works. The two blocks prove it is safe.
  Judging is 40% app execution and 40% practical.
- **Who decided:** head (team lead)

## 2026-10-15: Where we talk and where we keep work

- **Decision:** Chat in Slack, code and context in this GitHub repo; the repo
  is public; pull requests open without a local validation pipeline, one
  teammate reviews before merge.
- **Why:** Agents read the repo, not the chat, so the repo must hold all
  context. No tech stack is chosen yet, so there are no automatic checks yet.
- **Who decided:** head (team lead)
