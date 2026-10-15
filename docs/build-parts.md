# Build parts

One issue body per build part. Copy a part into a new GitHub issue with the
[Task template](../.github/ISSUE_TEMPLATE/task.md). After you create the
issues, replace "part N" in each "Needs" line with the real issue number.

Folders and owners: [AGENTS.md](../AGENTS.md#folders-and-owners).
Hard rules for every part: [Money safety](../AGENTS.md#money-safety).
Hours are for one person directing a coding agent.

Critical path: parts 1, 2, 4, 5, 12, 11, about 12 hours.
Cut first if late: part 9 (LINE approve), then part 8 (live screen).
Never cut: part 6 (rules check), part 7 (approve step), the backup video in
part 11.

The estimate has no part 10. The numbers below keep the estimate's numbers.

| # | Part | Hours | Role |
| --- | --- | --- | --- |
| 1 | Skeleton | 1.5 | B |
| 2 | Agent browser | 2 | B |
| 3 | Marketplace list and price compare | 1.5 | A |
| 4 | Shopping run | 2 | B |
| 5 | U-topia driver | 3 | head |
| 6 | Rules check | 1 | C |
| 7 | Owner approve step | 1.5 | A |
| 8 | Live agent screen, if time | 2 | A |
| 9 | LINE approve, if time | 1.5 | C |
| 11 | Stage prep | 2 | C, head |
| 12 | Integration | 1.5 | head |

## Module contracts

The parts hand data to each other. Agree these hand-offs first (part 1, first
30 minutes) and write them in `shared/`. Then each person builds against mock
data and nobody waits for another part.

```text
agent --ItemList--> web
agent --PaymentRequest--> pay/rules --RulesResult--> pay/approve --> web
web --OwnerAnswer (approve or reject)--> pay/utopia
```

| Type | From | To | Fields |
| --- | --- | --- | --- |
| ItemList | `agent/` | `web/` | Items numbered 1, 2, 3. Each item: number, name, and a price and shipping for each shop that sells it. |
| PaymentRequest | `agent/` | `pay/rules/` | Shop, item, total (amount and currency). |
| RulesResult | `pay/rules/` | `pay/approve/`, then `web/` | The payment request it checked. For each rule (monthly budget left, cap per payment, allowed shop): pass or fail, and a reason the web app can show. |
| OwnerAnswer | `web/` | `pay/utopia/` | Which payment request it answers, and approve or reject. |

Change a contract only in its own small pull request on `shared/`, and tell
every owner who uses it.

## Part 1: Skeleton

**Goal:** Every teammate can start the web app and the agent from one repo.

**Done when:**

- [ ] The module contracts above (ItemList, PaymentRequest, RulesResult,
      OwnerAnswer) are agreed and committed in `shared/`, with sample data for
      each. Do this first, in the first 30 minutes.
- [ ] The Pi starter (`@earendil-works/pi-coding-agent@1.2.0`) runs in `agent/`.
- [ ] A web app shell runs in `web/` and shows an empty page.
- [ ] The folders `web/`, `agent/`, `pay/`, `shared/` exist, as in AGENTS.md.
- [ ] A short note says how to start each one.
- [ ] `.env` is in `.gitignore`.

**Needs:** nothing

**Role:** B

**Folder:** all four folders (first commit only); `shared/` for the contracts

## Part 2: Agent browser

**Goal:** The agent can drive its own Chrome profile with simple tools.

**Done when:**

- [ ] The agent attaches with `connectOverCDP('http://localhost:9222')` to the
      Chrome started as in AGENTS.md.
- [ ] Tools exist for open, read, click, type and wait.
- [ ] The agent can open a page and read its title in a test run.
- [ ] No password or cookie is printed in logs.

**Needs:** #4

**Role:** B

**Folder:** `agent/`

## Part 3: Marketplace list and price compare

**Goal:** The user sees found items as a list labelled 1, 2, 3, and can open
one to compare price and shipping across shops.

**Done when:**

- [ ] A chat box sends what the user wants to the agent.
- [ ] The list shows each item with its number, name, price and shop.
- [ ] Picking an item opens a detail view that compares price and shipping.
- [ ] A buy button sends the chosen item to the agent.
- [ ] The screens work with sample data before the agent is ready.

**Needs:** #4

**Role:** A

**Folder:** `web/`

## Part 4: Shopping run

**Goal:** The agent buys up to the payment step and turns the shop total into
a payment request.

**Done when:**

- [ ] The agent finds the item in a shop checked to work.
- [ ] It adds the item to the cart and fills the checkout address form.
- [ ] It stops at the payment step.
- [ ] It reads the total and builds a payment request (the PaymentRequest
      contract in `shared/`): shop, item, total.
- [ ] It sends the payment request to the rules check. It never pays itself.

**Needs:** #5

**Role:** B

**Folder:** `agent/`

## Part 5: U-topia driver

**Goal:** A fixed script pays with the U-Card in the owner's logged-in U-topia
window, and only after approve.

**Done when:**

- [ ] The steps are a fixed Playwright script, not model guesses.
- [ ] The script stops before the final confirm and waits for approve.
- [ ] Without approve it never presses confirm.
- [ ] No card number, password or OTP appears in code, logs or screenshots.
- [ ] The send screens, OTP and network are written down in the issue once seen.

**Needs:** #5, #10

**Role:** head

**Folder:** `pay/utopia/`

## Part 6: Rules check

**Goal:** Plain code decides if a payment request may go to approve.

**Done when:**

- [ ] It checks the monthly budget left, the cap per payment and the allowed
      shop list.
- [ ] It returns a RulesResult (contract in `shared/`): pass or fail per rule,
      with a reason the web app can show.
- [ ] Unit tests cover: allowed buy, shop not on the list, over the monthly
      budget, over the cap per payment.
- [ ] The model has no way to skip it.

**Needs:** #4

**Role:** C

**Folder:** `pay/rules/`

## Part 7: Owner approve step

**Goal:** The owner sees each allowed payment request in the web app and
approves or rejects it.

**Done when:**

- [ ] The web app shows shop, item, amount and the rules result.
- [ ] Approve and reject buttons send the answer to `pay/approve/`.
- [ ] A blocked request shows its reason and has no approve button.
- [ ] Nothing pays while the request waits.

**Needs:** #6, #9

**Role:** A

**Folder:** `web/`, `pay/approve/`

## Part 8: Live agent screen, if time

**Goal:** The web app shows the agent's browser live.

**Done when:**

- [ ] CDP `Page.startScreencast` frames reach the web app over a WebSocket.
- [ ] The screen shows next to the chat without slowing the agent.
- [ ] Screens with card numbers or OTPs are not streamed.

**Needs:** #5, #6

**Role:** A

**Folder:** `web/`, `agent/` (screencast only, agree with B)

## Part 9: LINE approve, if time

**Goal:** The owner can approve a payment request from LINE.

**Done when:**

- [ ] A LINE message shows shop, item and amount with approve and reject.
- [ ] The answer reaches `pay/approve/` the same way as the web app's answer.
- [ ] LINE keys live in `.env` only.

**Needs:** #10

**Role:** C

**Folder:** `pay/approve/`

## Part 11: Stage prep

**Goal:** The 3-minute demo runs the same way every time, with a backup.

**Done when:**

- [ ] Three full rehearsals done: real buy, fake ticket seller blocked, over
      budget stopped.
- [ ] A backup video of the full demo is recorded.
- [ ] A phone hotspot is tested as backup internet.
- [ ] A reset script puts the budget, allowed list and cart back to the start.
- [ ] Only one real buy happens on stage, small amount.
- [ ] The fee slide is ready.

**Needs:** #6, #7, #8, #9, #10, #14

**Role:** C, head

**Folder:** `docs/`; the reset script's folder is decided in the issue

## Part 12: Integration

**Goal:** Every part is wired together and the full flow runs end to end.

**Done when:**

- [ ] The happy path runs end to end on mock data: list, pick, buy, rules
      check, approve, U-topia script, with no real payment.
- [ ] Every hand-off uses the contracts in `shared/`, not private formats.
- [ ] A blocked request and a rejected request both stop before pay.
- [ ] Checkpoint 1 below is passed and any gap is written in the issue.

**Needs:** #6, #7, #8, #9, #10

**Role:** head

**Folder:** none of its own; wiring fixes go to the owner of the folder, or a
small pull request in the folder with its owner's review

## Checkpoints

1. **Happy path on mock data.** The whole flow runs end to end, with no real
   payment: the agent makes the item list, the web app shows it, the buy goes
   through the rules check and the approve step, and the U-topia script stops
   at the final confirm. Target: when part 12 is done.
2. **Real run, the night before the demo.** One run with the real shop and the
   real U-topia app, small amount. Then record the backup video. Do this
   before the final rehearsals in part 11 end.
